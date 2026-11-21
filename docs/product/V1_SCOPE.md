# BIZORA — V1 SCOPE BOUNDARY DOCUMENT

**Document Reference:** BIZORA-SCOPE-V1.1  
**Status:** DRAFT FOR STAKEHOLDER REVIEW (REVISED)  
**Lifecycle Phase:** Phase 02 Requirements Engineering  
**Classification:** Product Scope Contract  
**Date:** 2026-11-21  

---

## 1. PURPOSE & PRINCIPLE

This document defines the strict functional and technical boundaries for **Bizora Version 1.0 (V1)**. It establishes an explicit contract between engineering, design, and business stakeholders regarding what is included, what is deferred, and what is strictly prohibited in the initial release.

**Governing Principle:** Do a few critical things exceptionally well. Maximize time-to-value for small retail and quotation-driven businesses by removing unnecessary complexity, external API dependencies, and automated sending liabilities.

---

## 2. IN-SCOPE CAPABILITIES (V1 COMMITMENTS)

The following capabilities are mandatory deliverables for Bizora V1:

### 2.1 Multi-Tenant SaaS Foundation
* Multi-tenant store account provisioning with isolated data boundaries (`business_id`).
* Store profile configuration: Business Name, Slug, Base Currency (ISO 4217), Operating Timezone.
* User roles: Store Owner (`owner`) and Staff Member (`member`).
* Email-based team invitations with single-use expiring invitation tokens.
* Centralized session revocation capability when roles change or memberships are revoked.

### 2.2 Retail & Quotation Customer Directory
* Aggregated retail customer profiles (Total Spend, Transaction Count, First Seen, Last Seen).
* Identification resolution prioritizing Phone (E.164) and Email.
* Customer Quotation pipeline tracking states: `draft`, `sent`, `accepted`, `rejected`, and `expired`.
* Dynamic quotation expiration tracking based on explicit user-defined `valid_until_date`.

### 2.3 Spreadsheet Ingestion Engine (CSV & Excel)
* Drag-and-drop file upload for `.csv`, `.xlsx`, and `.xls` formats (provisional limit: 25 MB).
* Interactive column mapping interface with 5-row preview.
* Intelligent auto-mapping suggestions for transaction dates, customer identifiers, and amounts.
* Date and currency normalization to integer minor units (e.g. cents, fils, pence, yen) and UTC timestamps.
* Multi-tiered duplicate detection: Deterministic match on External Source ID (`Skip` vs `Update`) and Ambiguous Match Review for matching date/customer/amount.
* Atomic batch commit with structured error reporting and conditional batch rollback capability.

### 2.4 Deterministic Retail Performance Analytics
* Executive KPIs calculated with 100% mathematical determinism:
  - Gross Sales (sum of all line-item quantities * unit price before deductions).
  - Net Sales (Gross Sales minus discounts and refunds).
  - Settled Payments (cleared funds).
  - Cash Collected (inflows during observation window).
  - Average Order Value (AOV).
  - Open vs Expired Quotation Values.
* Interactive time-series charts displaying daily and monthly sales trends.
* Pre-computed daily summary tables ensuring responsive dashboard load times.

### 2.5 Decision Intelligence & AI Assistance
* Statistical Customer Dormancy Scoring ($D \in [0, 100]$) using Z-Score calculations on purchase cycles, with documented caveats and low-history fallbacks.
* Clear explanatory context for why a customer was flagged as dormant or at-risk.
* Automated detection of lapsing high-value buyers and expiring customer quotations.
* AI-assisted campaign drafting producing tailored win-back messages and quote follow-ups.
* Strict output schema validation; AI is structurally barred from calculating or asserting authoritative financial figures.

