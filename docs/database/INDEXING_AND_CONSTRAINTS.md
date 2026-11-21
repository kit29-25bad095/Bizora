# BIZORA — INDEXING STRATEGY, CONSTRAINTS & PERFORMANCE OPTIMIZATION

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Database Engine:** PostgreSQL 16+ on Neon Serverless  

---

## 1. Indexing Philosophy & Query Patterns

In a multi-tenant relational system, queries almost universally include `business_id` in their `WHERE` predicates. Consequently, single-column indexes on secondary fields (e.g. indexing `customer_id` alone) are suboptimal because the database engine must merge index bitmaps.

Bizora enforces the following indexing rules:
1. **Tenant-Leading Composite Indexes:** Every secondary index begins with `business_id` as the leading column (e.g., `(business_id, transaction_date DESC)`).
2. **Partial Indexes for Active / State-Filtered Queries:** Avoid indexing cold, terminal records (e.g. indexing only `status = 'pending_approval'` for recovery drafts, or `status = 'open'` for active quotes).
3. **GIN Indexing for Semi-Structured Search:** Use Generalized Inverted Indexes (GIN) with `jsonb_path_ops` for high-throughput searching over raw import payloads or audit event metadata.
4. **BRIN Indexing for Append-Only Time-Series:** Block Range Indexes (BRIN) on `audit_events(created_at)` achieve 99% space reduction compared to B-Trees for sequential time-series logs.

---

## 2. Table-by-Table Index Specifications

### 2.1 Table: `businesses` & `users`
```sql
-- Global tenant lookup by slug
CREATE UNIQUE INDEX idx_businesses_slug ON businesses(slug);

-- User authentication by lowercase email
CREATE UNIQUE INDEX idx_users_email_lower ON users(LOWER(email));
```

### 2.2 Table: `customers`
```sql
-- Fast customer search within a business tenant
CREATE INDEX idx_customers_tenant_search 
ON customers(business_id, name, phone, email);

-- Inactivity & churn detection (queries sorting by last activity)
CREATE INDEX idx_customers_inactivity 
ON customers(business_id, last_activity_at ASC) 
WHERE status = 'active';

-- VIP / High-value customer ranking
CREATE INDEX idx_customers_high_value 
ON customers(business_id, total_spend_minor_units DESC);

-- External customer deduplication lookup
CREATE UNIQUE INDEX uq_customers_external_id 
ON customers(business_id, external_customer_id) 
WHERE external_customer_id IS NOT NULL;
```

### 2.3 Table: `transactions`
```sql
-- Primary analytical timeline index (Cohort & Sales Analysis)
CREATE INDEX idx_transactions_tenant_date 
ON transactions(business_id, transaction_date DESC);

-- Customer transaction history lookup
CREATE INDEX idx_transactions_customer_history 
ON transactions(business_id, customer_id, transaction_date DESC);

-- Import batch reconciliation
CREATE INDEX idx_transactions_batch 
ON transactions(business_id, import_batch_id);

-- Transaction deduplication: prevents duplicate external invoice insertion
CREATE UNIQUE INDEX uq_transactions_external_id 
ON transactions(business_id, external_transaction_id) 
WHERE external_transaction_id IS NOT NULL;
```

### 2.4 Table: `quotations`
```sql
-- Open quote follow-up queue (sorted by impending expiry)
CREATE INDEX idx_quotations_open_expiry 
ON quotations(business_id, expiry_date ASC) 
WHERE status = 'open';

-- Customer quotation history
CREATE INDEX idx_quotations_customer 
ON quotations(business_id, customer_id, issued_date DESC);

-- Deduplication of quote numbers
CREATE UNIQUE INDEX uq_quotations_quote_number 
ON quotations(business_id, quote_number);
```

### 2.5 Table: `recovery_drafts`
```sql
-- Owner review dashboard queue (pending approvals sorted by risk score)
CREATE INDEX idx_drafts_pending_review 
ON recovery_drafts(business_id, ai_risk_score DESC, created_at ASC) 
WHERE status = 'pending_approval';

-- Customer draft deduplication (prevents multiple open drafts for same customer)
CREATE UNIQUE INDEX uq_drafts_single_pending_per_customer 
ON recovery_drafts(business_id, customer_id) 
WHERE status = 'pending_approval';
```

### 2.6 Table: `communication_handoffs`
```sql
-- Handoff timeline per customer
CREATE INDEX idx_handoffs_customer_timeline 
ON communication_handoffs(business_id, customer_id, handoff_initiated_at DESC);

-- Draft verification lookup
CREATE INDEX idx_handoffs_draft 
ON communication_handoffs(business_id, draft_id);
```

### 2.7 Table: `audit_events`
```sql
-- Monotonic sequence traversal (Primary Key covers (business_id, sequence_number))

-- Fast entity audit trail lookup
CREATE INDEX idx_audit_entity_lookup 
ON audit_events(business_id, entity_type, entity_id, created_at DESC);

-- BRIN index on physical creation timestamp for chronological rollups
CREATE INDEX idx_audit_created_at_brin 
ON audit_events USING BRIN (created_at);

-- GIN index for metadata JSONB querying
CREATE INDEX idx_audit_metadata_gin 
ON audit_events USING GIN (metadata jsonb_path_ops);
```

---

## 3. High-Volume Partitioning Strategy

### 3.1 Audit Events & Ingestion Staging Tables
In production environments operating hundreds of tenants, tables such as `audit_events` and `raw_import_rows` accumulate millions of rows.

**Partitioning Architecture:**
- Partitioning Scheme: **Declarative Range Partitioning by `created_at`** (Monthly partitions).
- Benefits:
  1. **Instant Data Pruning:** Dropping expired staging data (`raw_import_rows` older than 30 days) is an $O(1)$ DDL operation (`DROP TABLE raw_import_rows_2026_01`), bypassing costly, lock-heavy `DELETE FROM` statements.
  2. **Query Performance:** Query planner performs partition pruning, scanning only the relevant monthly partition.
  3. **Storage Tiering:** Older historical partitions can be migrated to compressed read-only tablespaces or archived.

```sql
-- Declarative Partitioning Specification for audit_events
CREATE TABLE audit_events (
    business_id UUID NOT NULL,
    sequence_number BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    previous_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, created_at, sequence_number),
    CONSTRAINT uq_audit_event_id UNIQUE (business_id, created_at, id)
) PARTITION BY RANGE (created_at);

-- Example Monthly Partitions
CREATE TABLE audit_events_2026_01 PARTITION OF audit_events
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE audit_events_2026_02 PARTITION OF audit_events
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');
```

---

## 4. Database Maintenance & Index Health Policies

1. **Auto-Vacuum Optimization:** Neon PostgreSQL maintains automated background vacuuming. For high-churn ingestion tables (`import_batches`, `raw_import_rows`), the autovacuum scale factor is lowered:
   ```sql
   ALTER TABLE raw_import_rows SET (
       autovacuum_vacuum_scale_factor = 0.05,
       autovacuum_analyze_scale_factor = 0.02
   );
   ```
2. **Zero Table Locking during Migrations:** All index creations in production migrations utilize `CREATE INDEX CONCURRENTLY` via Drizzle Kit migration scripts.
3. **Index Bloat Monitoring:** Scheduled weekly diagnostic queries inspect `pg_stat_user_indexes` and `pg_stat_user_tables` to identify unused or bloated indexes.
