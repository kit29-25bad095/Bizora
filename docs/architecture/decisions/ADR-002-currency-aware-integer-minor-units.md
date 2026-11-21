# ADR-002: CURRENCY-AWARE INTEGER MINOR-UNIT MONETARY MODELING

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Financial Systems Architect  

---

## Context & Problem
JavaScript floating-point arithmetic (`0.1 + 0.2 === 0.30000000000000004`) causes precision loss, rounding discrepancies, and financial inaccuracies when calculating retail sales, quotation totals, and refunds. Furthermore, retail businesses operate across international currencies with varying minor-unit decimal exponents (e.g. USD has 2 decimals, JPY has 0 decimals, KWD has 3 decimals).

## Decision
Represent all monetary values as integer minor units (`amount_minor_units: BIGINT`) at the database, service, and API layers. Every financial record is associated with an explicit ISO 4217 currency code. The system prohibits floating-point data types (`float`, `double`) in all financial schemas. Monetary formatting for display is performed exclusively at the presentation edge using internationalization formatters based on the currency exponent.

## Alternatives Evaluated
1. **PostgreSQL `NUMERIC(12, 2)` / Arbitrary Precision Decimals:** Viable in database, but prone to conversion errors when serialized to JavaScript numbers.
2. **Standard Floating-Point Numbers (`FLOAT8`):** Rejected. Universal anti-pattern in financial software due to cumulative IEEE 754 precision drift.

## Consequences & Trade-offs
* **Advantages:** Absolute mathematical precision, zero rounding accumulation, exact integer additions and subtractions across high-volume transaction sets.
* **Disadvantages:** Division operations (e.g. AOV calculation) require explicit rounding policies (Banker's Rounding / Round Half to Even).
* **Revisit Condition:** When complex multi-currency conversion ledgers with dynamic exchange rates are introduced in future versions.
