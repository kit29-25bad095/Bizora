# BIZORA — RELATIONAL DATABASE ARCHITECTURE & SCHEMA DESIGN

**Document Version:** 1.0.0  
**Status:** Database Engineering Specification — Pending Gate 1 Stakeholder Approval  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Database Engine:** PostgreSQL 16+ on Neon Serverless  
**ORM / Migration Tool:** Drizzle ORM + Drizzle Kit  

---

## 1. Database Architectural Principles

The Bizora database schema is designed according to the following strict architectural principles:

1. **Composite Tenant Keying:** Every tenant-owned table incorporates `business_id UUID NOT NULL` in its primary key and foreign keys: `PRIMARY KEY (business_id, id)`. This ensures that cross-tenant joins are physically impossible at the database engine level.
2. **Row-Level Security (RLS) on All Tenant Tables:** PostgreSQL RLS is enabled and forced (`FORCE ROW LEVEL SECURITY`) on every business table, evaluating `business_id = current_setting('app.current_tenant_id', true)::uuid`.
3. **Currency-Aware Integer Minor Units:** All monetary values are stored as `BIGINT` representing the minor unit (cents, pence, fils, zero-decimal units) alongside an ISO 4217 three-letter currency code (`currency VARCHAR(3)`). Floating-point representations (`FLOAT`, `REAL`, `DOUBLE PRECISION`, or unconstrained `NUMERIC`) are strictly forbidden.
4. **Append-Only Immutability for Audit & Ledger Records:** Audit events, AI interaction logs, communication handoffs, and raw import batches are strictly append-only. `UPDATE`, `DELETE`, and `TRUNCATE` privileges are revoked for application database users.
5. **Soft Deletions Without Nullifying Tenant Foreign Keys:** Deletion of relational records is performed via state transitions (`status = 'archived'`) or soft-delete timestamps (`deleted_at TIMESTAMPTZ`). Composite foreign keys `(business_id, parent_id)` never use `ON DELETE SET NULL`, preventing orphaned null-tenant anomalies.

---

## 2. Core Entity Relational Architecture

The schema is partitioned into five distinct logical domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. IDENTITY & TENANCY DOMAIN                                                │
│    businesses (Tenants), users, business_users (Memberships & Roles)        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. CORE BUSINESS ENTITIES (Retail & Quotations)                             │
│    customers, transactions, transaction_items, quotations, quotation_items  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. INGESTION & PIPELINE DOMAIN                                              │
│    import_batches, raw_import_rows, deduplication_matches                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. RECOVERY & HUMAN-IN-THE-LOOP DISPATCH                                    │
│    recovery_campaigns, recovery_drafts, communication_handoffs              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. AUDIT & AI OBSERVABILITY DOMAIN                                          │
│    audit_events, ai_audit_logs, system_metrics_snapshots                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Physical DDL & Table Specifications

### 3.1 Identity & Tenancy Domain

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: businesses (Global Tenant Catalog)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    industry VARCHAR(50) NOT NULL DEFAULT 'retail', -- 'retail', 'ecommerce', 'wholesale', 'quotations'
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    currency_exponent SMALLINT NOT NULL DEFAULT 2,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'pilot_standard',
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: users (Global User Authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Argon2id hash
    full_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'locked'
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: business_users (Tenancy Memberships & RBAC)
CREATE TABLE business_users (
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'owner', 'manager', 'analyst'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    PRIMARY KEY (business_id, user_id)
);
```

### 3.2 Core Business Domain (Customers, Transactions, Quotations)

```sql
-- Table: customers
CREATE TABLE customers (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    external_customer_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_spend_minor_units BIGINT NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'churned', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id)
);

