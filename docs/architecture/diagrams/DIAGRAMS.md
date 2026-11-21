# BIZORA — MASTER ARCHITECTURAL DIAGRAMS SPECIFICATION

**Document Reference:** BIZORA-ARCH-DIAGRAMS-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Principal Software Architect  
**Date:** 2026-11-21  

---

## 1. SYSTEM CONTEXT DIAGRAM

```mermaid
flowchart TD
    subgraph Users["System Users"]
        Owner["Store Owner (Admin / Approval Authority)"]
        Staff["Staff Member (Data Ingest / Quotes)"]
    end

    subgraph BizoraCore["Bizora SaaS Platform"]
        WebUI["Web Application (Next.js App Router)"]
        AnalyticsEngine["Deterministic Analytics Engine"]
        IntelligenceService["Decision Intelligence & AI Service"]
        HandoffManager["Client Handoff Manager"]
    end

    subgraph External["External Protocols & Managed Services"]
        WA["WhatsApp Client (wa.me URI)"]
        Mail["Native Email Client (mailto: URI)"]
        AI["AI Provider API (Evaluated Phase 04)"]
        DB[(Managed PostgreSQL Database)]
        Cache[(Distributed Cache & Rate Limiter)]
        Storage[(Staging Object Storage)]
    end

    Owner -->|Full Admin & Approvals| WebUI
    Staff -->|Imports & Quotations| WebUI

    WebUI --> AnalyticsEngine
    WebUI --> IntelligenceService
    WebUI --> HandoffManager

    AnalyticsEngine --> DB
    IntelligenceService --> AI
    HandoffManager -->|Client Redirect| WA
    HandoffManager -->|Client URI| Mail
    HandoffManager -->|Audit Log| DB

    WebUI --> Cache
    WebUI --> Storage
```

---

## 2. HIGH-LEVEL CONTAINER ARCHITECTURE

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier"]
        Browser["User Browser (Desktop / Mobile)"]
    end

    subgraph IngressTier["Edge & Ingress Tier"]
        EdgeCDN["Cloudflare CDN / Edge Proxy"]
        ALB["Application Ingress / Load Balancer"]
    end

    subgraph AppTier["Stateless Application Instances"]
        AppNode1["Bizora Node #1 (Next.js Standalone)"]
        AppNode2["Bizora Node #2 (Next.js Standalone)"]
    end

    subgraph WorkerTier["Decoupled Processing Tier"]
        Worker["Outbox & Analytics Background Worker"]
    end

    subgraph PersistenceTier["Managed Persistence & Caching Tier"]
        DBCluster[("Neon PostgreSQL Cluster (WebSocket Pooler)")]
        RedisCluster[("Upstash Redis (Distributed Cache & Limits)")]
        BlobStore[("Object Storage (Staging Spreadsheets)")]
    end

    Browser -->|HTTPS / TLS 1.3| EdgeCDN
    EdgeCDN --> ALB
    ALB --> AppNode1
    ALB --> AppNode2

    AppNode1 -->|Pooler Connection| DBCluster
    AppNode2 -->|Pooler Connection| DBCluster
    AppNode1 -->|REST / TLS| RedisCluster
    AppNode2 -->|REST / TLS| RedisCluster
    AppNode1 -->|Presigned Uploads| BlobStore

    Worker -->|SKIP LOCKED Claim| DBCluster
