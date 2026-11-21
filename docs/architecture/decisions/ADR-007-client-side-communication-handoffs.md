# ADR-007: CLIENT-SIDE COMMUNICATION HANDOFF ARCHITECTURE

**Status:** Approved in Principle  
**Date:** 2026-11-21  
**Deciders:** Principal Software Architect, Product Requirements Engineer  

---

## Context & Problem
Bizora V1 targets small retailers, hardware shops, and quotation traders. Automated messaging via the WhatsApp Business Cloud API or Twilio requires business verification, template approval lead times, monthly fees, and introduces delivery failure liabilities. Furthermore, small business relationships thrive on personal, owner-driven customer communication.

## Decision
Adopt a **Client-Side Handoff Architecture** for V1:
1. Bizora does not send automated external messages from its servers.
2. The platform generates standards-compliant URI protocol links:
   - **WhatsApp:** `https://wa.me/<E.164-phone>?text=<encoded_text>`
   - **Email:** RFC 6068 `mailto:<email>?subject=<subj>&body=<msg>`
3. Clicking "Open WhatsApp" or "Open Email" opens the owner's personal/business desktop or mobile app with pre-filled, approved content.
4. The system logs an immutable record in `communication_handoffs` capturing `handoff_initiated_at`.
5. The UI strictly labels the status as **"Handoff Initiated"**; it is structurally barred from displaying "Sent" or "Delivered".

## Alternatives Evaluated
1. **Automated WhatsApp Cloud API Dispatch:** Rejected for V1. High operational complexity, credit card verification hurdles for small shops, template pre-approval delays.
2. **Automated SMTP / SendGrid Email Dispatch:** Rejected for V1. Spam filter issues with generic store domains; lacks the high open-rate of personal WhatsApp communication.

## Consequences & Trade-offs
* **Advantages:** Zero messaging API costs, zero deliverability liability, instant owner review, personal customer relationship preservation.
* **Disadvantages:** Bizora cannot track whether the owner clicked "Send" inside WhatsApp or whether the customer received/read the message.
* **Revisit Condition:** In V2, when tenants opt into automated enterprise messaging via WhatsApp Business Cloud API.
