# BIZORA — DEPLOYMENT ARCHITECTURE & HYBRID EVOLUTION SPECIFICATION

**Document Reference:** BIZORA-ARCH-DEPLOY-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Infrastructure Architect & DevOps Lead  
**Date:** 2026-11-21  

---

## 1. PURPOSE & PRINCIPLE

This document specifies the deployment architecture for Bizora in accordance with **ADR 005 (Hybrid Infrastructure and Deployment Evolution Strategy)**. It operationalizes the three-stage migration path from an initial managed cloud deployment to horizontal multi-server container scaling and multi-cloud portability.

---

## 2. THE THREE-STAGE EVOLUTION PATH

```
+----------------------------------------------------------------------------------------------------+
|                                  DEPLOYMENT EVOLUTION ROADMAP                                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  STAGE A: Managed Cloud-First (Initial Production Launch)                                          |
|  * Platform: Next.js on Vercel or Google Cloud Run (Serverless Container Mode)                     |
|  * Database: Managed Neon Serverless PostgreSQL (WebSocket Pooler Endpoint)                       |
|  * Cache: Managed Upstash Redis (REST / TLS)                                                       |
|  * Worker: Scheduled HTTP Invocations (QStash / Cloud Scheduler -> Secure Worker Route)            |
|  * Storage: Managed Object Storage (Vercel Blob / Cloudflare R2)                                   |
|                                                                                                    |
|                                            |                                                       |
|                                            v (Traffic & Tenant Growth)                             |
|                                                                                                    |
|  STAGE B: Horizontal Container Scaling (Multi-Instance Production)                                 |
|  * Platform: Multiple Container Instances behind Application Load Balancer (ALB)                   |
|  * Database: Managed PostgreSQL with Dedicated PgBouncer Pooler Cluster                            |
|  * Cache: Dedicated Distributed Redis Cluster                                                      |
|  * Worker: Dedicated Long-Running Worker Container Service (Polling Outbox via SKIP LOCKED)        |
|  * Storage: Private AWS S3 Bucket with Direct Presigned URLs                                       |
|                                                                                                    |
|                                            |                                                       |
|                                            v (Enterprise & Multi-Region Expansion)                 |
|                                                                                                    |
|  STAGE C: Cloud Portability & Infrastructure Independence                                          |
|  * Platform: Portable Kubernetes Manifests (Helm) or Terraform ECS/GKE Configurations              |
|  * Runtime: Multi-Stage Dockerfile Compiling Next.js Standalone Node.js Binary                     |
|  * Infrastructure-as-Code: Fully Open-Standard Terraform Stack; Zero Proprietary Cloud APIs        |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. STAGE A: MANAGED CLOUD-FIRST SPECIFICATION

* **Deployment Target:** Next.js application deployed in managed serverless container mode.
* **Environment Secret Management:** Injected at deployment time via encrypted environment variables. Secrets are never checked into Git.
* **Health & Liveness Probes:**
  - `/api/health/live`: Basic process liveness probe returning HTTP 200.
  - `/api/health/ready`: Dependency readiness probe executing a lightweight `SELECT 1` query to the database pooler and a `PING` to Redis.
* **Continuous Integration / Continuous Deployment (CI/CD):**
  - GitHub Actions pipeline runs on every pull request to `main`.
  - Executes: TypeScript compilation check (`tsc --noEmit`), ESLint linting, Vitest unit/integration test suite.
  - Deploys automatically to staging preview environments on branch push.
* **Atomic Rollback:** Managed hosting provides instant 1-click rollback to any past deployment SHA.

---

## 4. STAGE B & C: CONTAINER SPECIFICATION (`DOCKERFILE`)

To guarantee cloud portability from day one without application refactoring, Bizora maintains a production-grade multi-stage `Dockerfile`:

```dockerfile
# Stage 1: Dependency Installation
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Application Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# Stage 3: Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. RECOVERY & BUSINESS CONTINUITY PROCEDURES

* **Backup Cadence:** Daily automated full database snapshots plus continuous Write-Ahead Log (WAL) archiving.
* **Point-in-Time Recovery (PITR):** Enables restoring the database to any millisecond within the past 7 days.
* **Cold Disaster Recovery Runbook:**
  1. Provision new database instance from the latest WAL snapshot.
  2. Deploy standalone container image from the container registry to the target hosting platform.
  3. Inject environment secrets via secure parameter store.
  4. Run database readiness probe (`/api/health/ready`).
  5. Re-point DNS CNAME records via Cloudflare CDN.
