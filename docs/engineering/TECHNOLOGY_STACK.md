# BIZORA — TECHNOLOGY STACK SELECTION & EVALUATION SPECIFICATION

**Document Version:** 1.0.0  
**Status:** Architecture Specification — Pending Gate 1 Stakeholder Approval  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Author:** Principal Software Architect & DevOps Architect  

---

## 1. Executive Summary & Selection Philosophy

Bizora is an AI-powered business intelligence and revenue recovery platform built specifically for small retail, e-commerce, and quotation-driven enterprises. The technology stack must balance rapid iteration with strict architectural discipline:

1. **Type-Safety Across All Boundaries:** End-to-end static typing from PostgreSQL schema down to React Server Components and client event handlers.
2. **Deterministic Financial Integrity:** Runtime data validation, arbitrary-precision or integer minor-unit arithmetic, and zero reliance on LLMs for calculations.
3. **Fail-Closed Multi-Tenancy:** Row-Level Security (RLS) and database connection session binding that cannot leak tenant data under any edge condition.
4. **Low Operational Overhead in Stage A with Clear Migration Paths:** Serverless/managed infrastructure in early stages evolving cleanly to containerized deployments without rewriting business logic.
5. **No Vendor Lock-In for Core Business Logic:** Database queries, financial calculations, recovery pipelines, and domain modules remain vanilla TypeScript, independent of proprietary hosting platforms.

---

## 2. Comprehensive Technology Matrix