### 2.6 Human-in-the-Loop Approval & Client Handoff Engine
* Immutable campaign draft versioning (`draft`, `pending_approval`, `approved`, `superseded`).
* Mandatory Human Gatekeeper Rule: Campaign drafts cannot generate handoff links without explicit approval from a user with the `owner` role.
* Editing any approved draft immediately supersedes the version and forces re-approval.
* Client-side URI protocol generation:
  - **WhatsApp Handoff:** Pre-populated `https://wa.me/<phone>?text=<encoded_text>` links.
  - **Email Handoff:** Standard RFC 6068 `mailto:<email>?subject=<subj>&body=<msg>` links.
* Immutable handoff logging recording `(business_id, draft_id, user_id, channel, handoff_initiated_at)`.
* UI labels strictly enforce "Handoff Initiated" (prohibiting claims of "Message Sent" or "Delivered").

### 2.7 Security, Governance & Subscription Caps
* Database-level tenant isolation objective.
* Append-only audit ledger recording administrative, approval, and handoff events.
* Fixed subscription tiers (`starter`, `growth`, `pilot`) with monthly AI analysis quotas.
* Manual pilot invoicing; automated payment processing excluded from V1.

---

## 3. STRICTLY OUT-OF-SCOPE FOR V1 (EXPLICIT NON-GOALS)

The following capabilities are deliberately excluded from V1 to prevent scope creep, third-party operational dependencies, and premature complexity:

| Capability / Feature | Reason for Exclusion in V1 | Future Target |
| :--- | :--- | :---: |
| **Automated Outbound Messaging** (e.g., Twilio SMS, WhatsApp Business Cloud API) | High API setup overhead, per-message costs, template approval delays, and deliverability liability. V1 relies on personal owner handoffs. | V2 |
| **Direct Live Webhook Integrations** (Shopify, Razorpay, Stripe, Tally, Square) | Third-party OAuth and webhook synchronization complexity. V1 focuses on robust CSV/Excel spreadsheet imports. | V2 / V3 |
| **Automated In-App Subscription Billing** (Stripe Checkout / Customer Portal) | Unnecessary for closed pilot validation. Pilot billing will be handled manually via external invoicing. | V2 |
| **Subscription Contract Accounting** (MRR/ARR, churn curves, recurring billing engines) | V1 focuses exclusively on Retail, E-Commerce, and Quotations. SaaS recurring billing is deferred. | Future Tier |
| **Professional Services Accounting** (Billable hours, timesheets, work-in-progress, milestone billing) | Outside V1 target retail archetype. | Future Tier |
| **Multi-Currency Store Reporting** (Dynamic FX rates, multi-currency conversion in one store) | High accounting complexity. V1 locks each store tenant to a single base currency. | V3 |
| **Automated Inventory & Stock Sync** (Warehouse management, stock level decrementing) | Bizora is a revenue recovery intelligence platform, not an ERP or inventory management system. | Non-Goal |
| **Mobile Native Applications** (iOS App Store / Google Play Store native builds) | Web application is fully responsive on mobile browsers (`wa.me` links trigger native WhatsApp app directly). | Long-Term |

---

## 4. FUTURE INTEGRATION ROADMAP (CANDIDATES, NOT COMMITMENTS)

The following integrations are architecturally accommodated for future phases, but are **not** committed deliverables for V1:

1. **WhatsApp Business Cloud API (Meta):** Automated template dispatching with delivery/read receipt webhooks once the customer base reaches sufficient scale.
2. **Tally ERP / Busy Accounting Connectors:** Direct desktop/cloud connector utilities for retail and wholesale accounting systems.
3. **Shopify & WooCommerce Webhooks:** Real-time order and abandoned cart event streaming.
4. **Razorpay & Stripe Inbound Webhooks:** Automated ingestion of digital payment settlements.

---

## 5. SCOPE CONCURRENCE & APPROVAL

By approving this document, stakeholders confirm that Bizora V1 success will be judged strictly against the In-Scope capabilities defined in Section 2, and that features listed in Section 3 will not block V1 production deployment.
