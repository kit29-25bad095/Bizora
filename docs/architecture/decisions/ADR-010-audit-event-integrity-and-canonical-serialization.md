# ADR-010: AUDIT EVENT INTEGRITY AND CANONICAL SERIALIZATION

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Application Security Architect  

---

## Context & Problem
Regulatory compliance, internal security investigations, and financial dispute resolution require an auditable trail of all administrative and financial actions. If audit logs can be updated or deleted by application users, or if formatting discrepancies break hash verification across runtime environments, the audit trail is legally and technically worthless.

## Decision
Enforce **Audit Ledger Immutability with RFC 8785 Hash Chaining**:
1. Application database connections (`bizora_app`) possess zero `UPDATE`, `DELETE`, or `TRUNCATE` privileges on the `audit_events` table.
2. Every audit row computes a SHA-256 cryptographic digest binding the previous event's hash, tenant ID, sequence number, action, timestamp, and payload hash.
3. Payloads are canonicalized using the **RFC 8785 JSON Canonicalization Scheme (JCS)** prior to hashing, eliminating key-sorting or whitespace discrepancies across different JSON stringifiers.
4. Retention periods are separated between hot database storage (12 months) and statutory archival storage, pending jurisdictional legal review.

## Alternatives Evaluated
1. **Standard Unhashed Logging Table:** Rejected. Fails to provide mathematical proof of tamper detection.
2. **Blockchain / Distributed Ledger:** Rejected. Extreme latency, unnecessary transaction fees, and operational overkill for multi-tenant SaaS governance.

## Consequences & Trade-offs
* **Advantages:** Verifiable mathematical tamper detection, strict database-level protection against compromised application connections.
* **Disadvantages:** Hash chaining detects alterations but cannot prevent catastrophic table truncation by a superuser without external WORM backups (addressed via daily chain-head anchoring in Stage B).
* **Revisit Condition:** When specific jurisdictional requirements mandate third-party certified notarization or HSM signing.