| Layer | Selected Technology | Version | Rationale & Alternatives Rejected |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `22.x LTS` (Active) / `24.x LTS` (Target) | Long-Term Support, native fetch, web crypto, broad ecosystem compatibility. Rejected Bun/Deno due to edge-case compatibility with native C++ crypto libraries and enterprise hosting environments. |
| **Package Manager** | `pnpm` | `9.x` / `10.x` | Strict dependency resolution, content-addressable storage, symlink isolation preventing phantom dependencies. |
| **Language** | TypeScript | `5.7.x` | Strict typing (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`). |
| **Application Framework** | Next.js (App Router) | `15.2.x` (LTS/Stable) | Server Components, React Server Actions with CSRF protection, streaming SSR, built-in optimization. *Next.js 16 rejected as unstable canary.* |
| **UI Library** | React | `19.0.x` | Required by Next.js 15. Actions, `useActionState`, `useOptimistic`, server component async boundaries. |
| **Styling & Design System**| Tailwind CSS + shadcn/ui | `v4.x` / Radix UI | Headless accessible primitives (Radix), utility-first styling, zero-runtime CSS footprint, full accessibility (WCAG AA). |
| **Database** | PostgreSQL | `16.x` / `17.x` | Industry gold-standard ACID relational database with robust Row-Level Security (RLS), JSONB, and transaction isolation. Hosted on Neon Serverless. |
| **ORM & Migrations** | Drizzle ORM + Drizzle Kit | `0.39.x` / `0.30.x` | Zero-overhead SQL-like TypeScript query builder, first-class RLS support, deterministic SQL generation, rapid cold starts (<5ms vs Prisma's >150ms). |
| **Database Driver** | `@neondatabase/serverless` | `0.10.x` | WebSocket connection pool (`Pool` / `Client`) enabling transactional `SET LOCAL app.current_tenant_id` session state persistence across queries. |
| **Authentication & Session** | `iron-session` + Argon2id | `8.0.x` / `argon2` | Stateless, encrypted, authenticated HTTP-only sealed cookies (AES-256-GCM). Self-contained, zero-database-lookup session verification, no external auth vendor lock-in. |
| **Input Validation** | Zod | `3.24.x` | Schema validation at API boundaries, Server Actions, environment configuration (`@t3-oss/env-nextjs`), and AI structured output enforcement. |
| **Asynchronous Job Queue** | BullMQ + Redis | `5.38.x` / Upstash Redis | Redis-backed distributed queue for import chunking, heavy aggregation, and AI synthesis. Deployed as a dedicated persistent container worker (Railway) from Day 1 to eliminate serverless event loop freeze. |
| **AI Orchestration** | Vercel AI SDK | `4.1.x` (`ai` core) | Unified model provider abstraction (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`), typed structured generation (`generateObject`), automated telemetry. |
| **Primary AI Model** | Anthropic Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` | Benchmark leader in multi-variable business reasoning, nuance in customer recovery messaging, and strict structured JSON adherence. |
| **Fallback AI Model** | Google Gemini 1.5 Pro | `gemini-1.5-pro-latest` | High context window (2M tokens) for multi-quarter historical ledger synthesis and low-cost fallback. |
| **File Parsing Engine** | `csv-parse` & `exceljs` | `5.6.x` / `4.4.x` | Streaming memory-bounded CSV parsing with chunk backpressure; secure binary Excel parsing preventing XML Entity expansion attacks. |
| **Object Storage** | Cloudflare R2 / AWS S3 | S3 API compatible | Storage abstraction (`@aws-sdk/client-s3`) for raw CSV/Excel imports, generated reports, and audit snapshot archives. Zero egress fees on R2. |
| **Testing Suite** | Vitest + Playwright | `3.0.x` / `1.50.x` | Fast parallel unit/integration testing with TypeScript ESM support (Vitest); cross-browser end-to-end integration and accessibility testing (Playwright). |
| **Observability & Logging** | Pino + OpenTelemetry | `9.6.x` / `@opentelemetry/api` | High-performance structured JSON logging, correlation ID propagation across HTTP headers, Server Actions, and queue jobs. |

---

## 3. In-Depth Component Analysis & Justifications

### 3.1 Next.js 15 App Router vs Next.js 16 (Canary)

**Decision:** Pin to **Next.js 15.2.x**. Reject Next.js 16.

**Technical Rationale:**
- Next.js 16 is currently pre-release/canary software. Deploying an enterprise financial platform with Row-Level Security and financial reconciliation on a canary framework violates standard engineering risk controls.
- Next.js 15.2 provides full stability for React 19 features (async Request APIs, Server Actions with built-in dead-code elimination, unbundled client bundles).
- Next.js 15 introduces `cookies()`, `headers()`, and `params` as asynchronous Promises, eliminating unintended synchronous request waterfall rendering and enforcing non-blocking I/O.
- Turbopack in Next.js 15 has reached production maturity for local development and build pipelines, cutting HMR times under 100ms.

### 3.2 Drizzle ORM vs Prisma ORM

**Decision:** Standardize exclusively on **Drizzle ORM**.

**Evaluation Comparison:**
1. **Engine Overhead & Cold Starts:** Prisma utilizes a compiled Rust binary engine (`prisma-query-engine`). In serverless environments (Vercel, AWS Lambda), this causes 150ms–300ms cold start latency and significant memory inflation (~40MB base). Drizzle is a pure TypeScript query compiler with zero engine overhead (<2KB footprint, <5ms cold start).
2. **Session Variable / RLS Compatibility:** Multi-tenant RLS requires running `SET LOCAL app.current_tenant_id = $1` inside an interactive transaction. Prisma's `$queryRaw` handling within `$transaction` introduces connection pooling race conditions and inconsistent connection pinning across connection poolers (PgBouncer). Drizzle provides native client session wrapping (`db.transaction(async (tx) => { ... })`) that executes seamlessly over WebSocket pool connections.
3. **TypeScript Safety & Schema Autonomy:** Drizzle schemas are pure TypeScript files (`schema.ts`), allowing type reuse, custom Zod schema derivation via `drizzle-zod`, and arbitrary composite foreign key definitions without proprietary DSL syntax (`schema.prisma`).

### 3.3 Database Connection Architecture: Neon WebSocket Pooler vs HTTP Fetch

**Critical Technical Constraint:**
Neon offers two connection drivers:
- **Stateless HTTP Fetch (`@neondatabase/serverless` via `neon()`):** Sends individual SQL strings over HTTPS POST. Every query executes in a completely stateless, distinct database backend session.
- **WebSocket Pooler (`Pool` / `Client` via `neonConfig.webSocketConstructor`):** Establishes an RFC-6455 WebSocket connection to Neon's proxy, which maintains a persistent, stateful TCP connection to PgBouncer.

**Failure Mode of HTTP Driver:**
If `SET LOCAL app.current_tenant_id = 'tenant-123'` is executed over the stateless HTTP fetch driver, the connection is immediately terminated. The subsequent query (`SELECT * FROM customers`) executes in a brand new session where `app.current_tenant_id` is unset (`NULL`). Under fail-closed RLS (`current_setting('app.current_tenant_id', true)`), this returns empty sets or throws permission errors.

**Engineered Resolution:**
Bizora exclusively uses the **WebSocket connection pool** (`new Pool({ connectionString: env.DATABASE_URL })`) wrapped with `drizzle-orm/neon-serverless`. Every multi-tenant operation executes inside `db.transaction()` where:
```typescript
await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${businessId}, true);`);
```
The session variable is strictly scoped to the transaction lifetime and cannot bleed into subsequent pooled connections.

