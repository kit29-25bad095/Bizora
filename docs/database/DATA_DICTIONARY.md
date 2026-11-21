# BIZORA — RELATIONAL DATA DICTIONARY & FIELD SPECIFICATIONS

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Database Engine:** PostgreSQL 16+ on Neon Serverless  

---

## 1. Global Field Standards & Conventions

1. **Identifiers:** All entity IDs are UUIDv4 generated via `gen_random_uuid()`.
2. **Timestamps:** All temporal fields are stored as `TIMESTAMPTZ` (UTC ISO 8601).
3. **Monetary Amounts:** Stored as `BIGINT` representing the minor unit (e.g., cents, pence, fils). Never floating point. Accompanied by ISO 4217 `currency` (3 uppercase characters) and `currency_exponent` (default 2; 0 for JPY, 3 for BHD/KWD).
4. **Strings & Text:** Constrained `VARCHAR(N)` used for indexed codes and identifiers; `TEXT` used for unbounded prose, JSON summaries, and logs.
5. **Auditing Fields:** `created_at` defaults to `NOW()`. Tables with mutable state include `updated_at`. Append-only tables omit `updated_at`.

---

## 2. Table-by-Table Data Dictionary

### 2.1 Table: `businesses` (Tenants)
*Purpose:* Represents the root tenant entity (small business organization).

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | `PRIMARY KEY` | Unique identifier for the business tenant. |
| `name` | `VARCHAR(255)` | NO | None | Min length 2 | Official trading name of the business. |
| `slug` | `VARCHAR(100)` | NO | None | `UNIQUE`, regex `^[a-z0-9-]+$` | URL-safe identifier for tenant routing. |
| `industry` | `VARCHAR(50)` | NO | `'retail'` | In: `retail`, `ecommerce`, `wholesale`, `quotations` | Primary industry archetype governing recovery rules. |
| `base_currency` | `VARCHAR(3)` | NO | `'USD'` | ISO 4217 alpha-3 code | Primary currency for financial rollups and reporting. |
| `currency_exponent` | `SMALLINT` | NO | `2` | Range: `0` to `4` | Decimal exponent for base currency (e.g. 2 for USD, 0 for JPY). |
| `timezone` | `VARCHAR(50)` | NO | `'UTC'` | Valid IANA timezone | Tenant local timezone for cohort and daily sales rollups. |
| `subscription_tier` | `VARCHAR(50)` | NO | `'pilot_standard'` | In: `pilot_free`, `pilot_standard`, `enterprise` | Current billing/access tier. |
| `status` | `VARCHAR(20)` | NO | `'active'` | In: `active`, `suspended`, `archived` | Operational state of the business account. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Timestamp of account registration. |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Auto-updated on write | Timestamp of last metadata update. |

---

### 2.2 Table: `users` (Global Identity)
*Purpose:* Global user credentials and profile details.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | `PRIMARY KEY` | Global unique identifier for the user. |
| `email` | `VARCHAR(255)` | NO | None | `UNIQUE`, valid RFC 5322 email | Lowercase login email address. |
| `password_hash` | `VARCHAR(255)` | NO | None | Argon2id hash format | Encrypted password hash ($argon2id$v=19$...). |
| `full_name` | `VARCHAR(150)` | NO | None | Min length 1 | User's display name. |
| `status` | `VARCHAR(20)` | NO | `'active'` | In: `active`, `inactive`, `locked` | Account security status. |
| `last_login_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp of most recent authenticated session. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Registration timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Auto-updated | Profile modification timestamp. |

---

### 2.3 Table: `business_users` (Memberships & RBAC)
*Purpose:* Links users to businesses with explicit roles.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant foreign key. Part of composite PK. |
| `user_id` | `UUID` | NO | None | `FK -> users(id)` | User foreign key. Part of composite PK. |
| `role` | `VARCHAR(20)` | NO | None | In: `owner`, `manager`, `analyst` | Role-Based Access Control level. |
| `is_active` | `BOOLEAN` | NO | `TRUE` | | Membership status toggle. |
| `invited_at` | `TIMESTAMPTZ` | NO | `NOW()` | | Timestamp when membership was created. |
| `joined_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp when invitation was accepted. |

---

