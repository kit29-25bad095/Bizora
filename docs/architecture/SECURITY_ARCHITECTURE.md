# BIZORA — SECURITY ARCHITECTURE & TENANT ISOLATION SPECIFICATION

**Document Reference:** BIZORA-ARCH-SECURITY-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Application Security Architect  
**Date:** 2026-11-21  

---

## 1. PRINCIPLE & OBJECTIVE

Bizora adheres to **Security-by-Design** and **Defense-in-Depth**. In a multi-tenant business intelligence SaaS, a failure in tenant isolation could expose private customer contact details, wholesale price quotations, or store revenue records to competitors. This architecture establishes non-negotiable security boundaries from the HTTP network edge down to the relational database engine.

---

## 2. DEFENSE-IN-DEPTH TENANT ISOLATION MODEL

Bizora rejects reliance on a single security gate. Tenant isolation is guaranteed across five distinct layers:

```
[ Inbound HTTP / Action Request ]
                 |
                 v
[ Layer 1: Context Derivation (Zero Client Trust) ]
  * Validates session token signature via AUTH_SECRET
  * Extracts authenticated `userId`
  * Resolves active `businessId` (Server-derived from DB/session, NEVER from client body)
                 |
                 v
[ Layer 2: Real-Time Membership & Revocation Verification ]
  * Checks Redis revocation list: `EXISTS revocation:membership:{businessId}:{userId}`
  * Verifies active status in `business_memberships` table
  * Aborts immediately (401/403) if membership revoked or token_version stale
                 |
                 v
[ Layer 3: Centralized Data Access Layer (DAL) Contract ]
  * All data functions mandate a validated `TenantContext` parameter
  * Query builder automatically injects `where: eq(table.businessId, ctx.businessId)`
                 |
                 v
[ Layer 4: Transactional PostgreSQL Row-Level Security (RLS) ]
  * Opens connection to database pooler
  * Enters transaction: `BEGIN;`
  * Sets local tenant context: `SELECT set_config('app.current_tenant_id', :businessId, true);`
  * RLS policy with `FORCE ROW LEVEL SECURITY` rejects any rows not matching context
                 |
                 v
[ Layer 5: Engine-Level Composite Foreign Keys ]
  * All dependent entities enforce: `FOREIGN KEY (business_id, parent_id) REFERENCES parent(business_id, id)`
  * Cross-tenant referencing is physically rejected by PostgreSQL constraint engine
```

---

## 3. RELATIONAL INTEGRITY & COMPOSITE KEYS

### 3.1 Eliminating Cross-Tenant References
Standard single-column foreign keys (`order_id REFERENCES orders(id)`) allow an attacker or bug to link `order_lines` belonging to Tenant A to an `order` belonging to Tenant B.

**Bizora's Engine-Enforced Composite Key Standard:**
1. Every tenant-scoped entity declares a composite candidate key: `UNIQUE (business_id, id)`.
2. Every child table enforces composite foreign keys referencing both columns:
   ```sql
   CONSTRAINT fk_order_lines_tenant_order 
       FOREIGN KEY (business_id, order_id) 
       REFERENCES orders(business_id, id) 
       ON DELETE CASCADE
   ```
3. It is mathematically impossible for an entity belonging to Tenant A to reference a parent belonging to Tenant B; the database engine immediately throws a `foreign_key_violation`.

### 3.2 Resolution of Composite `ON DELETE SET NULL`
* **The Vulnerability:** Executing `ON DELETE SET NULL` on a composite foreign key `(business_id, parent_id)` causes PostgreSQL to attempt setting **both** `business_id` and `parent_id` to `NULL`. Because `business_id` is defined as `NOT NULL` for tenant isolation, the operation triggers an immediate constraint violation error.
* **The Architectural Rule:**
  - Mandatory dependencies enforce `ON DELETE CASCADE` (orders -> order lines) or `ON DELETE RESTRICT` (drafts -> approvals).
  - Nullable parent relationships enforce **soft deletion** (`status = 'archived'`). Records are never physically deleted, preserving relational consistency without setting foreign keys to `NULL`.

---

## 4. DATABASE ROLES & PERMISSION HARDENING

The system enforces strict principle-of-least-privilege by separating migration execution from application runtime connections:

```sql
-- 1. DDL Migration Role (Used strictly by CI/CD deployment pipelines)
CREATE ROLE bizora_migrator WITH LOGIN PASSWORD '...';
GRANT ALL PRIVILEGES ON DATABASE bizora TO bizora_migrator;
GRANT ALL ON SCHEMA public TO bizora_migrator;

-- 2. Operational Application Role (Used by Next.js & Outbox Workers)
CREATE ROLE bizora_app WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE bizora TO bizora_app;
GRANT USAGE ON SCHEMA public TO bizora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bizora_app;

-- Hardening: Revoke superuser bypass and audit tampering capabilities
ALTER ROLE bizora_app NOBYPASSRLS;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM bizora_app;
```

---

## 5. AUDIT EVENT INTEGRITY & ACCESS CONTROLS

1. **Database-Level Immutability:** Operational application connections (`bizora_app`) possess zero `UPDATE` or `DELETE` permissions on `audit_events`.
2. **Cryptographic SHA-256 Hash Chaining:** Every audit record incorporates the previous event's hash, forming an unbroken verification chain:
   $$\text{event\_hash} = \text{SHA256}(\text{prev\_hash} \parallel \text{business\_id} \parallel \text{seq} \parallel \text{action} \parallel \text{created\_at} \parallel \text{SHA256}(\text{JCS}(\text{payload})))$$
3. **Canonical Serialization (RFC 8785):** Payloads are normalized using the JSON Canonicalization Scheme (JCS) before hashing to prevent whitespace or key-sorting discrepancies from breaking validation.
4. **Realistic Immutability Boundary:** Bizora acknowledges that database permissions and hash chaining detect unauthorized row alterations and deletions, but do not prevent table truncation by a compromised superuser. To address this, the daily chain-head hash is exported to immutable external WORM storage in Stage B.
5. **Account Termination vs. Legal Retention:** When a store closes its account, operational customer records are purged, but `audit_events` rows are preserved under `business_id` references (`ON DELETE RESTRICT`) for statutory compliance periods.

---

## 6. SECURITY THREAT MODEL (STRIDE METHODOLOGY)

| STRIDE Category | Threat Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates store owner via stolen session token. | Stateless session tokens signed via SHA-256 secret; real-time Redis revocation checks; mandatory MFA for owner role. |
| **Tampering** | User alters campaign discount percentage after approval. | Invalidation Rule: Any edit to an approved draft immediately supersedes the version and revokes approval; tamper-evident audit logs. |
| **Repudiation** | Owner approves discount campaign and later denies authorizing it. | Explicit database approval record capturing `approved_by` user ID, exact timestamp, and draft version ID. |
| **Information Disclosure** | Cross-tenant data leakage between competing stores. | Server-derived `TenantContext`; composite foreign keys `(business_id, id)`; fail-closed PostgreSQL RLS (`FORCE ROW LEVEL SECURITY`). |
| **Denial of Service** | Malicious user spams AI generation endpoints to exhaust budgets. | Distributed sliding-window rate limiting per IP and per tenant; maximum monthly AI analysis quotas tracked in cache. |
| **Elevation of Privilege** | Staff member attempts to approve campaign or view audit logs. | Server Action authorization wrapper (`requireTenantRole(['owner'])`) re-verifies permissions against the database. |
