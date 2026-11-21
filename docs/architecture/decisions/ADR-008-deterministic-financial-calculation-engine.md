# ADR-008: DETERMINISTIC FINANCIAL CALCULATION ENGINE

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Financial Systems Architect  

---

## Context & Problem
Generative AI and Large Language Models (LLMs) are inherently probabilistic and non-deterministic. Permitting an AI to independently calculate or assert authoritative financial figures risks hallucinations, numerical inconsistencies, and legal liability for business intelligence software.

## Decision
Enforce strict **Separation of Deterministic Calculations from AI Intelligence**:
1. All authoritative financial figures (Gross Sales, Net Sales, Settled Orders, AOV, Cash Collected, Lapsed Quotation Totals) must be calculated exclusively by pure, deterministic TypeScript functions and PostgreSQL aggregations.
2. Calculations use integer minor units with zero floating-point math.
3. The AI service is strictly a **consumer** of verified, pre-computed numerical summaries. It is passed verified metrics as read-only context to synthesize plain-English narrative summaries.
4. The AI is structurally prohibited from altering or asserting authoritative financial figures.

## Alternatives Evaluated
1. **AI-Driven Financial Query Agents (e.g. Text-to-SQL):** Rejected for authoritative metrics. High risk of incorrect SQL aggregation clauses or schema misunderstandings producing erroneous numbers.
2. **Client-Side Financial Math:** Rejected. Duplicates logic across platforms and risks client-side manipulation.

## Consequences & Trade-offs
* **Advantages:** 100% mathematical accuracy, reproducible financial audits, zero AI hallucinations on business revenue figures.
* **Disadvantages:** Requires maintaining a dedicated, tested suite of mathematical service functions in `src/server/services/financial.ts`.
* **Revisit Condition:** None. This is an unalterable core architectural requirement.