### 2.4 Table: `customers`
*Purpose:* Customer master record within a business tenant.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique customer identifier within tenant. |
| `external_customer_id` | `VARCHAR(100)` | YES | `NULL` | | Source system customer reference. |
| `name` | `VARCHAR(255)` | NO | None | Min length 1 | Customer individual or corporate name. |
| `email` | `VARCHAR(255)` | YES | `NULL` | Valid email if present | Contact email for recovery communication. |
| `phone` | `VARCHAR(50)` | YES | `NULL` | E.164 format normalized | Contact phone for WhatsApp recovery handoffs. |
| `tags` | `TEXT[]` | NO | `'{}'` | | Categorization tags (e.g. VIP, Wholesale). |
| `first_seen_at` | `TIMESTAMPTZ` | NO | `NOW()` | | Timestamp of first recorded transaction or quote. |
| `last_activity_at` | `TIMESTAMPTZ` | NO | `NOW()` | | Timestamp of most recent activity. Used for churn detection. |
| `total_spend_minor_units`| `BIGINT` | NO | `0` | $\ge 0$ | Cumulative customer spend in base currency minor units. |
| `total_orders` | `INTEGER` | NO | `0` | $\ge 0$ | Cumulative completed transactions count. |
| `status` | `VARCHAR(20)` | NO | `'active'` | In: `active`, `inactive`, `churned`, `archived` | Lifecycle status. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Auto-updated | Record modification timestamp. |

---

### 2.5 Table: `transactions`
*Purpose:* Completed sales transactions and orders.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique transaction identifier. |
| `customer_id` | `UUID` | YES | `NULL` | `FK -> customers(b_id, id)` | Associated customer. Nullable if guest purchase. Restrict on delete. |
| `external_transaction_id`| `VARCHAR(100)` | YES | `NULL` | | Invoice # or Receipt # from source import. Primary deduplication key. |
| `import_batch_id` | `UUID` | YES | `NULL` | `FK -> import_batches(b_id, id)` | Ingestion batch that created this record. Null if manual. |
| `transaction_date` | `TIMESTAMPTZ` | NO | None | | Effective timestamp when purchase occurred. |
| `gross_amount_minor_units`| `BIGINT` | NO | None | | Total sale value before discounts and returns. |
| `discount_amount_minor_units`| `BIGINT` | NO | `0` | $\ge 0$ | Discounts and promotional deductions applied. |
| `tax_amount_minor_units`| `BIGINT` | NO | `0` | $\ge 0$ | Sales tax / VAT included in transaction. |
| `net_amount_minor_units`| `BIGINT` | NO | None | | Gross amount minus discounts. |
| `refunded_amount_minor_units`| `BIGINT` | NO | `0` | $\ge 0$ | Cumulative refunded amount for partial returns. |
| `amount_minor_units` | `BIGINT` | NO | None | | Settled net amount in currency minor units (net_amount - refunded_amount). |
| `currency` | `VARCHAR(3)` | NO | None | ISO 4217 alpha-3 | Currency of this transaction. |
| `currency_exponent` | `SMALLINT` | NO | `2` | Range: `0` to `4` | Decimal exponent for minor-unit conversion. |
| `status` | `VARCHAR(30)` | NO | `'completed'` | In: `completed`, `refunded`, `cancelled` | Order status. |
| `settlement_status` | `VARCHAR(30)` | NO | `'settled'` | In: `pending`, `settled`, `disputed` | Payment settlement status in gateway/bank. |
| `payment_channel` | `VARCHAR(50)` | YES | `NULL` | In: `pos`, `online`, `bank_transfer`, `cash` | Sales channel. |
| `raw_payload` | `JSONB` | YES | `NULL` | | Stored raw import row for reconciliation. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Ingestion timestamp. |

---

