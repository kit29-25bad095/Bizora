# BIZORA — DATABASE MAINTENANCE RUNBOOK

## 1. Routine Database Maintenance Tasks

| Maintenance Task | Frequency | Schedule | Command / Procedure |
| :--- | :---: | :---: | :--- |
| **VACUUM ANALYZE** | Weekly | Sunday 03:00 UTC | `VACUUM (VERBOSE, ANALYZE);` |
| **Index Bloat Inspection** | Monthly | First Sunday | Query `pg_stat_user_indexes` for bloat. |
| **REINDEX Concurrently** | Quarterly | Scheduled Window | `REINDEX TABLE CONCURRENTLY transactions;` |
| **Audit Ledger Verification** | Daily | Automated Job | `AuditService.verifyChainIntegrity()` |

## 2. Vacuuming & Dead Tuple Clean-up
```sql
-- Identify tables with highest dead tuple counts
SELECT relname, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Execute targeted vacuuming on transaction and customer tables
VACUUM ANALYZE transactions;
VACUUM ANALYZE customers;
VACUUM ANALYZE audit_events;
```

## 3. Connection Pool Sizing & Management
- Maximum connections configured in PostgreSQL: `max_connections = 150`.
- Application pool size per web node: `pool_size = 20`.
- PgBouncer / Neon connection pooling enabled in transaction mode for high-concurrency scaling.
