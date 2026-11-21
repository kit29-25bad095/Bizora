# ADR-003: MULTI-TENANT ISOLATION AND DATABASE SECURITY

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Application Security Architect  

---

## Context & Problem
Bizora is a multi-tenant SaaS application where each business must be strictly isolated. Accidental cross-tenant data leakage (e.g. Store A viewing Store B's customer lists or quotations) would cause catastrophic brand damage and regulatory non-compliance. Reliance on application-level filtering alone risks catastrophic leaks if a developer omits a `where` clause.

## Decision
Enforce a **Defense-in-Depth Multi-Tenant Isolation Strategy**:
1. Server-derived `TenantContext` on every protected operation; zero trust for client-provided tenant IDs.
2. Engine-enforced composite foreign keys `(business_id, parent_id) REFERENCES parent(business_id, id)` on all dependent tables, physically preventing cross-tenant entity linking.
3. Fail-closed PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) applied transaction-locally over pooled WebSocket connections.
4. Database application role separation (`bizora_app` possessing `NOBYPASSRLS` privileges; `bizora_migrator` for DDL execution).

## Alternatives Evaluated
1. **Application-Level Filtering Only:** Rejected. High human-error risk of query omissions.
2. **Database-per-Tenant:** Rejected. Prohibitive operational overhead and connection limits for thousands of small retail businesses.
3. **Schema-per-Tenant:** Evaluated. Adds migration complexity without substantial security benefits over properly enforced RLS and composite keys.

## Consequences & Trade-offs
* **Advantages:** Triple-layered isolation (software DAL, database foreign keys, and PostgreSQL RLS engine) guarantees tenant isolation even in the event of application logic bugs.
* **Disadvantages:** RLS requires transaction-local session variable injection (`SET LOCAL app.current_tenant_id`), necessitating persistent WebSocket connections to the pooler.
* **Revisit Condition:** If architectural requirements shift to enterprise single-tenant private cloud deployments.
