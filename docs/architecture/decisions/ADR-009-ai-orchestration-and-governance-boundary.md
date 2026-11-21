# ADR-009: AI ORCHESTRATION AND GOVERNANCE BOUNDARY

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Application Security Architect  

---

## Context & Problem
Integrating Large Language Models into a business recovery platform introduces risks of PII data leakage, prompt injection vulnerabilities, malformed model outputs, and runaway API cost overruns.

## Decision
Establish a strict **AI Orchestration & Governance Boundary**:
1. **PII Sanitization:** Customer names, phone numbers, and individual order lines are stripped before constructing AI prompts. Prompts receive only anonymized, pre-aggregated statistical cohorts.
2. **Schema-Constrained Generation:** All AI responses must conform to strict validation schemas (Zod) enforcing typed JSON payloads: `{ summary, target_cohort, suggested_discount, drafts }`. Malformed outputs are rejected and retried once before failing gracefully.
3. **Monthly Tenant AI Quotas:** Monthly token budgets and analysis counts are tracked per tenant tier; exceeding quotas returns clean HTTP 429 warnings without interrupting core dashboard operations.
4. **Provider Neutrality:** The AI interface is abstracted in `src/lib/ai/interface.ts`, allowing models to be evaluated and selected during Phase 04 without coupling domain code to a specific proprietary vendor.

## Alternatives Evaluated
1. **Direct Unchecked LLM Text Output:** Rejected. Risk of broken formatting, hallucinated links, or unvalidated payloads breaking the UI.
2. **Passing Full Customer Database to LLM:** Rejected. Catastrophic data privacy violation under GDPR and global privacy standards.

## Consequences & Trade-offs
* **Advantages:** Absolute data privacy, type-safe UI rendering, predictable cloud operating margins.
* **Disadvantages:** Bounded prompt token budgets require careful prompt engineering and summarization of large cohorts.
* **Revisit Condition:** When custom fine-tuned on-premise local models (e.g. Ollama/vLLM) are evaluated for enterprise privacy tiers.