### 2.6 Table: `quotations`
*Purpose:* Customer price estimates, quotes, and commercial proposals.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique quote identifier. |
| `customer_id` | `UUID` | YES | `NULL` | `FK -> customers(b_id, id)` | Target customer for quote. Restrict on delete. |
| `external_quote_id` | `VARCHAR(100)` | YES | `NULL` | | Source system reference number. |
| `quote_number` | `VARCHAR(100)` | NO | None | Min length 1 | User-facing quote number (e.g. Q-2026-001). |
| `issued_date` | `TIMESTAMPTZ` | NO | None | | Date quote was provided to customer. |
| `valid_until_date` | `TIMESTAMPTZ` | NO | None | `valid_until_date >= issued_date` | Date quote validity lapses. Recovery target if open. |
| `sent_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp quote transmission was recorded. |
| `sent_channel` | `VARCHAR(30)` | YES | `NULL` | In: `whatsapp`, `email`, `in_person`, `portal` | Delivery channel used. |
| `amount_minor_units` | `BIGINT` | NO | None | $\ge 0$ | Total proposed value in minor units. |
| `currency` | `VARCHAR(3)` | NO | None | ISO 4217 alpha-3 | Quote currency. |
| `currency_exponent` | `SMALLINT` | NO | `2` | Range: `0` to `4` | Minor-unit exponent. |
| `status` | `VARCHAR(30)` | NO | `'draft'` | In: `draft`, `sent`, `accepted`, `rejected`, `expired` | Canonical lifecycle state. |
| `probability_percentage`| `SMALLINT` | YES | `50` | Range: `0` to `100` | Estimated likelihood of conversion. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Ingestion timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Auto-updated | Status change timestamp. |

---

### 2.7 Table: `import_batches`
*Purpose:* Ingestion audit, mapping, and 24-hour rollback metadata.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique batch identifier. |
| `uploaded_by_user_id` | `UUID` | NO | None | `FK -> users(id)` | User who initiated the upload. |
| `file_name` | `VARCHAR(255)` | NO | None | | Original file name uploaded. |
| `file_size_bytes` | `BIGINT` | NO | None | $\le 52428800$ (50MB) | File size on storage. |
| `storage_path` | `VARCHAR(500)` | NO | None | S3 key format | Path in Cloudflare R2 / S3 storage. |
| `source_type` | `VARCHAR(50)` | NO | None | In: `retail_csv`, `quote_xlsx`, etc. | Declared format schema. |
| `column_mapping` | `JSONB` | NO | None | Schema validated | Applied header-to-field mapping dict. |
| `total_rows` | `INTEGER` | NO | `0` | $\ge 0$ | Total lines in uploaded file. |
| `processed_rows` | `INTEGER` | NO | `0` | $\ge 0$ | Rows parsed and processed. |
| `successful_rows` | `INTEGER` | NO | `0` | $\ge 0$ | Rows successfully committed. |
| `duplicate_rows` | `INTEGER` | NO | `0` | $\ge 0$ | Rows identified as duplicates. |
| `failed_rows` | `INTEGER` | NO | `0` | $\ge 0$ | Rows discarded due to parse errors. |
| `status` | `VARCHAR(30)` | NO | `'uploaded'` | In: `uploaded`, `processing`, `completed`, `failed`, `rolled_back` | Processing status. |
| `error_summary` | `TEXT` | YES | `NULL` | | Aggregated parsing error details. |
| `started_at` | `TIMESTAMPTZ` | YES | `NULL` | | Execution start timestamp. |
| `completed_at` | `TIMESTAMPTZ` | YES | `NULL` | | Execution end timestamp. |
| `rollback_expires_at` | `TIMESTAMPTZ` | NO | None | Exactly `started_at + INTERVAL '24 hours'` | Cutoff time after which rollback is blocked. |
| `rolled_back_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp of rollback execution if triggered. |
| `rolled_back_by_user_id`| `UUID` | YES | `NULL` | `FK -> users(id)` | User who authorized rollback. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Upload timestamp. |

---

### 2.8 Table: `recovery_drafts`
*Purpose:* AI-synthesized recovery messages requiring human approval.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique draft message ID. |
| `campaign_id` | `UUID` | YES | `NULL` | `FK -> campaigns(b_id, id)` | Optional campaign group. |
| `customer_id` | `UUID` | NO | None | `FK -> customers(b_id, id)` | Target customer for recovery. |
| `quotation_id` | `UUID` | YES | `NULL` | `FK -> quotations(b_id, id)` | Relevant quote if follow-up. |
| `suggested_channel` | `VARCHAR(30)` | NO | None | In: `whatsapp`, `email` | Recommended dispatch mechanism. |
| `recipient_identifier` | `VARCHAR(150)` | NO | None | E.164 phone or email | Sanitized recipient address. |
| `draft_subject` | `VARCHAR(255)` | YES | `NULL` | | Subject line (required for email). |
| `draft_body` | `TEXT` | NO | None | Min length 10 | Complete proposed message text. |
| `ai_rationale` | `TEXT` | NO | None | | AI explanation of opportunity/timing. |
| `ai_risk_score` | `SMALLINT` | NO | None | Range: `1` to `100` | Inactivity/churn severity metric. |
| `ai_prompt_version` | `VARCHAR(50)` | NO | None | | Pinned prompt template identifier. |
| `status` | `VARCHAR(30)` | NO | `'pending_approval'` | In: `pending_approval`, `approved`, `rejected`, `expired` | Governance state. |
| `approved_by_user_id` | `UUID` | YES | `NULL` | `FK -> users(id)` | Approver (must have `owner` role). |
| `approved_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp of explicit approval. |
| `rejected_by_user_id` | `UUID` | YES | `NULL` | `FK -> users(id)` | Rejecting user. |
| `rejected_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp of rejection. |
| `rejection_reason` | `TEXT` | YES | `NULL` | | Optional feedback on rejection. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Generation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Auto-updated | Status change timestamp. |

