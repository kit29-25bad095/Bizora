# BIZORA — PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Document Reference:** BIZORA-PRD-V1.1  
**Status:** DRAFT FOR STAKEHOLDER REVIEW (REVISED)  
**Lifecycle Phase:** Phase 02 Requirements Engineering  
**Classification:** Confidential — Bizora Product Architecture  
**Date:** 2026-11-21  

---

## 1. PRODUCT IDENTITY & MISSION

* **Project:** Bizora
* **Tagline:** Move Your Business Forward.
* **Product Vision:** Bizora is an AI-powered business recovery and decision intelligence platform designed to empower small-to-medium retail and wholesale quotation-driven businesses. By transforming dormant customer histories, past transaction records, and unclosed quotations into verified, actionable intelligence, Bizora identifies revenue leakage and equips store owners with actionable recovery recommendations.
* **Core Value Proposition:**
  1. Detect lost revenue opportunities, dormant customer risks, and lapsed quotations without complex enterprise software.
  2. Safeguard customer trust and business reputation through strict human gatekeeping on every customer communication.
  3. Enable rapid data onboarding via familiar CSV and Excel spreadsheets with zero proprietary integration friction.

---

## 2. MARKET SCOPE & TARGET USER ARCHETYPE (V1)

Bizora V1 targets **Retail, E-Commerce, and Wholesale Trade Operators**, specifically:
1. **Independent Retailers & Storefronts:** Hardware stores, building material suppliers, electrical wholesalers, automotive parts stockists, specialty retail shops.
2. **Quotation-Driven Traders:** Suppliers and wholesalers who provide custom customer price quotes and face quote abandonment.
3. **Multi-Channel Retailers:** Merchants tracking repeat customer frequency and lapsed buyer cohorts across physical and online sales.

*Explicitly Deferred from V1:* Subscription recurring billing (SaaS contracts) and billable-hour professional services firms (deferred to future product phases).

---

## 3. MULTI-TENANT ARCHITECTURE & TENANT CONTEXT

Bizora is a **Multi-Tenant Software-as-a-Service (SaaS)** platform:
* Each business registering on Bizora is an isolated **Tenant** bounded by a unique, immutable `business_id`.
* A tenant supports multiple authorized users with granular role-based permissions (Store Owner, Staff Member).
* No user may access, view, or modify data outside their active, server-verified business tenant context.

---

## 4. DETAILED FUNCTIONAL REQUIREMENTS

### 4.1 Tenant Onboarding & Store Configuration

#### `[REQ-PRD-001]` Tenant Registration & Profile Management
* **Priority:** P0 (Critical)
* **Description:** The system must allow business owners to register a tenant account, establishing their store identity, base currency, and operating timezone.
* **Business Rationale:** Establishes the authoritative multi-tenant boundary and localizes all financial analytics and calendar date calculations.
* **Acceptance Criteria:**
  1. Registration captures business name, slug, owner email, currency code (ISO 4217), and operating timezone (IANA format).
  2. Currency selection is locked to the tenant root upon confirmation to prevent unverified mixed-currency arithmetic.
  3. System automatically provisions a default `owner` membership for the registering user.
* **Verification Method:** Automated end-to-end registration test asserting tenant row creation, unique slug generation, and role assignment.
* **Dependencies:** None.
* **Status:** Proposed.

#### `[REQ-PRD-002]` Team Member Invitations & Access Delegation
* **Priority:** P1 (High)
* **Description:** Store owners must be able to invite staff members to their tenant via email with specific roles (`owner`, `member`).
* **Business Rationale:** Enables retail employees to import spreadsheets and update quotations while preventing unauthorized access to executive subscription settings or campaign approval.
* **Acceptance Criteria:**
  1. Inviting a user creates a secure, single-use token expiring in 7 calendar days.
  2. Invited users accepting the invitation are bound strictly to the target `business_id`.
  3. Store owners can revoke active memberships or change staff roles at any time with immediate server-side effect.
* **Verification Method:** Integration test verifying role assignment and immediate access termination upon membership revocation.
* **Dependencies:** `[REQ-PRD-001]`
* **Status:** Proposed.

---

### 4.2 Data Ingestion & Spreadsheet Management