### 3.4 Authentication Architecture: `iron-session` vs External Auth (Clerk, Auth0, Supabase Auth)

**Decision:** Implement self-contained authentication using **`iron-session` with Argon2id** password hashing.

**Architectural Rationale:**
1. **Zero External Dependency:** External auth providers (Clerk, Auth0, WorkOS) introduce network hops on critical paths, external billing liabilities, and availability dependencies. A SaaS business recovery engine must operate even if an external identity vendor experiences downtime.
2. **Stateless Sealed Tokens:** `iron-session` seals session data into an encrypted, authenticated cookie (AES-256-GCM) signed with a 32-character secret.
3. **Direct Database Ownership:** User credentials, tenant memberships, and roles (`owner`, `manager`, `analyst`) reside directly in Bizora's PostgreSQL `users` and `business_users` tables, subject to ACID transactions and backup routines.
4. **Argon2id Protection:** Password hashing utilizes Argon2id (RFC 9106) with memory cost $m=65536$ (64MB), time cost $t=3$, and parallelism $p=4$, rendering GPU-based offline dictionary attacks computationally infeasible.

### 3.5 AI Gateway & Model Orchestration

**Decision:** Vercel AI SDK (`ai`) with **Anthropic Claude 3.5 Sonnet** as primary reasoning engine and **Google Gemini 1.5 Pro** as automated failover.

**Architectural Rules:**
1. **Strict Structured Output:** All LLM invocations execute through `generateObject()` constrained by Zod schemas. Free-form text generation (`generateText()`) is forbidden for analytical outputs.
2. **Deterministic Context Injection:** Prompts receive only pre-calculated, deterministic metrics generated by the TypeScript Financial Engine (e.g., `days_since_last_order`, `historical_aov_minor_units`, `churn_risk_score`). The AI is strictly barred from computing financial totals, margins, or aggregates.
3. **Audited Prompt Versioning:** Every AI prompt template is stored in versioned TypeScript modules. Outgoing prompts, incoming completions, token counts, and latency are logged to the immutable `ai_audit_logs` table.

---

## 4. Environment Configuration & Secret Management

All environment variables are validated at startup using `@t3-oss/env-nextjs` and `zod`. Application startup fails immediately with descriptive schema errors if any required key is missing or invalid.

```typescript
// src/lib/env.ts (Architectural Specification)
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().startsWith("postgres://"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    REDIS_URL: z.string().url(),
    ANTHROPIC_API_KEY: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    STORAGE_ENDPOINT: z.string().url().optional(),
    STORAGE_ACCESS_KEY: z.string().min(1),
    STORAGE_SECRET_KEY: z.string().min(1),
    STORAGE_BUCKET_NAME: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    REDIS_URL: process.env.REDIS_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
    STORAGE_BUCKET_NAME: process.env.STORAGE_BUCKET_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
});
```

---

## 5. Technology Stack Approval & Sign-Off Checklist

- [x] Node.js 22 LTS / 24 LTS verified compatible across all libraries.
- [x] Next.js 15.2.x chosen over unstable Next.js 16.
- [x] Drizzle ORM selected for zero cold start and native PostgreSQL RLS compatibility.
- [x] Neon WebSocket connection pooling mandated to guarantee transaction session isolation.
- [x] Stateless encrypted cookies (`iron-session`) chosen over vendor-locked auth.
- [x] Vercel AI SDK with Zod schema enforcement mandated for all AI operations.
- [x] Zero application implementation performed in this phase.
