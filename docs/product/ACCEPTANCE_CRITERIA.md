# BIZORA — TESTABLE ACCEPTANCE CRITERIA SPECIFICATION

**Document Reference:** BIZORA-AC-V1.1  
**Status:** DRAFT FOR STAKEHOLDER REVIEW (REVISED)  
**Lifecycle Phase:** Phase 02 Requirements Engineering  
**Classification:** Quality Assurance & Testing Contract  
**Date:** 2026-11-21  

---

## 1. PURPOSE & TESTABILITY STANDARD

This document establishes the authoritative, binary (Pass/Fail) acceptance criteria for Bizora Version 1.0 (V1). Every functional requirement must have verifiable preconditions, execution steps, expected outcomes, and edge-case handling.

---

## 2. FUNCTIONAL ACCEPTANCE CRITERIA MATRIX

### 2.1 Identity, Tenancy & Multi-User Governance

#### `[REQ-AC-001]` Store Registration & Unique Tenant Root
* **Precondition:** User is unauthenticated on `/register`.
* **Execution Steps:**
  1. Submit form with Name: `Alice Store`, Email: `alice@hardware.com`, Store Name: `Alice Hardware`, Currency: `USD`, Timezone: `America/New_York`.
* **Expected Result:**
  - Creates `businesses` record with `slug: 'alice-hardware'`.
  - Creates membership linking user to business with `role: 'owner'`.
  - Session cookie is issued with signed token containing `businessId: '<uuid>'` and `role: 'owner'`.
* **Edge Case:** Submitting an existing slug appends a random 4-digit numeric suffix (e.g., `alice-hardware-4821`).

#### `[REQ-AC-002]` Cross-Tenant Data Access Barrier
* **Precondition:** User A is authenticated in Tenant A (`id: aaaaaaaa-1111-...`); Customer B exists only in Tenant B (`id: bbbbbbbb-2222-...`).
* **Execution Steps:**
  1. User A sends an authenticated GET request to `/api/customers/bbbbbbbb-2222-...`.
* **Expected Result:**
  - Server executes database query with `WHERE id = 'bbbbbbbb-2222-...' AND business_id = 'aaaaaaaa-1111-...'`.
  - Query returns `null`.
  - Server responds with HTTP `404 Not Found` (preventing ID enumeration).

#### `[REQ-AC-003]` Real-Time Membership Revocation
* **Precondition:** User B has active `member` session in Tenant A with a valid 15-minute token.
* **Execution Steps:**
  1. Owner A revokes User B's membership from the team settings dashboard.
  2. Server updates membership status (`is_active = false`) and marks the revocation.
  3. User B attempts a Server Action mutation 2 seconds later.
* **Expected Result:**
  - Server authorization middleware checks active membership status.
  - Revocation is recognized -> Immediately terminates request with HTTP `401 Unauthorized` and clears session cookie.

---

### 2.2 Spreadsheet Data Ingestion & Deduplication

#### `[REQ-AC-004]` Spreadsheet File Upload & Format Validation
* **Precondition:** User is on `/dashboard/import`.
* **Execution Steps:**
  1. Attempt upload of a 30 MB `.csv` file.
  2. Attempt upload of an `.exe` file renamed to `.csv`.
  3. Upload a valid 5 MB `.xlsx` file containing 5,000 rows.
* **Expected Result:**
  - Scenario 1 fails with client & server error: *"File size exceeds 25 MB limit"*.
  - Scenario 2 fails magic-byte MIME validation: *"Invalid file format. Upload valid CSV or Excel workbook"*.
  - Scenario 3 succeeds, parses sheet names, and displays column mapping preview modal within $< 2\text{ seconds}$.

#### `[REQ-AC-005]` Multi-Tier Deduplication (External ID Match vs Ambiguous Match)
* **Precondition:** Store has existing order: `external_id: 'INV-1001'`, `amount: $50.00` (5000 cents), `date: '2026-11-10'`. Store also has a transaction without an external ID: `customer: John Doe`, `amount: $20.00` (2000 cents), `date: '2026-11-12'`.
* **Execution Steps:**
  1. User uploads CSV containing:
     - Row 1: `external_id: 'INV-1001'`, `amount: $50.00` (Deterministic duplicate).
     - Row 2: No external ID, `customer: John Doe`, `amount: $20.00`, `date: '2026-11-12'` (Potential duplicate or legitimate separate purchase).
  2. Ingestion preview displays reconciliation summary.
* **Expected Result:**
  - Row 1 is flagged as **"Deterministic Duplicate (INV-1001)"** with default action `Skip`.
  - Row 2 is flagged as **"Ambiguous Match / Review Required"**, displaying existing transaction details alongside incoming row details.
  - User can select "Confirm as Separate Legitimate Purchase" or "Mark as Duplicate".
  - If marked separate, Row 2 is committed; if marked duplicate, Row 2 is skipped.