#### `[REQ-PRD-003]` Spreadsheet Ingestion Engine (CSV & Excel)
* **Priority:** P0 (Critical)
* **Description:** The system must support asynchronous upload, parsing, and staging of sales transactions, customer directories, and quotations from `.csv`, `.xlsx`, and `.xls` files up to a provisional limit of 25 MB.
* **Business Rationale:** Small retail businesses manage operations via spreadsheets or POS exports. Smooth, robust file ingestion is the primary barrier to adoption.
* **Acceptance Criteria:**
  1. System accepts UTF-8 and ASCII encoded CSV files and standard Excel workbooks.
  2. Files exceeding the size limit or containing invalid MIME types are rejected with an explicit user-facing error message.
  3. Uploaded files are streamed to temporary secure staging storage; raw source files are automatically purged after 30 days.
* **Verification Method:** Automated file upload testing with valid, corrupt, oversized, and unsupported file payloads.
* **Dependencies:** `[REQ-PRD-001]`
* **Status:** Proposed (25 MB limit requires stakeholder confirmation).

#### `[REQ-PRD-004]` Interactive Column Mapping & Data Normalization
* **Priority:** P0 (Critical)
* **Description:** Upon file upload, the system must display an interactive preview of the first 5 rows and allow the user to map spreadsheet headers to Bizora core data fields.
* **Business Rationale:** Retailers use diverse POS and billing systems with disparate column naming conventions (`Bill Date`, `Txn Date`, `Phone`, `Mobile`, `Total`, `Net Amt`).
* **Acceptance Criteria:**
  1. System provides intelligent auto-mapping suggestions for common column headers.
  2. Required mappings for sales transactions: `Transaction ID` (optional), `Customer Identifier` (Phone or Email or Name), `Date`, and `Gross Amount`.
  3. Normalizes dates across standard formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, ISO 8601) into UTC relative to the store timezone.
* **Verification Method:** Unit tests verifying normalization across 10 distinct date, currency, and phone formatting variants.
* **Dependencies:** `[REQ-PRD-003]`
* **Status:** Proposed.

#### `[REQ-PRD-005]` Multi-Tiered Duplicate Detection & Reconciliation Strategy
* **Priority:** P0 (Critical)
* **Description:** The ingestion engine must implement deterministic duplicate detection and ambiguous-match review to prevent double-counting revenue while acknowledging that legitimate distinct purchases can occur on the same day for identical amounts.
* **Business Rationale:** Overlapping export ranges frequently introduce duplicate records, but simplistic matching on phone + date + amount risks dropping valid separate retail purchases.
* **Acceptance Criteria:**
  1. **Deterministic Level 1 Match (External Source ID):** If an incoming row contains an external invoice/receipt ID that already exists for that tenant, it is classified as a deterministic duplicate. The user can select:
     - `Skip` (Default): Retain existing record, log as duplicate.
     - `Update`: Overwrite existing record attributes.
  2. **Ambiguous Level 2 Match (Heuristic Match):** If no external ID exists, rows matching an existing record on `(customer_phone, transaction_date_day, amount_minor_units)` are flagged as **"Ambiguous Match / Review Required"**.
  3. The reconciliation modal presents ambiguous rows with timestamps and line details, allowing the user to explicitly confirm whether they represent distinct legitimate transactions or duplicates.
  4. Non-fatal row errors (e.g. malformed single row) are isolated; user can choose to "Skip Invalid Rows & Proceed" if error rate is $< 5\%$.
* **Verification Method:** Integration tests verifying that re-importing identical files produces zero duplicates, and identical same-day purchases are surfaced for user confirmation.
* **Dependencies:** `[REQ-PRD-004]`
* **Status:** Proposed.

#### `[REQ-PRD-006]` Atomic Batch Commit & Conditional Rollback
* **Priority:** P1 (High)
* **Description:** An import batch must execute within an atomic database transaction. If unrecoverable errors exceed 5%, the entire batch aborts. Users must have the ability to roll back an import batch within a provisional 24-hour window, provided no subsequent reconciled operations depend on it.
* **Business Rationale:** Protects financial data integrity from corrupt files and gives non-technical owners confidence that mistakes can be undone safely.
* **Acceptance Criteria:**
  1. Every committed import is assigned an immutable `import_batch_id`.
  2. Clicking "Rollback Batch" physically purges all orders and customer links created exclusively by that batch, provided no quotation conversions or downstream settlements have linked to them.
  3. If dependent operations exist, rollback is blocked with an explanatory error listing the blocking dependencies.
* **Verification Method:** Integration test creating a 1,000-row batch, triggering rollback, and verifying database returns to identical pre-import state.
* **Dependencies:** `[REQ-PRD-005]`
* **Status:** Proposed (24-hour rollback window requires stakeholder validation).

