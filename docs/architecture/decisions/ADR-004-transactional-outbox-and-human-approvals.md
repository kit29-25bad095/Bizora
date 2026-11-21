# ADR-004: TRANSACTIONAL OUTBOX AND HUMAN APPROVAL SAFETY

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Application Security Architect  

---

## Context & Problem
Bizora incorporates AI-assisted recovery message drafting. Autonomous outbound messaging risks dispatching inaccurate discounts, erroneous customer tone, or inappropriate communications. Furthermore, background dispatch operations must guarantee reliable state persistence without message duplication or phantom execution if a worker crashes.

## Decision
Enforce a **Mandatory Human Approval Gatekeeper** coupled with the **Transactional Outbox Pattern**:
1. Zero customer communications may be sent autonomously.
2. Campaign drafts exist in an immutable versioned structure (`campaign_draft_versions`).
3. An authorized user with `role = 'owner'` must explicitly approve a draft.
4. Approval executes within an atomic database transaction: locks draft, transitions status to `approved`, writes an immutable approval record, and enqueues an outbox job in `dispatch_jobs`.
5. Background workers claim jobs atomically using `FOR UPDATE SKIP LOCKED` with expiring lease tokens.
6. Editing an approved draft immediately supersedes the version, invalidates previous approvals, and forces re-approval.

## Alternatives Evaluated
1. **Direct In-Line API Dispatching from Web Request:** Rejected. Web request timeouts can drop messages or double-send on client retries.
2. **Autonomous AI Communication:** Rejected. Prohibited by core safety rule (Rule 10).
3. **Pure Redis Queue (without database persistence):** Rejected. Risk of message loss during worker or Redis node restarts.

## Consequences & Trade-offs
* **Advantages:** Absolute business owner oversight, zero runaway messaging liability, guaranteed transactional consistency between approval records and outbox state.
* **Disadvantages:** Introduces a human review step in the recovery workflow (mitigated by streamlined approval drawer UI).
* **Revisit Condition:** When customer opt-in automated low-risk notifications (e.g. appointment reminders) are introduced in future versions.