#### `[REQ-AC-006]` Atomic Batch Commit & 24-Hour Rollback Boundaries
* **Precondition:** Store imports 500 orders assigned `import_batch_id: 'batch-99'`. Store Gross Sales increments from $10,000 to $25,000.
* **Execution Steps:**
  1. Owner navigates to import history within 2 hours and clicks **"Rollback Batch #99"**.
  2. Scenario A: No quotations or downstream payments depend on these orders.
  3. Scenario B: An order from this batch was subsequently converted from a quotation.
* **Expected Result:**
  - Scenario A: System executes atomic delete of batch orders, re-aggregates daily summaries, and store sales return to $10,000.
  - Scenario B: System aborts rollback with error: *"Cannot rollback batch: 1 order is linked to active quotation QT-102. Reconcile quotation first."*

---

### 2.3 Quotation Pipeline & Expiry Tracking

#### `[REQ-AC-007]` Quotation Creation & Sent Date Recording
* **Precondition:** Store creates quote for Customer John (`phone: '+15550191111'`).
* **Execution Steps:**
  1. Fill form: Quote Number: `QT-501`, Valid Until Date: `2026-12-05`.
  2. Add Line 1: `Cement Bags`, Quantity: `10`, Unit Price: `$8.50`.
  3. Submit quotation, transmit via personal WhatsApp, and click **"Record as Sent"**.
* **Expected Result:**
  - Quotation row created: `total_amount_minor_units = 8500` ($85.00).
  - Status is set to `sent` with `sent_at = NOW()` and `sent_channel = 'whatsapp'`.

#### `[REQ-AC-008]` Quotation Expiry State Rule
* **Precondition:** Quotation `QT-501` has `status: 'sent'` and user-defined `valid_until_date: '2026-11-20'`. Current date is `2026-11-21`.
* **Execution Steps:**
  1. User views quotation list or daily expiration evaluation executes.
* **Expected Result:**
  - Query dynamically flags `QT-501` as expired (`is_expired = true`).
  - System prompts user to transition status to `expired` or extend the validity date.
  - Once marked `expired`, quote increments the dashboard metric: `Expired Quotation Value` by $85.00.

---

### 2.4 Financial Determinism & Minor-Unit Math

#### `[REQ-AC-009]` Currency-Aware Minor-Unit Arithmetic & Financial Distinctions
* **Precondition:** Database stores transactions in multiple currency scenarios (tested per-store):
  - Store A (USD, 2 decimals): Line 1: $10.15 (`1015`), Line 2: $20.25 (`2025`), Discount: $5.00 (`500`).
  - Store B (JPY, 0 decimals): Line 1: ¥1000 (`1000`), Discount: ¥100 (`100`).
  - Store C (KWD, 3 decimals): Line 1: 1.500 KWD (`1500` fils).
* **Execution Steps:**
  1. Trigger financial calculations for Gross Sales and Net Sales.
* **Expected Result:**
  - Store A Gross Sales = $30.40 (`3040`); Net Sales = $25.40 (`2540`).
  - Store B Gross Sales = ¥1000 (`1000`); Net Sales = ¥900 (`900`).
  - Store C Gross Sales = 1.500 KWD (`1500`).
  - Calculations execute using integer arithmetic (`BIGINT`). Zero floating-point drift.
  - Net Sales is distinctly separated from Cash Collected (uncollected orders do not increment cash collected).

#### `[REQ-AC-010]` Customer Dormancy Z-Score Normalization with Explanatory Output
* **Precondition:** Customer Bob has purchase history with mean inter-purchase days $\mu = 14$, standard deviation $\sigma = 4$. Last purchase was 35 days ago ($t = 35$).
* **Execution Steps:**
  1. Execute dormancy scoring algorithm.
* **Expected Result:**
  - Z-Score: $Z = (35 - 14) / 4 = 5.25$.
  - Dormancy Score: $D = \min(100, \max(0, \text{round}(50 + 25 \times 5.25))) = 100$.
  - Categorizes `churn_risk_level = 'critical'`.
  - Generates explanatory context: *"Last purchased 35 days ago; typical interval is 14 days (3.2x cycle elapsed)"*.
  - Estimated opportunity loss is clearly labeled as a **projection with confidence rating**, explicitly *not* a guaranteed recoverable asset.

#### `[REQ-AC-011]` Dormancy Edge-Case Fallbacks (Low History & Zero Variance)
* **Precondition 1:** Customer Alice has only 1 purchase ($N < 3$).
* **Precondition 2:** Customer Charlie has 3 purchases, all exactly 10 days apart ($N = 3$, $\sigma = 0$).
* **Execution Steps:**
  1. Execute dormancy scoring algorithm.
