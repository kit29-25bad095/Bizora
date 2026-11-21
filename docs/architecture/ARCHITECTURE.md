# BIZORA — MASTER SYSTEM ARCHITECTURE DOCUMENT

**Document Reference:** BIZORA-ARCH-MASTER-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Principal Software Architect & Infrastructure Engineer  
**Date:** 2026-11-21  

---

## 1. ARCHITECTURAL STYLE EVALUATION & SELECTION

In accordance with Phase 03 requirements, Bizora evaluated three fundamental architectural alternatives:

### 1.1 Evaluated Alternatives

| Architecture Pattern | Development & Operational Complexity | Data Consistency & Boundaries | Infrastructure Cost at Launch | Future Extraction & Scalability | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Modular Monolith** | **Lowest.** Single codebase, unified deployment pipeline, shared database with strict internal logical boundaries. | **ACID Guarantees.** Native relational transactions across modules; zero distributed transaction failures. | **Lowest.** Single application instance can serve early tenants; compute auto-suspends when idle. | **High.** Decoupled module interfaces allow extracting high-throughput services later if genuinely required. | **RECOMMENDED & SELECTED (ADR-001)** |
| **B. Microservices** | **Prohibitive.** Multi-repo or monorepo with multiple independent deployments, service mesh, network latency, distributed tracing. | **Eventual Consistency.** Requires distributed transactions (Sagas), two-phase commits, or complex reconciliation logic. | **High.** Multi-container baselines, multiple databases, API gateways, inter-service networking overhead. | **Complex.** Premature microservices introduce distributed network failure modes before product-market fit. | **REJECTED.** Unjustified operational overhead for V1 scope. |
| **C. Hybrid Application** | **Moderate.** Modular monolith for business domain with a separately deployable background worker process. | **ACID Guarantees.** Outbox pattern in shared database ensures transactional consistency without distributed locks. | **Low-Moderate.** Managed web hosting + scheduled/containerized worker execution. | **Optimal.** Combines monolith development velocity with independent worker scaling. | **SELECTED AS INFRASTRUCTURE EVOLUTION (ADR-005)** |

### 1.2 Decision: The Modular Monolith with Decoupled Workers
Bizora is architected as a **Modular Monolith**:
1. All core business modules (Identity, Retail Accounting, Quotations, Ingestion, Decision Intelligence, Approval Engine, Audit Governance) reside within a single TypeScript codebase.
2. The codebase enforces five strictly separated architectural layers: Presentation, Application/Server Actions, Domain Services, Data Access Layer (DAL), and Infrastructure Adapters.
3. The background worker component (responsible for outbox execution, daily metric pre-aggregation, and cleanup) is decoupled from the web serving thread, enabling independent scaling under Stage B of our Hybrid Infrastructure strategy.

---

## 2. APPLICATION LAYERING & BOUNDARY ENFORCEMENT

Bizora strictly enforces unidirectional dependency flow:

```
[ Presentation Layer: Next.js App Router (Client Components & RSCs) ]
                                |
                                v
[ Application Layer: Server Actions & Route Handlers (Input Validation via Zod) ]
                                |
                +---------------+---------------+
                |                               |
                v                               v
[ Domain Logic Layer: Pure Services ]   [ AI Intelligence Layer: Schema-Bounded ]
  * Financial Calculation Engine          * Context Sanitization
  * Churn & Dormancy Algorithms           * Prompt Formatting
  * Approval State Machine                * Structured Output Validation
                |                               |
                +---------------+---------------+
                                |
                                v
[ Data Access Layer (DAL): Scoped by TenantContext ]
  * Mandatory tenant filtering: `where: eq(table.businessId, ctx.businessId)`
  * Transactional database context application
                                |
                                v
[ Infrastructure Adapters: Database, Storage, Cache, External Protocols ]
  * Relational Database (Connection Pooler)
  * Object Storage Provider Abstraction
  * Distributed Cache & Rate Limiting Provider
```

### Boundary Rules
* **Rule 1 (Zero Database Access in UI):** Presentation components in `src/app/` and `src/components/` must **never** import database schemas or execute SQL queries. All data access must pass through Server Components calling the Data Access Layer or Server Actions.
* **Rule 2 (Server-Only Enforcement):** All services, DAL functions, and database client files must be marked with `import 'server-only'` to guarantee they are never bundled into client JavaScript.
* **Rule 3 (Deterministic Financial Isolation):** The Financial Calculation Engine is pure TypeScript. It possesses zero dependencies on AI modules and executes deterministically.
* **Rule 4 (AI Output Boundary):** AI generation outputs must be parsed into strict Zod schemas before being presented to users or saved to database drafts. AI is strictly barred from modifying financial KPIs.

