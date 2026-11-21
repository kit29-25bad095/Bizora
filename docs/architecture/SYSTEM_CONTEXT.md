# BIZORA — SYSTEM CONTEXT & ACTOR SPECIFICATION

**Document Reference:** BIZORA-ARCH-CONTEXT-V1.0  
**Status:** DRAFT FOR STAKEHOLDER REVIEW  
**Lifecycle Phase:** Phase 03 System Architecture  
**Author:** Principal Software Architect  
**Date:** 2026-11-21  

---

## 1. PURPOSE

This document specifies the system context for the Bizora SaaS platform. It establishes the external actors, third-party system dependencies, protocol boundaries, and operational perimeter governing Bizora Version 1.0 (V1).

---

## 2. SYSTEM CONTEXT OVERVIEW

Bizora occupies the central decision intelligence layer for small-to-medium retail and wholesale quotation businesses. It ingests disconnected spreadsheets and user actions, analyzes customer purchase cycles, and empowers business owners to initiate personal communication handoffs.

```
+----------------------------------------------------------------------------------------------------+
|                                      SYSTEM CONTEXT MAP                                            |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [ ACTORS ]                                                                                        |
|  +--------------------+       +--------------------+                                               |
|  |    Store Owner     |       |    Staff Member    |                                               |
|  |  (Full Admin/Appr) |       |  (Ingest/Quotes)   |                                               |
|  +--------------------+       +--------------------+                                               |
|            |                            |                                                          |
|            +--------------+-------------+                                                          |
|                           |                                                                        |
|                           v (HTTPS / TLS 1.3)                                                      |
|            +------------------------------+                                                        |
|            |      BIZORA SAAS SYSTEM      |                                                        |
|            |    (Modular Monolith Core)   |                                                        |
|            +------------------------------+                                                        |
|              |            |            |                                                           |
|              v            v            v                                                           |
|  [ THIRD-PARTY PROTOCOLS & MANAGED INFRASTRUCTURE ]                                                |
|  +----------------+  +----------------+  +--------------------+  +--------------------+            |
|  |  WhatsApp Web  |  |  Native Email  |  |   AI Provider API  |  |  Managed Database  |            |
|  |    (wa.me)     |  |    (mailto:)   |  | (Anthropic/OpenAI) |  |   (PostgreSQL/WS)  |            |
|  +----------------+  +----------------+  +--------------------+  +--------------------+            |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. SYSTEM ACTORS & ROLES

### 3.1 Primary Human Actors
1. **Store Owner (Tenant Administrator):**
   - **Goals:** Understand true sales performance, identify customer revenue at risk, approve AI win-back messages, initiate WhatsApp/email handoffs, manage team access.
   - **Interaction:** Web browser on desktop, tablet, or mobile; full read/write/approval authority.
2. **Staff Member (Tenant Member):**
   - **Goals:** Upload daily/weekly sales spreadsheets, maintain quotation pipeline, update customer records.
   - **Interaction:** Web browser on desktop/tablet; read access to analytics; write access to ingestion and quotes; **zero approval authority**.
3. **End Customer (Passive Subject):**
   - **Role:** The retail buyer or quotation recipient.
   - **Interaction:** Does **not** access Bizora directly in V1. Interacts with the Store Owner through external WhatsApp messages or emails sent from the owner's personal client.

---

## 4. EXTERNAL SYSTEM DEPENDENCIES & PROTOCOL BOUNDARIES

### 4.1 Client-Side Handoff Protocols
1. **WhatsApp Client Scheme (`wa.me`):**
   - **Protocol:** HTTP GET redirect to `https://wa.me/<E.164-phone>?text=<encoded_text>`.
   - **Execution Boundary:** Client browser initiates URL opening. System records `handoff_initiated_at` in database audit records.
   - **Boundary Guarantee:** Bizora has **zero automated server-side integration** with WhatsApp in V1. Delivery receipts, message read status, and recipient replies remain entirely outside Bizora's perimeter.
2. **Standard Email Client Scheme (`mailto:`):**
   - **Protocol:** RFC 6068 `mailto:` URI handler.
   - **Execution Boundary:** Client browser triggers the OS-default mail application (e.g., Apple Mail, Outlook, Gmail web). Bizora records handoff initiation only.

### 4.2 Cloud Infrastructure & API Boundaries
1. **AI Synthesis Provider (Evaluated in Phase 04):**
   - **Protocol:** HTTPS REST API over TLS 1.3 using authenticated API secret tokens.
   - **Data Perimeter:** Only pre-aggregated, anonymized statistical summaries are transmitted. No raw customer names, phone numbers, or individual order line-item dumps are exposed to the AI provider.
2. **Managed Relational Database (Neon PostgreSQL):**
   - **Protocol:** PostgreSQL wire protocol over secure WebSockets with TLS 1.3.
   - **Boundary Guarantee:** Connection pooling is enforced via PgBouncer. All queries execute within explicit tenant isolation boundaries.
3. **Managed Distributed Cache (Upstash Redis):**
   - **Protocol:** Stateless HTTPS REST calls authenticated by bearer tokens.
   - **Usage Boundary:** Rate limiting buckets, sliding-window AI quotas, and real-time session revocation keys.
4. **Staging Object Storage (S3-Compatible / Vercel Blob):**
   - **Protocol:** Signed HTTPS PUT/GET transactions.
   - **Lifecycle Boundary:** Temporary staging for user-uploaded CSV/Excel spreadsheets. Raw files are strictly purged after 30 days.
