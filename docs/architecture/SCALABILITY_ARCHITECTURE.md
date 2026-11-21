# BIZORA — SCALABILITY & MULTI-SERVER ARCHITECTURE SPECIFICATION

**Document Reference:** BIZORA-ARCH-SCALE-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Infrastructure Architect & DevOps Lead  
**Date:** 2026-11-21  

---

## 1. PURPOSE & PRINCIPLE

This document specifies the horizontal scaling and multi-server readiness architecture for Bizora. It guarantees that the modular monolith can scale seamlessly across multiple stateless application instances and independently scaled background workers without relying on local server memory or local disk for shared state.

---

## 2. MULTI-SERVER ARCHITECTURE MAP

```
                                  [ Public Internet ]
                                           |
                                           v
                              [ Cloudflare / Edge CDN ]
                             (TLS 1.3, DDoS, Edge Cache)
                                           |
                                           v
                        [ Application Load Balancer / Ingress ]
                                           |
                  +------------------------+------------------------+
                  |                                                 |
                  v                                                 v
    [ Bizora Instance #1 (Node.js) ]                  [ Bizora Instance #2 (Node.js) ]
    * Stateless Application Server                    * Stateless Application Server
    * In-Memory State: NONE                           * In-Memory State: NONE
    * Local Disk Storage: NONE                        * Local Disk Storage: NONE
                  |                                                 |
                  +------------------------+------------------------+
                                           |
         +---------------------------------+---------------------------------+
         |                                 |                                 |
         v                                 v                                 v
[ Managed Relational Database ]   [ Distributed Cache Cluster ]   [ Staging Object Storage ]
* Neon Serverless (PgBouncer)      * Upstash Redis (REST / TLS)    * S3-Compatible / Vercel Blob
* Connection Pooling (WebSocket)   * Shared Rate-Limit Buckets     * Presigned Direct Uploads
* Transactional Tenant Context     * Real-Time Session Revocation  * Auto-Purged after 30 Days
```

---

## 3. STATELESS APPLICATION DESIGN

To support arbitrary horizontal scaling behind an Application Load Balancer:

1. **Stateless Session Management:** User authentication relies on cryptographically signed stateless tokens. Any application instance can verify session validity using the shared secret without inter-server synchronization.
2. **Zero Persistent Local Disk:** Uploaded CSV/Excel files and exported reports are streamed directly to centralized object storage. Local disk is used strictly for transient operating system buffers and is purged on request completion.
3. **Zero Local Memory Caching for Multi-Node State:** All shared state—including rate-limiting buckets, monthly AI usage quotas, and session revocation entries—is persisted in the distributed cache layer (Redis).
4. **Graceful Shutdown & Drain:** Instances handle `SIGTERM` and `SIGINT` signals by finishing in-flight database transactions and flushing log streams before process exit.

---

## 4. DATABASE CONNECTION POOLING AT SCALE

Under multi-instance scaling, dozens of concurrent application threads can overwhelm standard PostgreSQL connection limits:

* **Managed Connection Pooling:** All database traffic routes through a managed PgBouncer pooler endpoint.
* **WebSocket Interactive Transactions:** Because stateless HTTP query modes do not preserve `SET LOCAL` session variables across multiple queries, Bizora connects to the pooler over persistent WebSockets, supporting ACID transactions and tenant-isolated RLS without connection starvation.
* **Connection Limits & Idle Recycling:** Inactive connections are recycled after 30 seconds; connection acquisitions timeout after 5 seconds with automatic retry.

---

## 5. DECOUPLED BACKGROUND WORKER SCALING

Background tasks (spreadsheet parsing, daily revenue aggregation, outbox handoff processing) are decoupled from the web-serving thread:

* **Stage A (Initial Launch):** Invocations are triggered via managed HTTP scheduler webhooks (QStash or Cloud Scheduler) calling secured internal worker endpoints.
* **Stage B (Horizontal Scaling):** Dedicated worker container processes run independently from the web instances, continuously claiming jobs from the database outbox using non-blocking row locks:
  ```sql
  SELECT * FROM dispatch_jobs 
  WHERE status = 'pending' AND next_retry_at <= NOW()
  ORDER BY next_retry_at ASC LIMIT 10
  FOR UPDATE SKIP LOCKED;
  ```
* **Concurrency Safety:** `FOR UPDATE SKIP LOCKED` guarantees that no two workers across any server instances can claim the same job, eliminating duplicate processing without relying solely on distributed Redis locks.
