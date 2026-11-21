# BIZORA — MULTI-TENANT ISOLATION & ROW-LEVEL SECURITY (RLS) DESIGN

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Engine:** PostgreSQL 16+ on Neon Serverless with Drizzle ORM  

---

## 1. Isolation Philosophy: Defense-in-Depth

Bizora enforces a **five-layer defense-in-depth model** to guarantee zero cross-tenant data leakage. In a multi-tenant business recovery platform holding sensitive customer transaction histories, customer contact details, and financial quotations, single-layer application-level filtering (`where(eq(table.businessId, id))`) is considered unacceptable as a sole defense.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: CLIENT SESSION SEAL                                                │
│ Encrypted iron-session cookie containing verified { userId, businessId, role }│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: SERVER ACTION / API GATEWAY CONTEXT                                │
│ Middleware validates session, extracts tenant context, checks RBAC          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: ORM QUERY INJECTION                                                │
│ Drizzle query builder automatically scopes queries to business_id           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: DATABASE TRANSACTION SESSION VARIABLE                              │
│ db.transaction() sets SET LOCAL app.current_tenant_id = $businessId         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: POSTGRESQL KERNEL ROW-LEVEL SECURITY (RLS)                         │
│ Engine rejects any row where business_id != current_setting(...)            │
│ Enforced via FORCE ROW LEVEL SECURITY                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PostgreSQL Row-Level Security Implementation

### 2.1 The Fail-Closed Principle
If a developer executes a raw SQL query or forgets to include `WHERE business_id = ...`, or if an ORM bug omits the tenant filter, the database engine **must fail closed** (return 0 rows or throw a permission error).

Under standard PostgreSQL RLS, if `app.current_tenant_id` is unset or empty, `current_setting('app.current_tenant_id', true)` evaluates to `NULL`. The comparison `business_id = NULL` evaluates to `UNKNOWN` in SQL 3-valued logic, which RLS treats as `FALSE`. Consequently, **zero rows are returned to unauthorized queries**.

### 2.2 RLS Setup DDL

```sql
-- Step 1: Revoke direct table permissions from public/unprivileged roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO bizora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bizora_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM bizora_app;
REVOKE UPDATE, DELETE, TRUNCATE ON ai_audit_logs FROM bizora_app;

-- Step 2: Helper function for fail-safe tenant extraction
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 3: Enforce RLS on all tenant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'customers', 'transactions', 'transaction_items',
            'quotations', 'quotation_items', 'import_batches',
            'raw_import_rows', 'recovery_campaigns', 'recovery_drafts',
            'communication_handoffs', 'audit_events', 'ai_audit_logs'
          )
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        -- Force RLS even for table owners (crucial for security)
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
        
        -- Drop existing policy if present
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', t);
        
        -- Create strict isolation policy
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I
             FOR ALL
             TO bizora_app
             USING (business_id = current_tenant_id())
             WITH CHECK (business_id = current_tenant_id());',
            t
        );
    END LOOP;
END $$;
```

---

## 3. Database Connection Pooling & Transaction Boundary Mechanics

### 3.1 The Stateless HTTP Driver Risk
When using Neon Serverless with the stateless HTTP driver (`neon()`), individual SQL statements are posted over HTTP. A statement like:
```sql
SELECT set_config('app.current_tenant_id', '...', true);
```
executes in a temporary connection that terminates immediately. The subsequent query runs in an entirely separate database backend where `app.current_tenant_id` is `NULL`.

### 3.2 The WebSocket Pooler Solution
To ensure absolute transaction isolation, Bizora uses the **WebSocket pooler driver** (`@neondatabase/serverless` via `new Pool(...)`) with Drizzle ORM.

Every tenant query is wrapped in an interactive database transaction:
```typescript
// src/lib/db/tenant-context.ts
import { db } from "./index";
import { sql } from "drizzle-orm";

export async function withTenantContext<T>(
  businessId: string,
  operation: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  // Validate UUID structure to prevent SQL injection in session setting
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(businessId)) {
    throw new Error("Invalid business_id UUID format");
  }

  return await db.transaction(async (tx) => {
    // SET LOCAL scopes the setting strictly to this transaction block.
    // The third parameter 'true' means it only applies to the current transaction.
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${businessId}, true);`
    );

    return await operation(tx);
  });
}
```

### 3.3 Guarantees of `SET LOCAL`
1. **Transaction Lifetime:** When the transaction completes (`COMMIT` or `ROLLBACK`), the connection pooler cleans or resets the session state. `app.current_tenant_id` ceases to exist.
2. **Zero Cross-Connection Bleed:** Even if the underlying PgBouncer connection is returned to the pool, the setting does not survive transaction termination.
3. **Concurrent Isolation:** Two simultaneous transactions on different threads or serverless invocations setting different `business_id` values run in completely isolated backend sessions.

---

## 4. Background Job & Worker Tenant Scoping

Background jobs executed via BullMQ (e.g. processing a 50,000-line CSV import or batch generating recovery drafts) operate outside of incoming user HTTP request lifecycles.

### 4.1 Strict Job Payload Envelope
Every BullMQ job payload must contain an immutable tenant context:
```typescript
interface TenantJobPayload<TData> {
  businessId: string;
  triggeredByUserId: string;
  data: TData;
}
```

### 4.2 Worker Execution Harness
The worker runtime wraps every job handler inside `withTenantContext`:
```typescript
// src/workers/import-worker.ts
import { Worker } from "bullmq";
import { withTenantContext } from "@/lib/db/tenant-context";

export const importWorker = new Worker(
  "import-queue",
  async (job) => {
    const { businessId, triggeredByUserId, data } = job.data;
    
    return await withTenantContext(businessId, async (tx) => {
      // All Drizzle queries inside this block execute with RLS active
      return await processImportBatch(tx, data);
    });
  },
  { connection: redisConnection }
);
```
If a worker attempts to process an import without wrapping it in `withTenantContext`, all queries fail closed with 0 rows affected or RLS violations.

---

## 5. Composite Foreign Key Constraint Protection

RLS protects against query-time unauthorized reads and writes. To prevent relational corruption (e.g. an attacker linking a Quote from Business A to a Customer from Business B), all foreign key constraints are **compound foreign keys**:

```sql
-- Validates that the customer_id referenced actually belongs to the SAME business_id
ALTER TABLE quotations
ADD CONSTRAINT fk_quotations_customer_same_tenant
FOREIGN KEY (business_id, customer_id)
REFERENCES customers (business_id, id)
ON DELETE SET NULL;
```
If an application error attempts to insert a record where `quotation.business_id = 'A'` and `quotation.customer_id = 'B-customer'`, the PostgreSQL foreign key engine rejects the write at the constraint verification level, independent of RLS.

---

## 6. Verification & Automated Test Suite

Every pull request runs automated RLS verification tests:
1. **Test 1 (Positive Isolation):** Set `app.current_tenant_id = 'tenant-A'`, insert customer, query customers $\rightarrow$ returns 1 customer.
2. **Test 2 (Cross-Tenant Rejection):** With session set to `'tenant-B'`, query customers $\rightarrow$ returns 0 customers.
3. **Test 3 (Fail-Closed Unauthenticated):** Execute query with no session variable set $\rightarrow$ returns 0 customers.
4. **Test 4 (Composite Foreign Key Violation):** Attempt to insert `transaction` with `business_id = 'tenant-A'` and `customer_id` belonging to `'tenant-B'` $\rightarrow$ throws Postgres foreign key violation error `23503`.
