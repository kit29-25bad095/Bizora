# BIZORA — DATABASE MIGRATION STRATEGY & ZERO-DOWNTIME RUNBOOK

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Tooling:** Drizzle Kit + PostgreSQL 16+ on Neon Serverless  

---

## 1. Migration Lifecycle & Tooling Overview

Bizora utilizes **Drizzle Kit** for database schema management, migration generation, and execution. All migrations are tracked as raw, reviewed SQL files in version control under `drizzle/migrations/`.

```
┌────────────────────────┐      drizzle-kit generate      ┌─────────────────────────┐
│ src/lib/db/schema.ts   │ ─────────────────────────────▶ │ drizzle/migrations/     │
│ (TypeScript Schema)    │                                │ 0001_initial_schema.sql │
└────────────────────────┘                                └────────────┬────────────┘
                                                                       │
                                                             CI/CD Neon Ephemeral
                                                             Branch Dry-Run & Test
                                                                       │
                                                                       ▼
                                                          ┌─────────────────────────┐
                                                          │ Production Neon Postgres│
                                                          │ (drizzle-kit migrate)   │
                                                          └─────────────────────────┘
```

---

## 2. Zero-Downtime Schema Evolution: The Expand/Contract Pattern

In a 24/7 SaaS application, database migrations must never lock tables or break running application instances during rolling deployments.

### 2.1 The Two-Phase Migration Rule
Breaking schema changes (e.g. renaming a column, changing a type, dropping a table) must **never** occur in a single deployment. They must execute via the **Expand/Contract Pattern**:

```
PHASE 1: EXPAND (Deploy v1.1 DB + v1.1 App)
  1. Add new column/table as NULLABLE.
  2. Deploy application code that writes to BOTH old and new columns, reading from new.
  3. Backfill existing historical data from old column to new column asynchronously.

PHASE 2: CONTRACT (Deploy v1.2 DB + v1.2 App)
  4. Deploy application code that references ONLY the new column.
  5. Apply migration: Add NOT NULL constraint to new column.
  6. Drop the old deprecated column.
```

### 2.2 Prohibited Anti-Patterns in Production Migrations
| Prohibited SQL Operation | Why It Fails / Blocks | Approved Zero-Downtime Alternative |
| :--- | :--- | :--- |
| `ALTER TABLE ... ADD COLUMN ... NOT NULL;` (without default) | Acquires `ACCESS EXCLUSIVE` lock and fails if table has rows. | Add as nullable first $\rightarrow$ backfill $\rightarrow$ set `ALTER COLUMN SET NOT NULL`. |
| `CREATE INDEX ...;` | Holds share lock on table, blocking all concurrent writes. | Always use `CREATE INDEX CONCURRENTLY ...;`. |
| `ALTER TABLE ... RENAME COLUMN ...;` | Instantly breaks running application instances expecting old name. | Add new column $\rightarrow$ dual-write $\rightarrow$ backfill $\rightarrow$ deprecate old. |
| Large bulk `UPDATE` or `DELETE` in single transaction | Blows up transaction log, holds row locks, saturates replication. | Chunk updates into batches of 1,000–5,000 rows with pauses. |

---

## 3. Neon Ephemeral Branching in CI/CD

Neon's copy-on-write branching allows instantaneous, zero-cost creation of isolated database branches with full production data snapshots.

### 3.1 Automated CI Pipeline Workflow
Before any database migration is merged to `main`:
1. **Branch Creation:** GitHub Actions uses Neon CLI / API to create an ephemeral database branch from the latest production snapshot:
   ```bash
   neon branches create --name pr-${{ github.event.number }} --parent main
   ```
2. **Migration Dry-Run:** `pnpm drizzle-kit migrate` executes against the ephemeral branch.
3. **Integration Test Suite:** Playwright and Vitest test suites run against the migrated branch to verify zero query regression or RLS violations.
4. **Branch Destruction:** The ephemeral branch is deleted automatically upon pull request closure.

---

## 4. Migration Execution & Rollback Runbooks

### 4.1 Production Migration Execution Steps
1. Production migrations run **prior** to the deployment of new application container images.
2. Migrations execute via an isolated, one-off deployment task (`pnpm db:migrate`) using database credentials with DDL privileges.
3. The migration runner records applied migrations in the `__drizzle_migrations` metadata table.

### 4.2 Rollback Protocols
1. **Compensating Forward Migrations (Primary):** Rather than attempting destructive rollbacks (`DOWN` migrations), if a bug occurs in production, author and deploy a forward-fixing migration.
2. **Point-in-Time Recovery (Disaster Recovery):** If catastrophic schema corruption or accidental data drop occurs:
   - Identify the exact UTC timestamp $T_{drop}$ of the incident.
   - Use Neon Console or API to branch production to $T_{drop} - 10\text{ seconds}$.
   - Update `DATABASE_URL` in environment variables to point to the restored branch.
   - Recovery Time Objective (RTO): $< 15$ minutes. Recovery Point Objective (RPO): $< 1$ minute.