---

## 3. DOMAIN MODULE ARCHITECTURE

The application decomposes into seven decoupled domain modules:

```
+----------------------------------------------------------------------------------------------------+
|                                      BIZORA DOMAIN MODULES                                         |
+----------------------------------------------------------------------------------------------------+
| 1. Tenancy & Identity Module: User authentication, store tenant profiling, RBAC memberships        |
| 2. Retail Sales Module: Order ledger, line items, payments, refunds, cash tracking                 |
| 3. Quotation Pipeline Module: Quote drafting, line items, validity tracking, order conversion      |
| 4. Spreadsheet Ingestion Module: CSV/Excel streaming, column mapping, deduplication, rollback      |
| 5. Decision Intelligence Module: Dormancy Z-scoring, opportunity loss estimation, anomaly radar     |
| 6. AI Recovery & Approval Module: Campaign drafting, human review drawer, approval state machine   |
| 7. Communication & Audit Module: WhatsApp/Email handoff generator, append-only hash-chained ledger |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. TENANT CONTEXT PROPAGATION & AUTHORIZATION

Tenant isolation is enforced through a strict context propagation lifecycle:

1. **Extraction:** Inbound HTTP requests or Server Actions are intercepted by authentication middleware. The user session token is decrypted, and the authenticated `user_id` is extracted.
2. **Derivation:** The server resolves the user's active `business_id` and role from the database or verified session claim. **Any tenant ID supplied in the request body is ignored.**
3. **Verification:** The system verifies active membership status (`is_active = true`) and ensures the session token version matches the database record (rejecting revoked memberships).
4. **Context Construction:** The middleware constructs an immutable `TenantContext` object:
   ```typescript
   export interface TenantContext {
     readonly businessId: string;
     readonly userId: string;
     readonly role: 'owner' | 'member';
   }
   ```
5. **Propagation:** The `TenantContext` is passed down to Data Access Layer functions. Every query automatically binds `business_id = ctx.businessId`.
6. **Database Enforcement:** In the database tier, connection transactions apply the tenant context to enforce fail-closed Row-Level Security policies.

---

## 5. HYBRID INFRASTRUCTURE & MULTI-SERVER EVOLUTION

In accordance with **ADR 005**, Bizora follows a three-stage evolutionary deployment path:

### Stage A: Managed Cloud-First (Initial Production Launch)
* **Web Tier:** Managed serverless application hosting (Next.js on Vercel or Google Cloud Run).
* **Database:** Managed Serverless PostgreSQL (Neon) using native connection pooling.
* **Cache & Rate Limiting:** Managed Serverless Redis (Upstash) over REST/TLS.
* **Background Invocation:** Managed HTTP cron / scheduler (QStash or Cloud Scheduler) triggering idempotent worker endpoints.
* **Object Storage:** Managed Object Storage (Storage abstraction wrapping S3-compatible storage or Vercel Blob).

### Stage B: Horizontal Scaling (Multi-Instance Production)
* **Web Tier:** Multiple stateless application container instances deployed behind an Application Load Balancer.
* **Worker Tier:** Decoupled, dedicated background worker containers continuously claiming outbox jobs via `FOR UPDATE SKIP LOCKED`.
* **Database:** Managed PostgreSQL with dedicated connection pooling (PgBouncer).
* **Coordination:** Distributed Redis cluster handling shared rate limits, distributed locks, and session invalidation.

### Stage C: Cloud Portability & Independence
* **Containerization:** Production multi-stage `Dockerfile` compiling Next.js with `output: 'standalone'`.
* **Deployment Targets:** AWS ECS Fargate, Google Cloud Run, or Kubernetes without application refactoring.
* **Portability Guarantee:** Open-standard OCI containers; zero reliance on proprietary cloud vendor APIs.

---

## 6. SYSTEM RESILIENCE & DISASTER RECOVERY

* **Availability Target:** 99.9% (internal objective, aligned with underlying managed cloud SLAs).
* **Recovery Point Objective (RPO):** 15 Minutes (continuous WAL archiving to S3).
* **Recovery Time Objective (RTO):** 4 Hours (cold infrastructure redeployment and database snapshot restoration).
* **Graceful Degradation:** If the external AI service experiences an outage, core retail dashboard KPIs, customer directories, quotations, and spreadsheet imports remain 100% operational.
