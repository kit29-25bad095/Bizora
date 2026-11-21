# BIZORA — SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Document Reference:** BIZORA-SRS-V1.1  
**Status:** DRAFT FOR STAKEHOLDER REVIEW (REVISED)  
**Lifecycle Phase:** Phase 02 Requirements Engineering  
**Classification:** Confidential — System Engineering Specification  
**Date:** 2026-11-21  

---

## 1. INTRODUCTION

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the technical, architectural, security, and performance requirements for the Bizora SaaS platform (Version 1.0). It defines system interfaces, database security objectives, tenant isolation standards, spreadsheet import processing rules, and audit integrity controls.

### 1.2 System Overview
Bizora is a multi-tenant, modular monolith. The system ingests retail sales and quotation spreadsheets, executes deterministic calculations in integer minor units, synthesizes actionable business insights via an evaluated AI service, enforces explicit human-in-the-loop approvals, and generates client-side communication handoffs.

---

## 2. EXTERNAL SYSTEM INTERFACES

### 2.1 User Interfaces & Browser Compatibility
* **`[REQ-SRS-001]` Browser Support Matrix:** The web application must render natively without polyfills on modern Evergreen browsers: Chromium-based browsers (Chrome, Edge >= v120), Apple WebKit (Safari >= v17), and Mozilla Firefox (>= v125).
* **`[REQ-SRS-002]` Responsive Viewports:** The user interface must adapt dynamically across four responsive viewport tiers: Mobile ($360\text{px} \le \text{width} < 768\text{px}$), Tablet ($768\text{px} \le \text{width} < 1024\text{px}$), Desktop ($1024\text{px} \le \text{width} < 1440\text{px}$), and Large Desktop ($\text{width} \ge 1440\text{px}$).

### 2.2 Client-Side Protocol Interfaces
* **`[REQ-SRS-003]` WhatsApp Web / Mobile Protocol Scheme:** The system must construct standards-compliant URL schemes for WhatsApp messaging:
  $$\text{URI} = \text{"https://wa.me/"} \parallel \text{E164Phone} \parallel \text{"?text="} \parallel \text{encodeURIComponent}(\text{messageText})$$
  - The phone number must be stripped of all non-numeric characters except the leading country code.
* **`[REQ-SRS-004]` Email Mailto Scheme:** The system must construct standard RFC 6068 `mailto:` links:
  $$\text{URI} = \text{"mailto:"} \parallel \text{encodeURIComponent}(\text{recipientEmail}) \parallel \text{"?subject="} \parallel \text{encodeURIComponent}(\text{subject}) \parallel \text{"&body="} \parallel \text{encodeURIComponent}(\text{body})$$

### 2.3 Third-Party AI Provider Interface (Phase 04 Evaluation)
* **`[REQ-SRS-005]` AI Provider Abstraction Interface:** AI generation calls must be wrapped in a provider-agnostic interface.
  - Candidate Providers: Anthropic Claude, OpenAI GPT-4o, Google Gemini (to be evaluated and formally selected in Phase 04).
  - Maximum Output Tokens: Configurable, provisionally capped at 1,500 tokens per analysis request.
  - Timeout & Circuit Breaking: Request timeout set to 25 seconds; returns graceful fallback error if provider fails or rate-limits.

---

## 3. NON-FUNCTIONAL REQUIREMENTS (NFRs)

### 3.1 Multi-Tenant Data Isolation & Security

#### `[REQ-SRS-006]` Server-Derived Tenant Context Enforcement
* **Priority:** P0 (Critical)
* **Description:** Every protected operation must derive the active `business_id` exclusively from server-verified session credentials. Client-supplied tenant IDs in request bodies or query parameters must be completely ignored.
* **Acceptance Criteria:**
  1. Passing an arbitrary `business_id` in a request payload does not affect data scoping.
  2. The server verifies active business membership and permissions on every protected mutation.
* **Verification Method:** Negative penetration testing attempting cross-tenant parameter injection.
* **Status:** Proposed.

#### `[REQ-SRS-007]` Database-Level Tenant Isolation Objective
* **Priority:** P0 (Critical)
* **Description:** The system mandates database-level tenant isolation as a core security objective.
* **Acceptance Criteria:**
  1. Data queries executed by the application must be bounded to the active tenant context.
  2. If the tenant context is missing or uninitialized, queries must fail closed, returning zero rows.
  3. Specific implementation details (e.g., PostgreSQL Row-Level Security policies, schema separation, or composite keys) are deferred to Phase 04/05 design.
* **Verification Method:** Direct database query tests asserting zero records returned when context is uninitialized.
* **Status:** Proposed.

---

### 3.2 Performance & Workload Benchmarking

#### `[REQ-SRS-008]` Dashboard Query Performance (Provisional Target)
* **Priority:** P1 (High)
* **Description:** Executive dashboard aggregations should target response times $< 250\text{ ms}$ at p95 for stores with up to 100,000 transaction records.
* **Acceptance Criteria:**
  1. This target is classified as a **provisional performance objective**, subject to empirical benchmarking in Phase 14.
  2. Workload assumptions: Up to 100,000 orders per store; daily summary tables employed where necessary.
