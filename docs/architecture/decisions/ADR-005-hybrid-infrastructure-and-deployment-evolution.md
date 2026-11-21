# ADR-005: HYBRID INFRASTRUCTURE AND DEPLOYMENT EVOLUTION STRATEGY

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Infrastructure Architect, DevOps Lead  

---

## Context & Problem
Bizora requires rapid development velocity and low operational overhead during initial launch. Committing exclusively to proprietary serverless platform primitives risks severe vendor lock-in and high scaling costs. Conversely, deploying a complex container cluster (Kubernetes) from day one introduces unnecessary operational complexity and baseline infrastructure costs before achieving product-market fit.

## Decision
Execute a **Three-Stage Hybrid Infrastructure Strategy**:
1. **Stage A (Managed Cloud-First):** Deploy Next.js in managed serverless container mode (Vercel or Google Cloud Run), utilizing managed Neon PostgreSQL (WebSocket Pooler), Upstash Redis, and scheduled worker invocations.
2. **Stage B (Horizontal Container Scaling):** Evolve to multiple stateless container instances behind an Application Load Balancer with dedicated, scaled background worker containers claiming outbox jobs via `FOR UPDATE SKIP LOCKED`.
3. **Stage C (Cloud Portability):** Maintain production-grade multi-stage `Dockerfile` and compile Next.js with `output: 'standalone'`, enabling migration to AWS ECS, GCP Cloud Run, or Kubernetes without application refactoring.

## Alternatives Evaluated
1. **Pure Serverless-Only Commitment:** Rejected. Proprietary vendor locking, execution timeouts on bulk spreadsheet imports, and high compounding costs at scale.
2. **Kubernetes from Day One:** Rejected. Premature operational complexity, high minimum monthly baseline ($300+), and excessive DevOps burden for small business launch.

## Consequences & Trade-offs
* **Advantages:** Minimal launch costs ($15–$50/mo), zero infrastructure management in Stage A, smooth evolutionary path to containerized enterprise scaling in Stage B/C.
* **Disadvantages:** Portability is not "zero-code" (requires environment secret re-mapping and CDN reconfiguration during cloud migration).
* **Revisit Condition:** When monthly active tenants exceed 1,000 or background import workloads require persistent compute clusters.
