# ADR-001: MODULAR MONOLITH APPLICATION ARCHITECTURE

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Infrastructure Architect  

---

## Context & Problem
Bizora requires a production-grade architecture that enables rapid development velocity, clean domain separation, high maintainability, and end-to-end type safety for an early-stage SaaS platform. The system must support future scaling without incurring the distributed complexity, network latency, and operational overhead of microservices prematurely.

## Decision
Adopt a **Modular Monolith** architecture pattern using TypeScript and the Next.js App Router framework. All business domains reside in a single codebase with strictly enforced layer boundaries: Presentation (`src/app`, `src/components`), Application Server Actions (`src/server/actions`), Domain Services (`src/server/services`), Data Access Layer (`src/server/data`), and Infrastructure Adapters (`src/lib`).

## Alternatives Evaluated
1. **Microservices Architecture:** Rejected due to distributed transaction overhead, multi-repo operational complexity, network latency, and premature cost for early-stage retail workloads.
2. **Traditional Multi-Tier Monolith (No internal domain boundaries):** Rejected due to the risk of "spaghetti code" where UI directly queries database schemas, preventing future service extraction.

## Consequences & Trade-offs
* **Advantages:** Native ACID transactions across modules, zero inter-service network latency, unified deployment pipeline, shared TypeScript types from database to UI.
* **Disadvantages:** Monolithic deployments require building the entire application; mitigated by Next.js standalone compilation and decoupled outbox workers.
* **Revisit Condition:** When a single domain module (e.g., spreadsheet parsing) requires independent auto-scaling exceeding 10x the web tier load.
