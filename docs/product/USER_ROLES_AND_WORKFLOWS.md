# BIZORA — USER ROLES, PERMISSIONS & WORKFLOW SPECIFICATION

**Document Reference:** BIZORA-ROLES-V1.1  
**Status:** DRAFT FOR STAKEHOLDER REVIEW (REVISED)  
**Lifecycle Phase:** Phase 02 Requirements Engineering  
**Classification:** Operational & User Experience Specification  
**Date:** 2026-11-21  

---

## 1. USER ROLES & ACCESS CONTROL (RBAC)

Bizora enforces role-based access control (RBAC) at the tenant level. A user's privileges are strictly scoped to the active `business_id` they are operating within.

### 1.1 Role Definitions
1. **Store Owner (`owner`):**
   - Typically the business founder, managing director, or sole proprietor.
   - Holds ultimate authority over store configuration, team membership, subscription settings, and financial approvals.
   - **Exclusive Privilege:** Only the `owner` role can approve AI-generated recovery campaigns and authorize customer communication handoffs.
2. **Staff Member (`member`):**
   - Store manager, sales clerk, or administrative assistant.
   - Handles operational tasks: uploading sales spreadsheets, updating customer contact information, creating customer quotations, and viewing dashboard performance.
   - **Restriction:** Barred from approving campaigns, modifying subscription tiers, or viewing audit logs.

### 1.2 Permissions Matrix

| Capability / Resource Action | Store Owner (`owner`) | Staff Member (`member`) | Enforcement Mechanism |
| :--- | :---: | :---: | :--- |
| **Manage Store Profile & Currency** | **Yes** | No | Server authorization check for `owner` role |
| **Invite & Revoke Team Members** | **Yes** | No | Server authorization check for `owner` role |
| **View Financial Dashboard & KPIs** | **Yes** | **Yes** | Read access permitted to all tenant members |
| **Upload CSV / Excel Spreadsheets** | **Yes** | **Yes** | Active tenant membership check |
| **Execute Import Batch Rollback** | **Yes** | No | Server authorization check for `owner` role |
| **Create & Update Quotations** | **Yes** | **Yes** | Active tenant membership check |
| **Record Quotation Sent Date & Channel** | **Yes** | **Yes** | Active tenant membership check |
| **Trigger AI Recovery Analysis** | **Yes** | **Yes** | Active tenant membership with quota check |
| **Edit AI Campaign Draft Content** | **Yes** | **Yes** | Writes new draft version (`status = 'draft'`) |
| **Approve Recovery Campaign Draft** | **Yes** | **NO** | Mandatory Gatekeeper: `owner` role required |
| **Initiate WhatsApp / Email Handoff** | **Yes** | No | Server check requiring `draft.status === 'approved'` |
| **View Audit Event Logs** | **Yes** | No | Server authorization check for `owner` role |
| **Delete Store Account & Purge Data** | **Yes** | No | Server authorization check for `owner` role |

---

## 2. DETAILED USER WORKFLOWS

```
+----------------------------------------------------------------------------------------------------+
|                                    CORE USER WORKFLOW ROADMAP                                      |
+----------------------------------------------------------------------------------------------------+
|  [WF-1: Tenant Registration]  --->  [WF-2: Spreadsheet Ingestion]  --->  [WF-3: Analytics Review]  |
|                                                                                       |            |
|  [WF-6: WhatsApp/Email Handoff] <-- [WF-5: AI Draft Review & Approval] <--------------+            |
|                ^                                                                                   |
|                +------------------- [WF-4: Quotation Lifecycle Management] ------------------------+
+----------------------------------------------------------------------------------------------------+
```

---

### Workflow 1: Store Onboarding & Tenant Setup (`[WF-1]`)
* **Primary Persona:** Store Owner
* **Preconditions:** User has a valid email address and store details.
* **Steps:**
  1. User navigates to `/register`, enters Full Name, Store Name, Work Email, and Password.
  2. System provisions a `businesses` tenant record with a unique URL slug (e.g., `/store-name`).
  3. System prompts user to select Base Currency (ISO 4217, e.g., `USD`, `INR`, `GBP`) and Timezone (IANA format).
  4. System locks the base currency for the tenant root and assigns the user the `owner` role.
  5. System redirects user to the onboarding dashboard with an empty-state prompt: *"Import your sales spreadsheet to unlock revenue intelligence"*.

---