```

---

## 3. APPLICATION MODULE ARCHITECTURE

```mermaid
flowchart TD
    subgraph Layer1["Presentation Layer"]
        AppRouter["Next.js App Router (src/app)"]
        UIComponents["shadcn/ui & Recharts Components"]
    end

    subgraph Layer2["Application Layer"]
        ServerActions["Server Actions (Zod Validation)"]
        RouteHandlers["API Route Handlers"]
    end

    subgraph Layer3["Domain Logic Layer"]
        TenancyMod["1. Tenancy & Auth Module"]
        RetailMod["2. Retail Sales Module"]
        QuotesMod["3. Quotes Pipeline Module"]
        IngestMod["4. Spreadsheet Ingestion Module"]
        IntelMod["5. Decision Intelligence Module"]
        RecoveryMod["6. AI Recovery & Approval Module"]
        GovMod["7. Governance & Audit Module"]
    end

    subgraph Layer4["Data Access Layer (DAL)"]
        TenantDAL["TenantContext Scoped DAL (src/server/data)"]
    end

    subgraph Layer5["Infrastructure Layer"]
        DrizzleClient["Drizzle ORM & Postgres Client"]
        RedisClient["Redis Cache & Limiter Client"]
        StorageClient["Object Storage Adapter"]
    end

    AppRouter --> ServerActions
    UIComponents --> ServerActions
    ServerActions --> TenancyMod
    ServerActions --> RetailMod
    ServerActions --> QuotesMod
    ServerActions --> IngestMod
    ServerActions --> IntelMod
    ServerActions --> RecoveryMod
    ServerActions --> GovMod

    TenancyMod --> TenantDAL
    RetailMod --> TenantDAL
    QuotesMod --> TenantDAL
    IngestMod --> TenantDAL
    IntelMod --> TenantDAL
    RecoveryMod --> TenantDAL
    GovMod --> TenantDAL

    TenantDAL --> DrizzleClient
    ServerActions --> RedisClient
    IngestMod --> StorageClient
```

---

## 4. TENANT ISOLATION AND AUTHORIZATION FLOW

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant App as Server Action / Middleware
    participant Cache as Redis Session Cache
    participant DAL as Data Access Layer
    participant DB as PostgreSQL Database

    User->>App: Invokes Protected Action(data)
    App->>App: Decrypts & Verifies Session Token
    App->>App: Extracts User ID (Never trusts client business_id)
    App->>Cache: Check Revocation (revocation:membership:tenant:user)
    alt Membership Revoked
        Cache-->>App: Revocation Key Exists
        App-->>User: 401 Unauthorized (Session Terminated)
    else Membership Active
        Cache-->>App: OK (Not Revoked)
    end
    App->>App: Constructs Immutable TenantContext(businessId, userId, role)
    App->>DAL: executeQuery(TenantContext, queryParams)
    DAL->>DB: BEGIN Transaction
    DAL->>DB: SELECT set_config('app.current_tenant_id', businessId, true)
    DAL->>DB: Executes Query (Enforcing Composite Foreign Keys & RLS)
    DB-->>DAL: Returns Tenant-Isolated Result Set
    DAL->>DB: COMMIT Transaction
    DAL-->>App: Validated Domain Entity
    App-->>User: Success Response
```

---

## 5. SPREADSHEET INGESTION PROCESSING SEQUENCE

```mermaid
sequenceDiagram
    autonumber
    actor User as Store Owner / Staff
    participant UI as Import Interface
    participant Ingest as Ingestion Service
    participant Storage as Object Storage
    participant DB as PostgreSQL Database

    User->>UI: Uploads CSV/Excel File (Max 25 MB)
    UI->>Ingest: Stream Upload
    Ingest->>Storage: Stage File Temporarily
    Ingest->>Ingest: Parse First 5 Rows
    Ingest-->>UI: Display Interactive Column Mapping Preview
    User->>UI: Confirms Header Mapping & Normalization Options
    UI->>Ingest: Trigger Import Commit(sessionId, mapping)
    Ingest->>Storage: Stream File Chunks (1,000 rows/chunk)
    Ingest->>Ingest: Normalize Phones (E.164), Dates (UTC), Amounts (Minor Units)
    Ingest->>DB: Check Deterministic Duplicate (External Transaction ID)
    Ingest->>DB: Check Ambiguous Duplicate (Same customer, date, amount)
    alt Ambiguous Duplicates Detected
        Ingest-->>UI: Surface Reconciliation Review Modal
        User->>UI: Confirms Distinct vs Duplicate Rows
        UI->>Ingest: Resume Commit with Choices
    end
    Ingest->>DB: BEGIN Transaction
    Ingest->>DB: Batch Insert Orders, Lines, Customer Spend Updates
    alt Error Rate > 5%
        Ingest->>DB: ROLLBACK Transaction
        Ingest-->>UI: Import Aborted: Error Report with Row Details
    else Success
        Ingest->>DB: COMMIT Transaction
        Ingest->>DB: Trigger Daily Summary Aggregation
        Ingest-->>UI: Import Complete: Committed Summary
    end
```

---

