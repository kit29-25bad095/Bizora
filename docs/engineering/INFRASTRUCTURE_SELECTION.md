# BIZORA — INFRASTRUCTURE SELECTION & HYBRID EVOLUTION STRATEGY

**Document Version:** 1.0.0  
**Status:** Approved Architectural Baseline  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Author:** Infrastructure Architect & DevOps Lead  

---

## 1. Executive Summary & Strategic Infrastructure Mandate

Bizora's infrastructure strategy is governed by a single engineering principle: **Zero Over-Engineering in Stage A, Zero Re-Architecture in Stages B and C.**

Early-stage enterprise SaaS products frequently fail by either:
1. Building complex Kubernetes clusters before validating product-market fit, generating unsustainable DevOps overhead and cloud burn, or
2. Writing code tightly coupled to proprietary serverless primitives (e.g., AWS Lambda DynamoDB streams, Vercel Edge Middleware limits), making migration impossible when scaling costs surge.

Bizora resolves this dichotomy through a **strict three-stage hybrid infrastructure roadmap**. The code is written as a **12-factor modular monolith packaged in a standardized Docker container**, deployable interchangeably to serverless runtimes, managed container platforms, or bare-metal Kubernetes.

---

## 2. Infrastructure Evolution Stages

```
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                STAGE A                                  │
   │               Managed Serverless & High-Velocity Validation             │
   │           Vercel / Railway + Neon Postgres + Upstash + Cloudflare R2    │
   │              Target: 0 – 500 Tenants | Ops Overhead: ~0 hrs/wk          │
   └────────────────────────────────────┬────────────────────────────────────┘
                                        │ (Trigger: >500 Tenants OR
                                        │  Cloud spend >$1,500/mo OR
                                        │  Long-running worker timeouts)
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                STAGE B                                  │
   │                 Managed Container Cluster & Dedicated Workers           │
   │               Railway Private VPC / Render / AWS ECS Fargate            │
   │              Target: 500 – 5,000 Tenants | Ops Overhead: ~2 hrs/wk       │
   └────────────────────────────────────┬────────────────────────────────────┘
                                        │ (Trigger: >5,000 Tenants OR
                                        │  Compute spend >$5,000/mo OR
                                        │  Strict Data Residency / Compliance)
                                        ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                                STAGE C                                  │
   │           Self-Hosted Bare Metal / Dedicated Cloud Orchestration        │
   │             Hetzner Dedicated / AWS EKS / Nomad + HA Patroni Postgres   │
   │              Target: 5,000+ Tenants | Ops Overhead: Dedicated SRE       │
   └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stage A: Detailed Specification (Pilot to 500 Tenants)

### 3.1 Component Architecture
- **Web & API Tier:** Next.js 15 App Router deployed to **Railway** (or Vercel). If Railway is used, web and worker run as two services within the same private project network.
- **Asynchronous Worker Tier:** Dedicated continuous Node.js worker service deployed on **Railway** from Day 1 to execute BullMQ polling loops without serverless timeout or execution freeze constraints.
- **Primary Database:** **Neon Serverless PostgreSQL (AWS us-east-1)**. Compute autoscaling (0.25 to 4 CU), automated storage tiering to S3, point-in-time recovery (PITR) up to 30 days, zero maintenance window downtime. Connection via WebSocket pooler to PgBouncer.
- **Job Queue & Cache:** **Upstash Redis (Serverless)** or **Railway Managed Redis**. REST/TCP Redis compatibility, sub-millisecond response for BullMQ queues and distributed locks.
- **Blob & Artifact Storage:** **Cloudflare R2**. S3 API compatible, **zero egress fees**, automatic multi-region durability ($0.015/GB storage).
- **AI Gateway:** Direct HTTPS calls to **Anthropic** and **Google Gemini** APIs via Vercel AI SDK with per-request token metering and timeout bounds (max 30s).

### 3.2 Stage A Financial Modeling (100 Active Small Business Tenants)
| Provider / Resource | Capacity / Tier | Estimated Monthly Cost (USD) |
| :--- | :--- | :---: |
| Next.js Hosting (Vercel / Railway) | Pro Team ($20/seat x 2) + usage | $40.00 – $60.00 |
| Neon Serverless Postgres | Pro Plan + 10GB Storage + Autoscaling compute | $35.00 – $65.00 |
| Upstash Redis | Pay-as-you-go (~2M commands/month) | $5.00 – $10.00 |
| Cloudflare R2 | Storage (~50GB CSV/XLSX imports + zero egress) | $0.75 – $1.50 |
| AI API Tokens (Anthropic + Gemini) | ~500 synthesized recovery batches/mo (~5M tokens) | $60.00 – $120.00 |
| Sentry Error Tracking | Developer / Team tier | $0.00 – $26.00 |
| BetterStack (Logging + Uptime) | Starter Plan | $0.00 – $24.00 |
| **Total Estimated Stage A Burn** | **Predictable Baseline** | **$140.75 – $306.50 / month** |

*Economic Viability:* At an estimated subscription fee of $49–$99/month per small business tenant, 100 active tenants generate $4,900–$9,900 in Monthly Recurring Revenue (MRR), resulting in an infrastructure gross margin exceeding **95%**.

---

## 4. Stage B: Managed Containers & Dedicated Workers (500 to 5,000 Tenants)

### 4.1 Migration Triggers (Any condition triggers transition)
1. **Serverless Execution Limits:** Heavy batch imports (e.g., 50,000 transaction CSVs) or multi-quarter recovery calculations approach or exceed serverless function timeout limits (15–60s on Vercel).
2. **Serverless Cost Inflection:** When monthly invocation and serverless compute charges exceed the cost of 24/7 dedicated container instances (~$1,500/month).
3. **Database Connection Saturation:** When concurrent connection churn from bursty serverless invocations degrades connection pooler throughput.
4. **Long-Running Persistent WebSockets:** Future requirements for real-time live sync exceeding serverless edge capabilities.

### 4.2 Stage B Architecture
- **Application Deployment:** Standard multi-stage Docker container deployed to **Railway Private VPC**, **Render**, or **AWS ECS Fargate**.
- **Process Separation:**
  - `web`: Next.js 15 App Server handling HTTP requests, Server Actions, and rendering.
  - `worker`: Standalone Node.js process executing BullMQ queue jobs (import processing, metric aggregation, AI generation, transactional outbox dispatch).
- **Dedicated Redis:** Managed Redis instance (Railway Redis or AWS ElastiCache) providing persistent in-memory queues and distributed lock managers.
- **Database Scaling:** Neon Dedicated Compute or AWS RDS Aurora PostgreSQL with read replicas for analytical queries.

---

## 5. Stage C: Self-Hosted Bare Metal / Sovereign Cloud (5,000+ Tenants)

### 5.1 Strategic Rationale
At high scale (>5,000 enterprise/retail accounts), cloud egress, compute markup, and managed database markups become significant margin leaks. Moving to dedicated bare-metal infrastructure (e.g., Hetzner, OVHcloud, Equinix Metal) running Kubernetes or HashiCorp Nomad cuts unit compute costs by 70–85%.

### 5.2 Stage C Architecture
- **Orchestration:** Lightweight Kubernetes (k3s) or Nomad orchestrating stateless application pods behind HAProxy / Traefik.
- **Database Cluster:** High-Availability PostgreSQL managed via **Patroni** with Raft consensus, automated failover, synchronous streaming replication to hot standbys, and automated WAL archiving to MinIO / S3.
- **Object Storage:** Self-hosted MinIO cluster backed by NVMe storage pools.
- **Observability:** Self-hosted VictoriaMetrics (metrics), Grafana Loki (logs), and Tempo (traces).

---

## 6. Portability Enforcement: The "No-Lock-In" Contract

To ensure seamless promotion from Stage A through Stage C without application code modification, Bizora enforces strict abstraction barriers:

1. **Storage Provider Interface (`StorageService`):** All file operations interact solely with an abstract TypeScript interface. The implementation uses `@aws-sdk/client-s3` pointing to Cloudflare R2 in Stage A, AWS S3 in Stage B, or MinIO in Stage C.
2. **Queue Provider Interface (`QueueService`):** Background jobs interact with a domain queue abstraction. BullMQ operates seamlessly whether Redis is hosted on Upstash (serverless), a managed container, or a dedicated Redis sentinel cluster.
3. **Database Portability:** Drizzle ORM queries are pure standard SQL dialects compatible with any PostgreSQL 16+ instance. Zero proprietary Neon-only extensions or Vercel Postgres bindings are allowed in application code.
4. **Standard Container Packaging:** The repository maintains an immutable, production-ready `Dockerfile` (specified in `docs/architecture/DEPLOYMENT_ARCHITECTURE.md`) tested in continuous integration.

---

## 7. High Availability & Disaster Recovery (DR)

| Metric | Stage A Target | Stage B Target | Stage C Target |
| :--- | :--- | :--- | :--- |
| **Service Level Agreement (SLA)** | 99.9% (~43m downtime/mo) | 99.95% (~21m downtime/mo) | 99.99% (~4.3m downtime/mo) |
| **Recovery Point Objective (RPO)** | $\le 1$ minute (Neon PITR WAL stream) | $\le 1$ minute (Streaming replication) | $\le 5$ seconds (Sync standby) |
| **Recovery Time Objective (RTO)** | $\le 15$ minutes (Instant branch restore) | $\le 10$ minutes (Container failover) | $\le 2$ minutes (Automated Patroni switch) |

### Disaster Recovery Runbook (Summary)
1. **Database Corruption / Accidental Purge:** Instant restoration to any timestamp within 30 days via Neon Point-in-Time Recovery branching.
2. **Object Storage Loss:** R2 replicates data across 3 independent availability zones automatically.
3. **Secrets Compromise:** Session tokens are invalidated immediately by rotating `SESSION_SECRET` in environment variables; all existing sessions fail verification and force re-authentication.

---

## 8. Infrastructure Sign-Off

The three-stage hybrid infrastructure architecture is formally specified and verified. It provides minimal operational burden during initial traction while guaranteeing a frictionless, code-preserving upgrade path for enterprise scale.
