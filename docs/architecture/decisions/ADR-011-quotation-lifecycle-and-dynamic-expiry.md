# ADR-011: QUOTATION LIFECYCLE AND DYNAMIC EXPIRY RULES

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Product Requirements Engineer  

---

## Context & Problem
Wholesale and retail quotation businesses face quotation leakage when issued price quotes are abandoned or forgotten. Imposing universal default expiration periods (e.g. 14 days) alienates merchants with custom contract terms (e.g. 30-day commodity price guarantees vs 48-hour hardware quotes). Furthermore, silent or automated status updates can confuse users if quote transmission was not confirmed.

## Decision
Establish an **Explicit Quotation Lifecycle with User-Defined Expiration**:
1. Every quotation requires an explicit, user-defined `valid_until_date` at creation; arbitrary system-wide defaults are prohibited.
2. Because Bizora V1 does not dispatch quotations directly, an authorized user must explicitly record transmission (`sent_at`, `sent_channel`).
3. Quotation states are strictly partitioned: `draft` -> `sent` -> `accepted` (converts to retail order) | `rejected` | `expired`.
4. Quotes where `status = 'sent' AND valid_until_date < CURRENT_DATE` are dynamically evaluated as expired in query views and flagged on the dashboard, with explicit transition to `expired` status.

## Alternatives Evaluated
1. **Universal 14-Day Default:** Rejected. Does not reflect real-world wholesale trade practices.
2. **Immediate Silent Deletion of Expired Quotes:** Rejected. Expired quote history is essential for customer lifetime tracking and recovery win-back campaigns.

## Consequences & Trade-offs
* **Advantages:** Accurate wholesale pipeline visibility, flexible merchant-specific quote validity, seamless quotation-to-order conversion.
* **Disadvantages:** Requires merchants to manually record quote transmission in V1 (mitigated by quick-action buttons in the UI).
* **Revisit Condition:** In V2, when automated quotation PDF delivery and direct online acceptance links are introduced.