## 6. AI RECOMMENDATION AND APPROVAL SEQUENCE

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Store Owner (role = 'owner')
    participant UI as Approval Drawer
    participant Recovery as Recovery Service
    participant AI as Evaluated AI Service
    participant DB as PostgreSQL Database

    Owner->>UI: Clicks "Prepare Recovery Campaign"
    UI->>Recovery: Request Recommendations(cohortId)
    Recovery->>DB: Fetch Pre-Calculated Verified Financial Metrics
    Recovery->>Recovery: Anonymize Cohort Data (Zero PII passed to LLM)
    Recovery->>AI: Send Prompt with Verified Context & Zod Schema
    AI-->>Recovery: Structured Draft Payload
    Recovery->>Recovery: Validate Response via Zod Output Schema
    Recovery->>DB: Insert Campaign Draft (status = 'pending_approval', v1)
    Recovery-->>UI: Display Review Drawer with "AI-Generated Draft" Badge
    Owner->>UI: Edits Message Body & Discount Text
    Owner->>UI: Clicks "Approve Campaign"
    UI->>Recovery: approveCampaignAction(draftId, v1)
    Recovery->>Recovery: Authorize User (Must have 'owner' role)
    Recovery->>DB: BEGIN Transaction
    Recovery->>DB: Lock Draft: SELECT * FOR UPDATE
    Recovery->>DB: Transition Draft (status = 'approved')
    Recovery->>DB: Insert Approval Record (approved_by, timestamp, draft_v1_id)
    Recovery->>DB: Insert Audit Event (action = 'campaign.approved')
    Recovery->>DB: COMMIT Transaction
    Recovery-->>UI: Approval Confirmed: Enable Handoff Center
```

---

## 7. COMMUNICATION HANDOFF SEQUENCE

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Store Owner
    participant UI as Handoff Center
    participant Gov as Governance Service
    participant Client as Local Device (WhatsApp / Email)
    participant DB as PostgreSQL Database

    Owner->>UI: Selects Approved Campaign & Target Customer
    alt WhatsApp Handoff
        Owner->>UI: Clicks "Open WhatsApp"
        UI->>Gov: initiateHandoff(draftId, customerId, channel: 'whatsapp')
        Gov->>DB: Verify draft.status === 'approved'
        Gov->>DB: Insert communication_handoffs(business_id, draft_id, customer_id, timestamp)
        Gov-->>UI: Returns Generated URI (https://wa.me/E164Phone?text=EncodedMsg)
        UI->>Client: Opens WhatsApp Web / Desktop Tab with Pre-Filled Text
    else Email Handoff
        Owner->>UI: Clicks "Open Email Client"
        UI->>Gov: initiateHandoff(draftId, customerId, channel: 'email')
        Gov->>DB: Verify draft.status === 'approved'
        Gov->>DB: Insert communication_handoffs(business_id, draft_id, customer_id, timestamp)
        Gov-->>UI: Returns Generated URI (mailto:Email?subject=Subj&body=Body)
        UI->>Client: Triggers Local OS Mail Client with Pre-Filled Content
    end
    UI->>UI: Updates Customer Row Badge: "Handoff Initiated" (Timestamped)
    Note over UI,Owner: System strictly records handoff initiation. Does NOT claim delivery.
```

---

## 8. FINANCIAL DATA FLOW

```mermaid
flowchart LR
    subgraph IngestionSources["Ingestion Sources"]
        CSV["Sales CSV / Excel Workbook"]
        Manual["Manual Order / Quotation Entry"]
    end

    subgraph Processing["Deterministic Calculation Engine"]
        Normalizer["Currency & Date Normalizer"]
        MinorUnits["Convert to Integer Minor Units (BIGINT)"]
        Ledger["Order & Line Item Ledger"]
    end

    subgraph MetricsStore["Financial Snapshot Tables"]
        DailySnapshots["revenue_snapshots_daily"]
        CustomerAggregates["customers (total_spend_minor_units)"]
    end

    subgraph MetricsOutput["Dashboard Presentation"]
        GrossSales["Gross Sales (Total Orders)"]
        NetSales["Net Sales (Gross - Discounts - Returns)"]
        CashCollected["Cash Collected (Cleared Inflows)"]
        SettledOrders["Settled Order Count"]
        AOV["Average Order Value"]
    end

    CSV --> Normalizer
    Manual --> Normalizer
    Normalizer --> MinorUnits
    MinorUnits --> Ledger
    Ledger --> DailySnapshots
    Ledger --> CustomerAggregates

    DailySnapshots --> GrossSales
    DailySnapshots --> NetSales
    DailySnapshots --> CashCollected
    DailySnapshots --> SettledOrders
    DailySnapshots --> AOV
```

