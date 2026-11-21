# BIZORA — ENTITY-RELATIONSHIP DIAGRAM (ERD)

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Engine:** Mermaid ERD Specification  

---

## 1. Visual Entity-Relationship Diagram

```mermaid
erDiagram
    businesses ||--o{ business_users : "employs"
    users ||--o{ business_users : "belongs_to"
    businesses ||--o{ customers : "owns"
    businesses ||--o{ transactions : "records"
    businesses ||--o{ quotations : "issues"
    businesses ||--o{ import_batches : "ingests"
    businesses ||--o{ recovery_campaigns : "configures"
    businesses ||--o{ recovery_drafts : "generates"
    businesses ||--o{ communication_handoffs : "logs"
    businesses ||--o{ audit_events : "audits"
    businesses ||--o{ ai_audit_logs : "tracks"

    customers ||--o{ transactions : "executes"
    customers ||--o{ quotations : "receives"
    customers ||--o{ recovery_drafts : "targeted_in"
    customers ||--o{ communication_handoffs : "recipient_of"

    transactions ||--|{ transaction_items : "contains"
    quotations ||--|{ quotation_items : "contains"
    quotations ||--o{ recovery_drafts : "associated_with"

    import_batches ||--o{ raw_import_rows : "chunks"
    import_batches ||--o{ transactions : "populates"
    import_batches ||--o{ quotations : "populates"

    recovery_campaigns ||--o{ recovery_drafts : "groups"
    recovery_drafts ||--o{ communication_handoffs : "hands_off_to"

    users ||--o{ import_batches : "uploads"
    users ||--o{ recovery_drafts : "approves"
    users ||--o{ communication_handoffs : "initiates"
    users ||--o{ audit_events : "triggers"

    businesses {
        uuid id PK
        string name
        string slug UK
        string industry
        string base_currency
        smallint currency_exponent
        string timezone
        string subscription_tier
        string status
        timestamptz created_at
    }

    users {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string status
        timestamptz last_login_at
    }

    business_users {
        uuid business_id PK,FK
        uuid user_id PK,FK
        string role
        boolean is_active
        timestamptz joined_at
    }

    customers {
        uuid business_id PK,FK
        uuid id PK
        string external_customer_id
        string name
        string email
        string phone
        text_array tags
        timestamptz last_activity_at
        bigint total_spend_minor_units
        integer total_orders
        string status
    }

    transactions {
        uuid business_id PK,FK
        uuid id PK
        uuid customer_id FK
        string external_transaction_id
        uuid import_batch_id FK
        timestamptz transaction_date
        bigint amount_minor_units
        string currency
        smallint currency_exponent
        string status
        string payment_channel
    }

    transaction_items {
        uuid business_id PK,FK
        uuid id PK
        uuid transaction_id FK
        string sku
        string description
        numeric quantity
        bigint unit_price_minor_units
        bigint total_minor_units
    }

    quotations {
        uuid business_id PK,FK
        uuid id PK
        uuid customer_id FK
        string external_quote_id
        string quote_number
        timestamptz issued_date
        timestamptz expiry_date
        bigint amount_minor_units
        string currency
        smallint currency_exponent
        string status
        smallint probability_percentage
    }

    quotation_items {
        uuid business_id PK,FK
        uuid id PK
        uuid quotation_id FK
        string sku
        string description
        numeric quantity
        bigint unit_price_minor_units
        bigint total_minor_units
    }

    import_batches {
        uuid business_id PK,FK
        uuid id PK
        uuid uploaded_by_user_id FK
        string file_name
        bigint file_size_bytes
        string storage_path
        string source_type
        jsonb column_mapping
        integer total_rows
        integer successful_rows
        integer duplicate_rows
        integer failed_rows
        string status
        timestamptz rollback_expires_at
        timestamptz rolled_back_at
    }

    raw_import_rows {
        uuid business_id PK,FK
        uuid id PK
        uuid import_batch_id FK
        integer row_number
        jsonb raw_data
        jsonb normalized_data
        string status
        text error_message
    }

    recovery_campaigns {
        uuid business_id PK,FK
        uuid id PK
        string name
        string archetype
        jsonb target_criteria
        string status
        uuid created_by_user_id FK
    }

    recovery_drafts {
        uuid business_id PK,FK
        uuid id PK
        uuid campaign_id FK
        uuid customer_id FK
        uuid quotation_id FK
        string suggested_channel
        string recipient_identifier
        string draft_subject
        text draft_body
        text ai_rationale
        smallint ai_risk_score
        string ai_prompt_version
        string status
        uuid approved_by_user_id FK
        timestamptz approved_at
    }

    communication_handoffs {
        uuid business_id PK,FK
        uuid id PK
        uuid draft_id FK
        uuid customer_id FK
        string channel
        text handoff_url
        uuid initiated_by_user_id FK
        timestamptz handoff_initiated_at
        string user_confirmed_outcome
    }

    audit_events {
        uuid business_id PK,FK
        bigint sequence_number PK
        uuid id UK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb metadata
        inet ip_address
        string previous_hash
        string event_hash
        timestamptz created_at
    }

    ai_audit_logs {
        uuid business_id PK,FK
        uuid id PK
        uuid invoked_by_user_id FK
        string module_name
        string model_provider
        string model_name
        integer prompt_tokens
        integer completion_tokens
        integer duration_ms
        string input_context_digest
        jsonb structured_output
        string status
    }
```

---

## 2. Key Relational Integrity Notes

1. **Composite Primary Keys:** All business-specific tables (`customers`, `transactions`, `quotations`, `import_batches`, `recovery_drafts`, `communication_handoffs`) enforce `PRIMARY KEY (business_id, id)`.
2. **Tenant-Safe Foreign Keys:** Child tables reference parent tables using compound foreign keys: `FOREIGN KEY (business_id, parent_id) REFERENCES parent(business_id, id)`. This makes accidental cross-tenant linkages structurally impossible.
3. **Audit Immutability:** `audit_events` utilizes `PRIMARY KEY (business_id, sequence_number)` with a strict monotonic counter per business, preventing gap insertion or out-of-order event injection.