* **Expected Result:**
  - Alice is classified as **"Insufficient History"** and excluded from automated scoring until $N \ge 3$.
  - Charlie is flagged with a **"Low Sample Variance"** caveat, and scoring enforces a baseline $\sigma = 7\text{ days}$ to prevent division by zero.

---

### 2.5 AI Draft Generation, Human Approval & Client Handoff

#### `[REQ-AC-012]` AI Output Parsing & Financial Parameter Isolation
* **Precondition:** System triggers recovery draft generation for 10 dormant customers.
* **Execution Steps:**
  1. Query AI provider service.
* **Expected Result:**
  - AI prompt contains verified summary metrics; zero raw PII or financial calculations.
  - Response is validated against output schema: `{ summary: string, target_cohort: string, suggested_discount: string, drafts: Array<{ channel: 'whatsapp' | 'email', message: string }> }`.
  - Draft is tagged in the UI: *"AI-Generated Draft — Review Required"*.

#### `[REQ-AC-013]` Mandatory Human Approval Gatekeeper Enforcement
* **Precondition:** Campaign draft `CD-101` has `status: 'pending_approval'`.
* **Execution Steps:**
  1. Staff member (`role = 'member'`) attempts to approve draft via POST request.
  2. Store owner (`role = 'owner'`) sends POST request to approve draft.
* **Expected Result:**
  - Staff attempt fails with HTTP `403 Forbidden` (`error: 'INSUFFICIENT_PERMISSIONS'`).
  - Owner attempt succeeds:
    - Draft transitions to `status = 'approved'`.
    - Creates approval record tied to that exact draft version ID.
    - Enables the client handoff buttons in the UI.

#### `[REQ-AC-014]` Approved Draft Invalidation on Edit
* **Precondition:** Campaign draft `CD-101` is in `status: 'approved'` (Version 1).
* **Execution Steps:**
  1. Owner opens editor, changes message text or discount, and clicks "Save Draft".
* **Expected Result:**
  - Version 1 status transitions to `superseded`.
  - Creates Version 2 with `status: 'draft'`, incrementing `version_number: 2`.
  - Handoff buttons are immediately disabled until Version 2 undergoes explicit re-approval.

#### `[REQ-AC-015]` WhatsApp Client Handoff & Event Logging
* **Precondition:** Campaign draft Version 2 is approved. Target customer John has `phone: '+1 (555) 019-2834'`.
* **Execution Steps:**
  1. Owner clicks **"Open WhatsApp"** on John's row.
* **Expected Result:**
  - Browser opens new tab with URL: `https://wa.me/15550192834?text=...`.
  - Database atomically inserts record in `communication_handoffs`:  
    `{ business_id, draft_id, customer_id, user_id, channel: 'whatsapp', handoff_initiated_at: NOW() }`.
  - UI updates badge to: **"Handoff Initiated"** with timestamp.
  - UI strictly avoids displaying "Sent" or "Delivered".

#### `[REQ-AC-016]` Email Mailto Client Handoff & Event Logging
* **Precondition:** Campaign draft is approved. Target customer Sarah has `email: 'sarah@trade.com'`.
* **Execution Steps:**
  1. Owner clicks **"Open Email Client"**.
* **Expected Result:**
  - Browser triggers OS mailto handler: `mailto:sarah%40trade.com?subject=...`.
  - Database atomically logs record in `communication_handoffs` with `channel = 'email'`.
  - UI displays **"Handoff Initiated"**.

---

### 2.6 Audit Integrity & Access Controls

#### `[REQ-AC-017]` Database Permission Restriction on Audit Ledger
* **Precondition:** Application database connection is authenticated as operational user (`bizora_app`).
* **Execution Steps:**
  1. Execute query: `UPDATE audit_events SET payload = '{}' WHERE id = '...';`
  2. Execute query: `DELETE FROM audit_events WHERE id = '...';`
* **Expected Result:**
  - Both queries fail with database permission denial: `ERROR: permission denied for table audit_events`.

#### `[REQ-AC-018]` Hash Chain Tamper Detection
* **Precondition:** `audit_events` contains 10 sequential events forming an unbroken hash chain ($E_1 \rightarrow \dots \rightarrow E_{10}$).
* **Execution Steps:**
  1. Using an administrative database superuser connection, alter the payload in row $E_5$.
  2. Run the audit integrity verification script.
* **Expected Result:**
  - Verification script recalculates hash for $E_5$ and detects hash mismatch.
  - Script terminates with `AuditChainBrokenException` identifying sequence #5 as tampered.