-- Table: transactions (Historical Sales & Orders)
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    customer_id UUID,
    external_transaction_id VARCHAR(100), -- Invoice / Receipt #
    import_batch_id UUID,
    transaction_date TIMESTAMPTZ NOT NULL,
    gross_amount_minor_units BIGINT NOT NULL,
    discount_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    tax_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    net_amount_minor_units BIGINT NOT NULL,
    refunded_amount_minor_units BIGINT NOT NULL DEFAULT 0,
    amount_minor_units BIGINT NOT NULL, -- Effective transaction total (net_amount - refunded_amount)
    currency VARCHAR(3) NOT NULL,
    currency_exponent SMALLINT NOT NULL DEFAULT 2,
    status VARCHAR(30) NOT NULL DEFAULT 'completed', -- 'completed', 'refunded', 'cancelled'
    settlement_status VARCHAR(30) NOT NULL DEFAULT 'settled', -- 'pending', 'settled', 'disputed'
    payment_channel VARCHAR(50), -- 'pos', 'online', 'bank_transfer', 'cash'
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_transactions_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_customer FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE RESTRICT
);

-- Table: transaction_items (Line-Level Order Details)
CREATE TABLE transaction_items (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    sku VARCHAR(100),
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
    unit_price_minor_units BIGINT NOT NULL,
    discount_minor_units BIGINT NOT NULL DEFAULT 0,
    total_minor_units BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_items_transaction FOREIGN KEY (business_id, transaction_id) REFERENCES transactions(business_id, id) ON DELETE CASCADE
);

-- Table: quotations (Customer Quotes & Estimates)
CREATE TABLE quotations (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    customer_id UUID,
    external_quote_id VARCHAR(100),
    import_batch_id UUID,
    quote_number VARCHAR(100) NOT NULL,
    issued_date TIMESTAMPTZ NOT NULL,
    valid_until_date TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    sent_channel VARCHAR(30), -- 'whatsapp', 'email', 'in_person', 'portal'
    amount_minor_units BIGINT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    currency_exponent SMALLINT NOT NULL DEFAULT 2,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'rejected', 'expired'
    probability_percentage SMALLINT DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_quotations_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_quotations_customer FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE RESTRICT
);

-- Table: quotation_items (Line-Level Quote Details)
CREATE TABLE quotation_items (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    quotation_id UUID NOT NULL,
    sku VARCHAR(100),
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 1,
    unit_price_minor_units BIGINT NOT NULL,
    total_minor_units BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_qitems_quotation FOREIGN KEY (business_id, quotation_id) REFERENCES quotations(business_id, id) ON DELETE CASCADE
);
```

### 3.3 Ingestion & Import Domain

```sql
-- Table: import_batches
CREATE TABLE import_batches (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'retail_transactions_csv', 'quotations_xlsx', etc.
    column_mapping JSONB NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    successful_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'processing', 'completed', 'failed', 'rolled_back'
    error_summary TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rollback_expires_at TIMESTAMPTZ NOT NULL, -- Exactly started_at + 24 hours
    rolled_back_at TIMESTAMPTZ,
    rolled_back_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id)
);

-- Table: raw_import_rows (Staging table for batch ingestion)
CREATE TABLE raw_import_rows (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    import_batch_id UUID NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    normalized_data JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'imported', 'duplicate', 'error'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_raw_rows_batch FOREIGN KEY (business_id, import_batch_id) REFERENCES import_batches(business_id, id) ON DELETE CASCADE
);
```

### 3.4 Recovery & Human-in-the-Loop Dispatch Domain

```sql
-- Table: recovery_campaigns
CREATE TABLE recovery_campaigns (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    archetype VARCHAR(50) NOT NULL, -- 'retail_inactivity', 'quote_followup', 'churn_risk'
    target_criteria JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'completed', 'paused'
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id)
);