* **Verification Method:** Synthetic workload benchmark testing during Phase 14 optimization.
* **Status:** Proposed (Provisional benchmark target).

#### `[REQ-SRS-009]` Spreadsheet Ingestion Resource Bounds (Provisional Target)
* **Priority:** P1 (High)
* **Description:** The spreadsheet ingestion engine should stream and parse CSV/Excel files with bounded memory consumption (provisionally $< 128\text{ MB}$ Node.js heap).
* **Acceptance Criteria:**
  1. Ingestion handles files up to 25 MB using chunked or streaming processing.
  2. Memory and execution benchmarks will be measured empirically during Phase 14.
* **Verification Method:** Memory profiling during 50,000-row file parsing tests.
* **Status:** Proposed (Provisional benchmark target).

---

### 3.3 Reliability & Failure Handling

#### `[REQ-SRS-010]` Transactional Import Atomicity & Error Reporting
* **Priority:** P0 (Critical)
* **Description:** Spreadsheet imports must execute within an explicit database transaction.
* **Acceptance Criteria:**
  1. If unrecoverable formatting errors exceed 5%, the entire transaction aborts with zero partial commits.
  2. Non-fatal row errors ($< 5\%$) generate a structured validation log detailing row numbers and failure reasons, allowing the user to skip invalid rows or abort.
* **Verification Method:** Chaos injection test introducing invalid formatting and verifying zero database rows committed on abort.
* **Status:** Proposed.

---

### 3.4 Security & Session Lifecycle

#### `[REQ-SRS-011]` Stateless Sessions with Server-Side Revocation Capability
* **Priority:** P0 (Critical)
* **Description:** Authentication sessions must utilize signed stateless tokens paired with a centralized revocation mechanism to handle role changes or membership termination.
* **Acceptance Criteria:**
  1. Session tokens are cryptographically signed with a secure secret.
  2. Cookies enforce `HttpOnly`, `Secure`, `SameSite=Lax`.
  3. When an owner revokes a user's membership, subsequent requests by that user are rejected by the server within 5 seconds.
  4. Specific infrastructure products (e.g. Redis vs database token lookup) are evaluated in Phase 04.
* **Verification Method:** Integration test revoking a user membership and asserting subsequent requests return 401 Unauthorized.
* **Status:** Proposed.

#### `[REQ-SRS-012]` Standard HTTP Security Headers
* **Priority:** P1 (High)
* **Description:** All HTTP responses must include industry-standard security headers mitigating common web vulnerabilities.
* **Acceptance Criteria:**
  1. HSTS (`Strict-Transport-Security`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  2. Content Security Policy (CSP) restricting script, style, and frame sources.
* **Verification Method:** Automated header inspection on all application route endpoints.
* **Status:** Proposed.

---

### 3.5 Auditability & Access Controls

#### `[REQ-SRS-013]` Audit Event Integrity & Access Controls
* **Priority:** P0 (Critical)
* **Description:** All administrative mutations, campaign approvals, and communication handoffs must be committed to an audit log table with access controls and sequence tracking.
* **Acceptance Criteria:**
  1. Audit entries record `business_id`, `sequence_number`, `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, and `payload`.
  2. Application role permissions restrict `UPDATE` and `DELETE` operations on audit tables.
  3. System acknowledges that cryptographic hash chaining detects unauthorized modifications, but does not prevent physical database destruction by a database superuser without external WORM backups.
  4. Retention duration is recognized as requiring jurisdictional legal validation (statutory requirements vary by country).
* **Verification Method:** Security tests verifying audit record insertion and permission denial on modification attempts.
* **Status:** Proposed.

---

### 3.6 Data Privacy, Retention & Deletion

#### `[REQ-SRS-014]` Privacy, Data Export & Deletion
* **Priority:** P1 (High)
* **Description:** The system must support data privacy obligations, including tenant data export and account deletion.
* **Acceptance Criteria:**
  1. Store owners can request an export of their customer and sales data in standard CSV/JSON format.
  2. Triggering store deletion purges operational customer and quotation records.
  3. Raw uploaded spreadsheet files are permanently purged from staging storage after 30 days.
  4. Statutory financial audit logs are retained in accordance with applicable jurisdictional legal requirements.
* **Verification Method:** Automated verification test asserting raw files are deleted after 30 days and account deletion purges operational records.
* **Status:** Proposed.

---

### 3.7 AI Usage Limits & Resource Governance

#### `[REQ-SRS-015]` Tenant AI Quota Governance
* **Priority:** P1 (High)
* **Description:** The platform must enforce tenant-level monthly AI analysis quotas based on their active subscription tier (`starter`, `growth`, `pilot`).
* **Acceptance Criteria:**
  1. AI request counts are tracked per tenant on a monthly calendar cycle.
  2. Exceeding monthly quota returns HTTP 429 with an informative upgrade prompt; core retail dashboard and data viewing remain fully accessible.
* **Verification Method:** Unit test asserting quota tracker blocks requests when threshold is reached.
* **Status:** Proposed.