---

### 4.3 Retail Customer & Quotation Management

#### `[REQ-PRD-007]` Unified Retail Customer Directory
* **Priority:** P0 (Critical)
* **Description:** The system must maintain an aggregated profile for every customer, compiling lifetime spend, total transaction count, first seen date, last seen date, and average purchase frequency.
* **Business Rationale:** Provides the fundamental data substrate for dormancy detection and customer value analysis.
* **Acceptance Criteria:**
  1. Customer identity resolution prioritizes normalized E.164 phone number, falling back to email address, falling back to customer name.
  2. Profile updates atomically whenever new transactions are committed.
  3. Directory supports filtering by churn risk level, dormancy score, spend tiers, and date ranges.
* **Verification Method:** Unit tests asserting customer lifetime spend increments accurately upon transaction ingestion.
* **Dependencies:** `[REQ-PRD-005]`
* **Status:** Proposed.

#### `[REQ-PRD-008]` Quotation Lifecycle & Explicit Validity Tracking
* **Priority:** P0 (Critical)
* **Description:** The system must track customer price quotations through distinct lifecycle states: `draft`, `sent`, `accepted`, `rejected`, and `expired`, with explicit user-defined `valid_until_date` tracking.
* **Business Rationale:** Quotation abandonment represents massive unrecovered revenue for wholesale and trade merchants.
* **Acceptance Criteria:**
  1. Quotation records mandate: `customer_id`, `quote_number`, `issued_date`, `valid_until_date`, `total_amount_minor_units`, and `status`.
  2. Universal expiration defaults (e.g. 14 days) are **not imposed**; the user must define or confirm `valid_until_date` per quote.
  3. Because V1 does not dispatch quotations through Bizora, an authorized user must explicitly record when a quotation was sent (`sent_at`, `sent_channel`).
  4. Expiration is evaluated dynamically: quotes where `status = 'sent' AND valid_until_date < current_date` are flagged as expired in query views and can transition to `expired` via explicit user action or scheduled task.
  5. Accepting a quotation allows the user to convert it directly into an active retail `order` record.
* **Verification Method:** State machine integration tests verifying quotation state transitions and order conversion.
* **Dependencies:** `[REQ-PRD-007]`
* **Status:** Proposed.

---

### 4.4 Financial Analytics & Decision Intelligence

#### `[REQ-PRD-009]` Deterministic Retail Financial Dashboard
* **Priority:** P0 (Critical)
* **Description:** The dashboard must display authoritative retail metrics computed strictly via deterministic server calculations: Gross Sales, Net Sales, Settled Payments, Cash Collected, and Open vs Expired Quotation Values.
* **Business Rationale:** Small business owners need an instant, unvarnished, mathematically accurate snapshot of store performance.
* **Acceptance Criteria:**
  1. All currency metrics are calculated using integer minor units (e.g. cents, pence, fils, or zero-decimal yen) and formatted according to store currency exponent.
  2. Metrics distinctly separate:
     - **Gross Sales:** Total order value before discounts/returns.
     - **Net Sales:** Gross sales minus discounts and refunds.
     - **Settled Payments:** Payments cleared in bank/gateway.
     - **Cash Collected:** Actual cash/cleared inflows during the observation window.
  3. AI is structurally prohibited from calculating, altering, or asserting authoritative financial figures.
* **Verification Method:** Mathematical verification tests comparing raw database calculations against UI dashboard cards across multiple currencies.
* **Dependencies:** `[REQ-PRD-005]`, `[REQ-PRD-008]`
* **Status:** Proposed.

#### `[REQ-PRD-010]` Analytical Customer Dormancy & Revenue Risk Scoring
* **Priority:** P0 (Critical)
* **Description:** The system must evaluate customer purchase recency relative to personal purchase cycles to assign a Dormancy Score ($D \in [0, 100]$) and categorize Churn Risk Level (`low`, `medium`, `high`, `critical`).
* **Business Rationale:** Early identification of lapsing buyers allows business owners to intervene before the customer permanently defects.
* **Acceptance Criteria:**
  1. Statistical Z-score scoring is treated as an **analytical proposal**, not an immutable financial fact.
  2. Minimum Sample Size: Customers with $< 3$ transactions are classified as **"Insufficient History"** and excluded from automated dormancy scoring until sufficient data is accumulated.
  3. Zero-Variance Guardrail: If customer purchase interval standard deviation $\sigma = 0$, the algorithm flags the score with a "Low Sample Variance" caveat.
  4. Explanatory Context: Every customer flagged as dormant includes a plain-English explanation (e.g., *"Last purchased 45 days ago; personal average cycle is 14 days; 3.2x cycle elapsed"*).
  5. Estimated opportunity loss is clearly labeled as an **analytical estimate with confidence levels**, explicitly *not* a guaranteed recoverable asset.
