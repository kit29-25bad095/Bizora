# BIZORA — DOMAIN MODULE DESIGN & BOUNDARY SPECIFICATION

**Document Reference:** BIZORA-ARCH-MODULES-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Principal Software Architect  
**Date:** 2026-11-21  

---

## 1. PURPOSE & MODULAR DESIGN PRINCIPLE

This document specifies the internal domain module boundaries for the Bizora Modular Monolith. The system is designed according to **Domain-Driven Design (DDD)** and **Package-by-Feature** principles to ensure that modules are loosely coupled, highly cohesive, independently testable, and extractable into standalone services if horizontal scale demands it in Stage B/C.

---

## 2. MODULE INVENTORY & RESPONSIBILITY MATRIX

Bizora decomposes into seven domain modules:

```
+----------------------------------------------------------------------------------------------------+
|                                    DOMAIN MODULE DEPENDENCY GRAPH                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +-----------------------------+                                                                 |
|    |  Module 1: Tenancy & Auth   | <-------------------------+                                     |
|    +-----------------------------+                           | (Authenticates & provides context)  |
|                   ^                                          |                                     |
|                   |                                          |                                     |
|    +--------------+--------------+                           |                                     |
|    |                             |                           |                                     |
|    v                             v                           |                                     |
|  +--------------------+        +--------------------+        |                                     |
|  | Module 2: Retail   |        | Module 3: Quotes   |        |                                     |
|  | Accounting Ledger  |        | Pipeline Engine    |        |                                     |
|  +--------------------+        +--------------------+        |                                     |
|            ^                             ^                   |                                     |
|            |                             |                   |                                     |
|    +-------+-----------------------------+                   |                                     |
|    |                                                         |                                     |
|    v                                                         |                                     |
|  +-----------------------------+                             |                                     |
|  | Module 4: Ingestion Engine  |                             |                                     |
|  | (CSV / Excel Streaming)     |                             |                                     |
|  +-----------------------------+                             |                                     |
|                   |                                          |                                     |
|                   v                                          |                                     |
|  +-----------------------------+                             |                                     |
|  | Module 5: Decision Intel    |                             |                                     |
|  | (Dormancy / Risk Scoring)   |                             |                                     |
|  +-----------------------------+                             |                                     |
|                   |                                          |                                     |
|                   v                                          |                                     |
|  +-----------------------------+                             |                                     |
|  | Module 6: AI Recovery &     |                             |                                     |
|  | Approval Gatekeeper         |                             |                                     |
|  +-----------------------------+                             |                                     |
|                   |                                          |                                     |
|                   v                                          |                                     |
|  +-----------------------------+                             |                                     |
|  | Module 7: Communication     | ----------------------------+                                     |
|  | Handoff & Audit Ledger      |                                                                   |
|  +-----------------------------+                                                                   |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. DETAILED MODULE SPECIFICATIONS

### Module 1: Tenancy, Identity & Access Control (`tenancy`)
* **Core Responsibilities:**
  - Manages `businesses`, `users`, `business_users`, and invitations.
  - Authenticates users and constructs the immutable, server-verified `TenantContext`.
  - Enforces Role-Based Access Control (RBAC: `owner`, `manager`, `analyst`).
  - Publishes real-time session revocation keys upon role change or user removal.
* **Exposed Interface Contracts:**
  - `getTenantContext(request): Promise<TenantContext>`
  - `requireTenantRole(ctx: TenantContext, allowedRoles: Role[]): void`
  - `revokeMembership(ctx: TenantContext, targetUserId: string): Promise<void>`
* **Dependencies:** Infrastructure Auth & Redis client.

---

### Module 2: Retail Accounting & Customer Directory (`retail`)
* **Core Responsibilities:**
  - Maintains `customers`, `transactions`, and `transaction_items`.
  - Calculates authoritative deterministic retail metrics: Gross Sales, Net Sales, AOV, Settled Payments, and Cash Collected in integer minor units.
  - Updates customer lifetime spend, order frequency, and recency timestamps.
* **Exposed Interface Contracts:**
  - `getCustomerProfile(ctx: TenantContext, customerId: string): Promise<CustomerProfile>`
  - `calculateStoreMetrics(ctx: TenantContext, dateRange: DateRange): Promise<StoreFinancialSummary>`
  - `recordTransaction(ctx: TenantContext, transactionData: TransactionInput): Promise<TransactionRecord>`
* **Dependencies:** `tenancy`.

---

### Module 3: Quotation Pipeline Engine (`quotations`)
* **Core Responsibilities:**
  - Manages `quotations` and `quotation_items`.
  - Tracks canonical quotation lifecycle: `draft`, `sent`, `accepted`, `rejected`, and `expired`.
  - Evaluates dynamic expiration against user-defined `valid_until_date`.
  - Converts accepted quotations into active retail `transactions` in Module 2.
* **Exposed Interface Contracts:**
  - `createQuotation(ctx: TenantContext, input: QuotationInput): Promise<QuotationRecord>`
  - `recordQuotationSent(ctx: TenantContext, quoteId: string, channel: string): Promise<void>`
  - `convertQuotationToTransaction(ctx: TenantContext, quoteId: string): Promise<TransactionRecord>`
  - `getLapsedQuotationSummary(ctx: TenantContext): Promise<QuotationLapseSummary>`
* **Dependencies:** `tenancy`, `retail`.

---

### Module 4: Spreadsheet Ingestion & Normalization (`ingestion`)
* **Core Responsibilities:**
  - Streams and parses `.csv`, `.xlsx`, and `.xls` files up to 25 MB with bounded memory.
  - Executes intelligent column header mapping and date/currency normalization.
  - Executes multi-tiered duplicate detection: Deterministic External ID vs Ambiguous Heuristic matching.
  - Commits imports atomically in batches and manages the 24-hour batch rollback window.
* **Exposed Interface Contracts:**
  - `stageSpreadsheetFile(ctx: TenantContext, fileStream: ReadableStream): Promise<StagingSession>`
  - `previewMapping(ctx: TenantContext, sessionId: string, mapping: ColumnMapping): Promise<MappingPreview>`
  - `commitImportBatch(ctx: TenantContext, sessionId: string, options: ReconciliationOptions): Promise<ImportBatchSummary>`
  - `rollbackImportBatch(ctx: TenantContext, batchId: string): Promise<RollbackResult>`
* **Dependencies:** `tenancy`, `retail`, Infrastructure Storage abstraction.

---

### Module 5: Decision Intelligence & Risk Radar (`intelligence`)
* **Core Responsibilities:**
  - Evaluates customer purchase intervals to compute Dormancy Scores ($D \in [0, 100]$) and assign Churn Risk levels.
  - Handles statistical fallbacks: low history ($N < 3$) and zero-variance ($\sigma = 0 \rightarrow \sigma = 7\text{ days}$).
  - Generates plain-English explanatory context for why each customer is flagged.
  - Projects estimated opportunity loss as an analytical forecast with confidence levels.
* **Exposed Interface Contracts:**
  - `calculateCustomerDormancy(ctx: TenantContext, customerId: string): Promise<DormancyAssessment>`
  - `getStoreRiskRadar(ctx: TenantContext): Promise<StoreRiskSummary>`
  - `generateDormantCohortList(ctx: TenantContext, filter: CohortFilter): Promise<DormantCustomer[]>`
* **Dependencies:** `tenancy`, `retail`, `quotations`.

---

### Module 6: AI Recovery Strategy & Human Approval (`recovery`)
* **Core Responsibilities:**
  - Passes verified, anonymized summary metrics to the evaluated AI service.
  - Validates AI-generated win-back campaign recommendations and drafts using Zod schemas.
  - Enforces the **Mandatory Human Approval Gatekeeper**:
    - Manages draft versioning (`draft`, `pending_approval`, `approved`, `superseded`).
    - Invalidates existing approvals immediately if message text or audience criteria are modified.
    - Requires an authenticated user with `role = 'owner'` to approve drafts.
* **Exposed Interface Contracts:**
  - `generateCampaignDraft(ctx: TenantContext, cohortId: string): Promise<CampaignDraftVersion>`
  - `editCampaignDraft(ctx: TenantContext, draftId: string, updates: DraftUpdates): Promise<CampaignDraftVersion>`
  - `approveCampaignDraft(ctx: TenantContext, draftId: string): Promise<ApprovalRecord>`
* **Dependencies:** `tenancy`, `intelligence`, Infrastructure AI provider abstraction.

---

### Module 7: Communication Handoff & Audit Governance (`governance`)
* **Core Responsibilities:**
  - Generates validated client-side protocol URIs for WhatsApp (`wa.me`) and Email (`mailto:`).
  - Logs `communication_handoffs` recording `(business_id, draft_id, user_id, channel, handoff_initiated_at)`.
  - Maintains the append-only, tamper-evident audit ledger with SHA-256 hash chaining.
  - Restricts application permissions on audit tables (`REVOKE UPDATE, DELETE, TRUNCATE`).
* **Exposed Interface Contracts:**
  - `createWhatsAppHandoff(ctx: TenantContext, draftId: string, customerId: string): Promise<HandoffURI>`
  - `createEmailHandoff(ctx: TenantContext, draftId: string, customerId: string): Promise<HandoffURI>`
  - `recordAuditEvent(ctx: TenantContext, event: AuditEventInput): Promise<void>`
  - `verifyAuditLedgerIntegrity(ctx: TenantContext): Promise<AuditIntegrityReport>`
* **Dependencies:** `tenancy`, `recovery`.