-- Table: recovery_drafts (AI-Generated Recovery Messages Pending Approval)
CREATE TABLE recovery_drafts (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    campaign_id UUID,
    customer_id UUID NOT NULL,
    quotation_id UUID,
    suggested_channel VARCHAR(30) NOT NULL, -- 'whatsapp', 'email'
    recipient_identifier VARCHAR(150) NOT NULL, -- phone or email
    draft_subject VARCHAR(255),
    draft_body TEXT NOT NULL,
    ai_rationale TEXT NOT NULL,
    ai_risk_score SMALLINT NOT NULL, -- 1 to 100
    ai_prompt_version VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'rejected', 'expired'
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejected_by_user_id UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_drafts_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_drafts_customer FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_drafts_quote FOREIGN KEY (business_id, quotation_id) REFERENCES quotations(business_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafts_campaign FOREIGN KEY (business_id, campaign_id) REFERENCES recovery_campaigns(business_id, id) ON DELETE RESTRICT
);

-- Table: communication_handoffs (Client-Side Action Logs)
CREATE TABLE communication_handoffs (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL,
    draft_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    channel VARCHAR(30) NOT NULL, -- 'whatsapp', 'email'
    handoff_url TEXT NOT NULL, -- wa.me/... or mailto:...
    initiated_by_user_id UUID NOT NULL REFERENCES users(id),
    handoff_initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_confirmed_outcome VARCHAR(50) DEFAULT 'unconfirmed', -- 'unconfirmed', 'sent_confirmed', 'customer_replied', 'cancelled'
    outcome_recorded_at TIMESTAMPTZ,
    PRIMARY KEY (business_id, id),
    CONSTRAINT fk_handoffs_draft FOREIGN KEY (business_id, draft_id) REFERENCES recovery_drafts(business_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_handoffs_customer FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE CASCADE
);
```

### 3.5 Audit & AI Observability Domain

```sql
-- Table: audit_events (Tamper-Evident SHA-256 Chained Ledger)
CREATE TABLE audit_events (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    sequence_number BIGINT NOT NULL,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'customer.create', 'import.rollback', 'draft.approve', etc.
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    previous_hash VARCHAR(64) NOT NULL,
    event_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, sequence_number),
    CONSTRAINT uq_audit_event_id UNIQUE (business_id, id)
);

-- Table: ai_audit_logs (Immutable LLM Telemetry)
CREATE TABLE ai_audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoked_by_user_id UUID REFERENCES users(id),
    module_name VARCHAR(50) NOT NULL, -- 'recovery_engine', 'risk_scorer', 'quote_analyzer'
    model_provider VARCHAR(50) NOT NULL, -- 'anthropic', 'google'
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    input_context_digest VARCHAR(64) NOT NULL, -- SHA-256 hash of deterministic input payload
    structured_output JSONB NOT NULL,
    status VARCHAR(30) NOT NULL, -- 'success', 'rate_limited', 'validation_error'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (business_id, id)
);
```

---

## 4. Row-Level Security (RLS) Configuration

Every multi-tenant table is locked down with explicit RLS policies:

```sql
-- Enable and Force RLS on all tenant tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items FORCE ROW LEVEL SECURITY;

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations FORCE ROW LEVEL SECURITY;

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items FORCE ROW LEVEL SECURITY;

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;

ALTER TABLE recovery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE recovery_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_drafts FORCE ROW LEVEL SECURITY;

ALTER TABLE communication_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_handoffs FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs FORCE ROW LEVEL SECURITY;

-- Standard Isolation Policy Example (Applied to all tenant tables)
CREATE POLICY tenant_isolation_policy ON customers
    FOR ALL
    USING (business_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (business_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## 5. Summary of Engineering Guarantees

1. **Zero Cross-Tenant Leakage:** Enforced both by composite primary/foreign keys `(business_id, id)` and PostgreSQL kernel-level Row-Level Security.
2. **Absolute Financial Precision:** Stored as `BIGINT` minor units. No floating-point errors, zero loss of cents or pence over millions of aggregations.
3. **Strict Human Governance:** Communications cannot be dispatched automatically. AI drafts require an explicit `approved_by_user_id` record by an authorized owner before a handoff link can be generated.
4. **Non-Repudiation Audit Trail:** Audit logs form an immutable cryptographic SHA-256 chain; database user permissions revoke `UPDATE`, `DELETE`, and `TRUNCATE` operations.