### Workflow 2: Spreadsheet Data Ingestion & Reconciliation (`[WF-2]`)
* **Primary Persona:** Staff Member or Store Owner
* **Preconditions:** User has exported a sales or order report from their POS/billing system as a `.csv` or `.xlsx` file.
* **Steps:**
  1. User navigates to `/dashboard/import` and drags their spreadsheet file into the upload dropzone.
  2. System parses the first 5 rows and displays an interactive **Column Mapping Modal**.
  3. System auto-detects standard columns (`Date`, `Customer Phone`, `Customer Name`, `Invoice Total`); user verifies or manually adjusts mappings.
  4. User clicks **"Preview Import"**. System streams the file, normalizes phone numbers to E.164, parses dates to UTC, and runs multi-tiered duplicate detection:
     - Level 1: Deterministic match on External Transaction/Invoice ID.
     - Level 2: Ambiguous match on same customer, date, and amount without an external ID.
  5. System presents an **Import Reconciliation Summary**:
     - *Total Rows in File:* `1,450`
     - *New Transactions:* `1,380`
     - *Deterministic Duplicates:* `50` (Action: Skip [Default] or Update)
     - *Ambiguous Matches Requiring Review:* `20` (User manually verifies distinct transactions)
     - *Format Errors:* `0`
  6. User clicks **"Confirm & Commit Import"**. System executes an atomic database transaction, commits records with an `import_batch_id`, pre-computes daily revenue snapshots, and redirects user to the updated dashboard.

---

### Workflow 3: Customer Dormancy Detection & Revenue Risk Review (`[WF-3]`)
* **Primary Persona:** Store Owner
* **Preconditions:** Store has imported sales transactions.
* **Steps:**
  1. System daily background task calculates customer purchase frequency ($\mu$), standard deviation ($\sigma$), days inactive ($t$), and Dormancy Score ($D \in [0, 100]$) with documented caveats.
  2. Customers with $< 3$ transactions are classified as *"Insufficient History"* and excluded from automated scoring.
  3. Owner opens `/dashboard/recovery` and views the **Revenue Risk Radar**:
     - High-Value Dormant Buyers ($D \ge 75$): Estimated opportunity loss clearly labeled as an analytical projection.
     - Lapsing Regulars ($50 \le D < 75$): Customers showing early interval lengthening.
  4. Owner clicks on a customer profile to view the explanatory context: *"Last purchased 45 days ago; personal average cycle is 14 days; 3.2x cycle elapsed"*.

---

### Workflow 4: Quotation Lifecycle & Expiry Tracking (`[WF-4]`)
* **Primary Persona:** Staff Member or Store Owner
* **Preconditions:** Store issues custom price quotations for large orders or trade clients.
* **Steps:**
  1. User navigates to `/dashboard/quotes` and clicks **"New Quote"**.
  2. User selects an existing customer (or enters a new one), enters quote line items, total quote amount, and sets an explicit `Valid Until Date`.
  3. Because V1 does not dispatch quotations directly, the user transmits the quote via personal WhatsApp/email and clicks **"Record as Sent"**, logging `sent_at` and `sent_channel`.
  4. **Status Progression:**
     - If customer confirms: User clicks **"Accept Quote"**. System transitions quote to `accepted` and generates a linked retail `order` record in the sales ledger.
     - If `Valid Until Date` passes: System dynamically highlights the quote as expired and allows user to mark it as `expired` or extend the validity date.

---

### Workflow 5: AI Campaign Draft Generation, Review & Human Approval (`[WF-5]`)
* **Primary Persona:** Store Owner
* **Preconditions:** Store has detected revenue risks (dormant buyers or expiring quotes) and has active monthly AI quota.
* **Steps:**
  1. Owner clicks **"Prepare Recovery Campaign"** on the Dormant Buyers risk card.
  2. System passes verified, anonymized cohort metrics (e.g., average interval: 21 days; current inactivity: 65 days; historical AOV: $120) to the evaluated AI service.
  3. AI synthesizes the data and drafts tailored win-back messaging into a strict schema.
  4. System creates a record in `campaign_draft_versions` with `status: 'pending_approval'`.
  5. The **Approval Drawer** opens in the UI:
     - The draft is clearly badged: *"AI-Generated Draft — Review Required"*.
     - Owner reviews the message body and suggested incentive.
     - Owner edits the text directly in the markdown editor to match their personal shop voice.
  6. Owner clicks **"Approve Campaign"**.
  7. System validates user role (`owner`), transitions draft status to `approved`, and records an approval entry tied to that exact draft version ID.

---

### Workflow 6: Owner-Controlled WhatsApp & Email Handoff (`[WF-6]`)
* **Primary Persona:** Store Owner
* **Preconditions:** Campaign draft is in `approved` status.
* **Steps:**
  1. The approval screen transitions to the **Dispatch Handoff Center**, listing targeted customers.
  2. For a customer selected for WhatsApp contact:
     - Owner clicks **"Open WhatsApp"**.
     - System constructs the validated protocol URL:  
       `https://wa.me/15550192834?text=Hi%20John%2C%20we%20noticed%20it%27s%20been%20a%20while...`
     - System opens WhatsApp Web in a new tab (or opens the native WhatsApp app on mobile/desktop).
  3. For a customer selected for Email contact:
     - Owner clicks **"Open Email Client"**.
     - System constructs the `mailto:` URL and opens the owner's default desktop/mobile email client.
  4. Concurrently, the system writes an immutable record to `communication_handoffs`:  
     `{ business_id, draft_id, customer_id, user_id, channel: 'whatsapp', handoff_initiated_at: NOW() }`.
  5. The UI updates the customer row status to display: **"Handoff Initiated"** with a green badge and timestamp.  
     *(The system explicitly avoids claiming the message was sent or delivered).*