---

## 9. BACKGROUND PROCESSING FLOW

```mermaid
flowchart TD
    subgraph Trigger["Invocation Trigger (Stage A / Stage B)"]
        CronTrigger["Scheduled Trigger (QStash / Cloud Scheduler)"]
        WorkerProcess["Dedicated Worker Container Thread"]
    end

    subgraph WorkerExecution["Outbox Worker Execution"]
        ClaimJob["Claim Next Pending Job via FOR UPDATE SKIP LOCKED"]
        AcquireLease["Set status = 'processing', lease_expires_at = NOW() + 5m"]
        ExecuteTask["Execute Background Task (Snapshot Aggregation / Cleanup)"]
        CommitTask["Update status = 'completed', Log Audit Record"]
    end

    subgraph CrashRecovery["Failure & Abandoned Job Watchdog"]
        Watchdog["Periodic Watchdog Query"]
        DetectExpired["SELECT WHERE status = 'processing' AND lease_expires_at < NOW()"]
        ResetJob["Reset status = 'pending', increment retry_count"]
    end

    CronTrigger --> ClaimJob
    WorkerProcess --> ClaimJob
    ClaimJob --> AcquireLease
    AcquireLease --> ExecuteTask
    ExecuteTask --> CommitTask

    Watchdog --> DetectExpired
    DetectExpired --> ResetJob
    ResetJob --> ClaimJob
```

---

## 10. DEPLOYMENT ARCHITECTURE (HYBRID STAGES)

```mermaid
flowchart TD
    subgraph StageA["STAGE A: Managed Cloud-First Launch"]
        VercelApp["Next.js Serverless Container (Vercel / Cloud Run)"]
        NeonDB1["Neon PostgreSQL (WebSocket Pooler)"]
        UpstashRedis1["Upstash Redis (REST API)"]
        Blob1["Object Storage (Vercel Blob / R2)"]
    end

    subgraph StageB["STAGE B: Horizontal Scaling Multi-Server"]
        ALB["Application Load Balancer"]
        Container1["Stateless Container Instance #1"]
        Container2["Stateless Container Instance #2"]
        WorkerContainer["Dedicated Outbox Worker Container"]
        PgBouncer["Dedicated PgBouncer Cluster"]
        RedisCluster["Dedicated Distributed Redis"]
    end

    VercelApp --> NeonDB1
    VercelApp --> UpstashRedis1
    VercelApp --> Blob1

    ALB --> Container1
    ALB --> Container2
    Container1 --> PgBouncer
    Container2 --> PgBouncer
    WorkerContainer --> PgBouncer
    Container1 --> RedisCluster
    Container2 --> RedisCluster
```

---

## 11. FAILURE AND RECOVERY FLOW

```mermaid
flowchart TD
    subgraph PrimaryFailure["Catastrophic Infrastructure Failure Scenario"]
        Outage["Primary Managed Cloud Host / Region Failure"]
    end

    subgraph RecoverySteps["Disaster Recovery Runbook Steps"]
        Step1["1. Activate Standalone Docker Container in Backup Region / Cloud"]
        Step2["2. Restore Neon Point-in-Time Recovery (PITR) to Target Snapshot"]
        Step3["3. Inject Environment Secrets via Secure Vault"]
        Step4["4. Run Dependency Health Probe: /api/health/ready"]
        Step5["5. Re-Point Cloudflare CDN DNS CNAME Records"]
    end

    subgraph RecoveryVerification["RPO & RTO Verification"]
        VerifyRPO["RPO Verified: Continuous WAL Archiving preserves data within 15 mins"]
        VerifyRTO["RTO Verified: Service restored and accepting traffic within 4 hours"]
    end

    Outage --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> VerifyRPO
    Step5 --> VerifyRTO
```