* **Verification Method:** Algorithm unit tests asserting correct score calculation, explanatory generation, and edge-case classification across diverse purchase histories.
* **Dependencies:** `[REQ-PRD-007]`, `[REQ-PRD-008]`
* **Status:** Proposed.

---

### 4.5 AI Insights & Communication Handoffs

#### `[REQ-PRD-011]` AI-Generated Recovery Recommendations & Message Drafting
* **Priority:** P1 (High)
* **Description:** Using verified deterministic metrics and risk detections, an AI service (evaluated in Phase 04) must generate plain-English analytical summaries and draft win-back recovery messages.
* **Business Rationale:** Translates dry numbers into actionable marketing language tailored to small business owners who lack marketing staff.
* **Acceptance Criteria:**
  1. AI prompt contains only verified, pre-computed metrics and anonymized customer purchase recency data; zero raw PII is passed to the LLM.
  2. LLM response is parsed into a strict validation schema: `{ summary: string, target_cohort: string, suggested_discount: string, drafts: Array<{ channel: 'whatsapp' | 'email', subject?: string, message: string }> }`.
  3. The system permanently tags AI outputs with a visual badge: *"AI-Generated Draft — Review Required"*.
  4. Specific AI provider and model selection is deferred to Phase 04.
* **Verification Method:** Unit tests verifying schema parsing and asserting rejection of malformed LLM payloads.
* **Dependencies:** `[REQ-PRD-010]`
* **Status:** Proposed.

#### `[REQ-PRD-012]` Human-in-the-Loop (HITL) Campaign Approval Gate
* **Priority:** P0 (Critical — Mandatory Safety Rule)
* **Description:** An authorized store owner must explicitly review, optionally edit, and sign off on any AI-generated communication draft before any handoff link can be generated.
* **Business Rationale:** Mandatory Product Rule: Eliminates business liability from erroneous discounts, offensive tone, or unauthorized customer contact.
* **Acceptance Criteria:**
  1. Campaign drafts exist in an immutable versioned structure (`status: 'draft'`, `'pending_approval'`, `'approved'`, `'superseded'`).
  2. Editing message text, discount parameters, or audience filters on an approved draft immediately supersedes the version and reverts status to `draft`, invalidating previous approvals.
  3. Approval action requires an explicit POST request from an authenticated user with `role = 'owner'`, recording an approval record tied to that exact draft version ID.
* **Verification Method:** Security integration test asserting that non-owner users cannot approve drafts and that editing approved drafts forces re-approval.
* **Dependencies:** `[REQ-PRD-011]`
* **Status:** Proposed.

#### `[REQ-PRD-013]` Owner-Controlled WhatsApp & Email Client Handoff Engine
* **Priority:** P0 (Critical)
* **Description:** The system must generate client-side URI handoffs for WhatsApp (`https://wa.me/<phone>?text=<encoded_msg>`) and Email (`mailto:<email>?subject=<subj>&body=<msg>`), allowing the business owner to review and send messages directly from their personal device.
* **Business Rationale:** V1 explicitly avoids automated sending to ensure the business owner retains personal relationship control and eliminate third-party messaging costs and delivery failures.
* **Acceptance Criteria:**
  1. Clicking "Open WhatsApp" opens the official WhatsApp Web/Desktop URL with URL-encoded message text and validated customer phone number.
  2. The system creates a record in `communication_handoffs` logging: `(business_id, draft_id, user_id, channel, handoff_initiated_at)`.
  3. The user interface strictly labels the action as **"Handoff Initiated"**; the system is structurally barred from displaying "Message Sent" or "Delivered".
* **Verification Method:** UI component test verifying URL encoding and database audit record insertion upon handoff trigger.
* **Dependencies:** `[REQ-PRD-012]`
* **Status:** Proposed.

---

### 4.6 Governance, Subscriptions & Audit Trail