---

### 2.9 Table: `communication_handoffs`
*Purpose:* Client-side action execution log (`wa.me` / `mailto:`).

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | Part of composite PK | Unique handoff event ID. |
| `draft_id` | `UUID` | NO | None | `FK -> drafts(b_id, id)` | Approved draft referenced. |
| `customer_id` | `UUID` | NO | None | `FK -> customers(b_id, id)` | Recipient customer. |
| `channel` | `VARCHAR(30)` | NO | None | In: `whatsapp`, `email` | Channel used. |
| `handoff_url` | `TEXT` | NO | None | `https://wa.me/...` or `mailto:...` | Exact sanitized URI handed to client browser. |
| `initiated_by_user_id` | `UUID` | NO | None | `FK -> users(id)` | User who clicked the handoff button. |
| `handoff_initiated_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Timestamp client launched external app. |
| `user_confirmed_outcome`| `VARCHAR(50)` | NO | `'unconfirmed'` | In: `unconfirmed`, `sent_confirmed`, `customer_replied`, `cancelled` | Self-reported status. |
| `outcome_recorded_at` | `TIMESTAMPTZ` | YES | `NULL` | | Timestamp user recorded confirmation. |

---

### 2.10 Table: `audit_events`
*Purpose:* Immutable, tamper-evident cryptographic audit ledger.

| Column Name | PostgreSQL Type | Nullable | Default | Constraints / Validation | Description & Rules |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `business_id` | `UUID` | NO | None | `FK -> businesses(id)` | Tenant partition key. Part of composite PK. |
| `sequence_number` | `BIGINT` | NO | None | Monotonic counter | Strictly increasing sequence per tenant. Part of PK. |
| `id` | `UUID` | NO | `gen_random_uuid()` | `UNIQUE (business_id, id)` | Universal event identifier. |
| `user_id` | `UUID` | YES | `NULL` | `FK -> users(id)` | Actor who initiated action. NULL if system job. |
| `action` | `VARCHAR(100)` | NO | None | Standard action token | Format: `domain.entity.action` (e.g. `recovery.draft.approve`). |
| `entity_type` | `VARCHAR(50)` | NO | None | | Affected entity table name. |
| `entity_id` | `UUID` | NO | None | | Primary key ID of affected record. |
| `metadata` | `JSONB` | NO | `'{}'` | | Canonicalized state delta and audit context. |
| `ip_address` | `INET` | YES | `NULL` | | Client IP address. |
| `user_agent` | `TEXT` | YES | `NULL` | | Client browser / device agent string. |
| `previous_hash` | `VARCHAR(64)` | NO | None | 64-char hex string | SHA-256 hash of previous sequence event. |
| `event_hash` | `VARCHAR(64)` | NO | None | 64-char hex string | SHA-256 hash of this event's canonical fields + previous_hash. |
| `created_at` | `TIMESTAMPTZ` | NO | `NOW()` | Read-only | Exact timestamp of event occurrence. |

---

## 3. Data Retention & Archival Policies

1. **Transactional Data (`transactions`, `quotations`):** Retained indefinitely for the lifetime of the tenant subscription. If a tenant terminates, data is soft-archived for 90 days before permanent deletion.
2. **Staging Ingestion Data (`raw_import_rows`):** Truncated or deleted 30 days after successful batch completion to conserve database storage. The original uploaded file remains archived in S3/R2 storage.
3. **Audit Ledger (`audit_events`):** Retained for a mandatory minimum of 7 years in compliance with enterprise financial record-keeping standards. Daily chain-head hashes are snapshotted to WORM object storage.
4. **AI Audit Logs (`ai_audit_logs`):** Full prompt contexts retained for 90 days for operational debugging; token counts and metadata retained indefinitely.
