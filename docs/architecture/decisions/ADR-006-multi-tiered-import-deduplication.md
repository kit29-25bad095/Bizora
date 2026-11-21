# ADR-006: MULTI-TIERED IMPORT DEDUPLICATION AND RECONCILIATION

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Database Architect  

---

## Context & Problem
Retailers frequently import overlapping date ranges from POS systems. Treating `customer_phone + date + amount` as an unquestioned unique transaction key risks dropping legitimate separate purchases (e.g., a customer making two identical $10 cash purchases on the same day). Conversely, ignoring duplicate detection causes double-counting of store revenue.

## Decision
Implement a **Multi-Tiered Deduplication & Reconciliation Policy**:
1. **Level 1 (Deterministic Source ID Match):** If an incoming transaction contains an external invoice or receipt ID that matches an existing record for that tenant, it is treated as a deterministic duplicate. The user can select `Skip` (default) or `Update`.
2. **Level 2 (Ambiguous Match Review):** Rows lacking external IDs that match an existing record on `(customer_phone, transaction_date_day, amount_minor_units)` are flagged as **"Ambiguous Matches"** in the reconciliation modal for explicit owner confirmation.
3. **Atomic Commit & Rollback:** Imports execute atomically; users can roll back an import batch within 24 hours provided no downstream quotation conversions or financial settlements depend on it.

## Alternatives Evaluated
1. **Unconditional Rejection on Composite Key:** Rejected. Drops valid identical retail purchases.
2. **Blind Insertion of All Rows:** Rejected. Severely distorts revenue and customer analytics upon re-importing overlapping files.

## Consequences & Trade-offs
* **Advantages:** Absolute accounting precision, user control over ambiguous edge cases, fail-safe rollback capability.
* **Disadvantages:** Adds a reconciliation preview step during import when ambiguous matches occur.
* **Revisit Condition:** When direct automated API webhooks (Shopify/Tally) with authoritative UUIDs supersede manual CSV imports.