#### `[REQ-PRD-014]` Audit Event Integrity & Access Controls
* **Priority:** P0 (Critical)
* **Description:** The system must record sensitive administrative, financial, and approval actions in a dedicated audit log table with access controls and sequence tracking.
* **Business Rationale:** Guarantees internal accountability, administrative visibility, and verification of user approval.
* **Acceptance Criteria:**
  1. Every audit entry captures: `business_id`, `sequence_number`, `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, and `payload`.
  2. Application role permissions restrict `UPDATE` and `DELETE` operations on audit tables.
  3. System acknowledges that cryptographic hash chaining detects unauthorized modifications, but does not prevent physical database destruction by a database superuser without external WORM backups.
  4. Retention duration is recognized as requiring jurisdictional legal validation (statutory requirements vary by country).
* **Verification Method:** Security tests verifying audit record insertion and permission denial on modification attempts.
* **Dependencies:** `[REQ-PRD-001]`
* **Status:** Proposed.

#### `[REQ-PRD-015]` Fixed-Tier Subscription Model & AI Usage Caps
* **Priority:** P1 (High)
* **Description:** The platform must enforce tenant-level monthly AI analysis and import usage caps based on their active subscription tier (`starter`, `growth`, `pilot`).
* **Business Rationale:** Protects Bizora operational margins by preventing runaway third-party AI API expenditures.
* **Acceptance Criteria:**
  1. System tracks monthly usage counters per tenant.
  2. When a tenant reaches 100% of their tier quota, subsequent AI generation requests return an informative upgrade prompt; core retail dashboard and data viewing remain fully accessible.
  3. Pilot billing is recorded administratively; automated payment processing is excluded from V1.
* **Verification Method:** Integration test simulating tenant quota exhaustion and asserting clean API rate-limiting response.
* **Dependencies:** `[REQ-PRD-001]`
* **Status:** Proposed (Tier caps subject to pilot commercial validation).

---

## 5. NON-FUNCTIONAL REQUIREMENTS SUMMARY

* **Performance:** Provisional targets (e.g. sub-250ms dashboard response) to be validated against empirical benchmarks during Phase 14.
* **Security & Isolation:** Database-level tenant isolation is a non-negotiable security objective; exact implementation details (e.g. RLS vs schema separation) belong to Phase 05 design.
* **Data Retention:** Customer transaction and quote records persist for active accounts; raw spreadsheet files are purged after 30 days.

---

## 6. REQUIREMENTS TRACEABILITY MATRIX

| Requirement ID | Module | Priority | Core Business Objective | Primary Verification |
| :--- | :--- | :---: | :--- | :--- |
| `[REQ-PRD-001]` | Identity & Tenancy | P0 | Multi-tenant store profile isolation | Automated E2E Test |
| `[REQ-PRD-002]` | Identity & Tenancy | P1 | Granular staff delegation | Integration Test |
| `[REQ-PRD-003]` | Data Ingestion | P0 | Spreadsheet file upload (CSV/Excel) | API Validation Test |
| `[REQ-PRD-004]` | Data Ingestion | P0 | Intelligent header mapping & normalization | Unit Test Suite |
| `[REQ-PRD-005]` | Data Ingestion | P0 | Deterministic duplicate & ambiguous match handling | Relational Integration Test |
| `[REQ-PRD-006]` | Data Ingestion | P1 | Fail-safe batch commit & conditional rollback | Database Transaction Test |
| `[REQ-PRD-007]` | Customer Directory | P0 | Unified retail customer directory | Query Assertion Test |
| `[REQ-PRD-008]` | Quotation Pipeline | P0 | Explicit quotation validity & lapsing rules | State Transition Test |
| `[REQ-PRD-009]` | Performance Dashboard | P0 | Deterministic integer minor-unit analytics | Financial Test Fixtures |
| `[REQ-PRD-010]` | Decision Intelligence | P0 | Statistical dormancy scoring with caveats | Algorithmic Unit Tests |
| `[REQ-PRD-011]` | AI Recovery Engine | P1 | Plain-English tactical recommendations | Schema Validation Tests |
| `[REQ-PRD-012]` | Communication Safety | P0 | Mandatory human approval gatekeeper | Security Integration Test |
| `[REQ-PRD-013]` | Communication Handoff | P0 | Owner-controlled WhatsApp/Email handoff | Client URI & Audit Test |
| `[REQ-PRD-014]` | Audit & Governance | P0 | Audit event integrity & access controls | Security Audit Test |
| `[REQ-PRD-015]` | Subscription Governance | P1 | AI quota management & cost controls | Quota Limiter Unit Test |
