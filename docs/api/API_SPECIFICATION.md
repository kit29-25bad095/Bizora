# BIZORA — API SPECIFICATION & SERVER ACTION CONTRACTS

**Document Version:** 1.0.0  
**Status:** Approved Architectural Specification  
**Date:** 2026-11-21  
**Project:** Bizora ("Move Your Business Forward")  
**Framework:** Next.js 15 App Router (React Server Actions + HTTP Route Handlers)  

---

## 1. Architectural Principles & Protocol Boundaries

Bizora adopts **React Server Actions as its primary RPC mechanism** for mutations and data fetching in React Server Components, complemented by **standard HTTP Route Handlers** for streaming file uploads and system health endpoints.

1. **Server Actions First:** Eliminates redundant REST/GraphQL boilerplate, provides end-to-end type safety, native CSRF token validation via Next.js Host headers, and seamless optimistic UI bindings.
2. **Standard Result Envelope:** Every Server Action returns a uniform discriminated union type (`ActionResult<T>`), guaranteeing consistent client-side error handling without unexpected unhandled exceptions.
3. **Zod Input Validation:** Every incoming parameter payload is validated using Zod schemas before touching domain logic or database transactions.
4. **Tenant Context Injection:** Actions extract and verify tenant membership from the encrypted session cookie, binding execution to `withTenantContext(businessId, ...)`.

---

## 2. Standard Result Envelope & Error Standards

```typescript
// src/types/api.ts
export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionError = {
  success: false;
  error: {
    code: 
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

export type ActionResult<T> = ActionSuccess<T> | ActionError;
```

---

## 3. Server Action Contracts

### 3.1 Authentication & Tenancy Domain

#### `loginAction`
- **Purpose:** Authenticates user via email and password, establishing an encrypted `iron-session` cookie.
- **Input Schema:**
  ```typescript
  const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  ```
- **Returns:** `ActionResult<{ userId: string; defaultBusinessId: string }>`

#### `switchTenantAction`
- **Purpose:** Switches active tenant context for a multi-tenant user.
- **Input Schema:**
  ```typescript
  const SwitchTenantSchema = z.object({
    businessId: z.string().uuid(),
  });
  ```
- **Returns:** `ActionResult<{ businessId: string; role: "owner" | "manager" | "analyst" }>`

---

### 3.2 Ingestion & Import Domain

#### `initiateImportAction`
- **Purpose:** Registers an uploaded CSV/XLSX file in S3/R2 and queues the asynchronous chunking/parsing job.
- **Input Schema:**
  ```typescript
  const InitiateImportSchema = z.object({
    storagePath: z.string().min(1),
    fileName: z.string().min(1),
    fileSizeBytes: z.number().positive().max(26214400), // 25MB max per [REQ-PRD-004] and [REQ-SRS-009]
    sourceType: z.enum(["retail_csv", "quote_xlsx", "generic_tabular"]),
    columnMapping: z.record(z.string(), z.string()), // e.g. { "Invoice No": "external_transaction_id" }
  });
  ```
- **Returns:** `ActionResult<{ importBatchId: string; status: "uploaded"; rollbackExpiresAt: string }>`

#### `executeImportRollbackAction`
- **Purpose:** Authorizes the deletion of all records created by an import batch within its 24-hour window. Requires `owner` role.
- **Input Schema:**
  ```typescript
  const RollbackSchema = z.object({
    importBatchId: z.string().uuid(),
    reason: z.string().min(5),
  });
  ```
- **Returns:** `ActionResult<{ importBatchId: string; deletedTransactions: number; rolledBackAt: string }>`

---

### 3.3 Analytics & Financial Intelligence Domain

#### `getInactivitySummaryAction`
- **Purpose:** Computes deterministic customer inactivity cohorts and revenue at risk.
- **Input Schema:**
  ```typescript
  const InactivitySummarySchema = z.object({
    thresholdDays: z.number().int().min(14).default(45),
  });
  ```
- **Returns:**
  ```typescript
  ActionResult<{
    cohorts: {
      daysInactive: number;
      customerCount: number;
      atRiskRevenueMinorUnits: string; // Serialized BigInt
    }[];
    totalAtRiskMinorUnits: string;
    currency: string;
  }>
  ```

#### `getQuotePipelineAction`
- **Purpose:** Retrieves open, expiring, and stalled customer quotations.
- **Input Schema:**
  ```typescript
  const QuotePipelineSchema = z.object({
    status: z.enum(["all", "open", "expiring_soon", "expired"]).default("open"),
    limit: z.number().int().min(1).max(100).default(50),
  });
  ```
- **Returns:** `ActionResult<{ quotes: QuotationSummaryDTO[]; totalPipelineMinorUnits: string }>`

---

### 3.4 Recovery & Human-in-the-Loop Dispatch Domain

#### `generateRecoveryDraftsAction`
- **Purpose:** Triggers AI synthesis of customer recovery messages based on deterministic inactivity/quote metrics.
- **Input Schema:**
  ```typescript
  const GenerateDraftsSchema = z.object({
    targetArchetype: z.enum(["retail_inactivity", "quote_followup"]),
    customerIds: z.array(z.string().uuid()).min(1).max(50),
  });
  ```
- **Returns:** `ActionResult<{ generatedCount: number; draftIds: string[] }>`

#### `approveRecoveryDraftAction`
- **Purpose:** Explicit human approval of an AI-generated recovery draft. Strictly enforced: **Owner Role Only**.
- **Input Schema:**
  ```typescript
  const ApproveDraftSchema = z.object({
    draftId: z.string().uuid(),
    editedBody: z.string().min(10).optional(), // Allows owner edits prior to approval
    editedSubject: z.string().optional(),
  });
  ```
- **Returns:** `ActionResult<{ draftId: string; status: "approved"; approvedAt: string }>`

#### `rejectRecoveryDraftAction`
- **Purpose:** Rejection of an AI-generated recovery draft with feedback.
- **Input Schema:**
  ```typescript
  const RejectDraftSchema = z.object({
    draftId: z.string().uuid(),
    reason: z.string().min(3),
  });
  ```
- **Returns:** `ActionResult<{ draftId: string; status: "rejected" }>`

---

### 3.5 Client-Side Communication Handoff Domain

#### `initiateHandoffAction`
- **Purpose:** Generates a sanitized client-side URL (`wa.me` or `mailto:`) for an approved draft and records a `communication_handoffs` event.
- **Input Schema:**
  ```typescript
  const InitiateHandoffSchema = z.object({
    draftId: z.string().uuid(),
  });
  ```
- **Returns:**
  ```typescript
  ActionResult<{
    handoffId: string;
    channel: "whatsapp" | "email";
    handoffUrl: string; // e.g. "https://wa.me/15551234567?text=..."
    recipientIdentifier: string;
  }>
  ```

#### `recordHandoffOutcomeAction`
- **Purpose:** Records user-confirmed outcome after returning from WhatsApp/Email client.
- **Input Schema:**
  ```typescript
  const RecordOutcomeSchema = z.object({
    handoffId: z.string().uuid(),
    outcome: z.enum(["sent_confirmed", "customer_replied", "cancelled"]),
  });
  ```
- **Returns:** `ActionResult<{ handoffId: string; outcome: string; recordedAt: string }>`

---

## 4. HTTP Route Handlers

### 4.1 `POST /api/upload/presign`
- **Purpose:** Generates an S3 pre-signed upload URL for direct-to-storage client upload of large CSV/XLSX files, bypassing serverless memory and timeout bottlenecks.
- **Headers:** Requires valid session cookie.
- **Payload:** `{ fileName: string, fileSizeBytes: number, fileType: string }`
- **Response:** `{ presignedUrl: string, storagePath: string }`

### 4.2 `GET /api/health`
- **Purpose:** Infrastructure liveness and readiness probe for container orchestrators and uptime monitors.
- **Checks:** Database connection ping, Redis ping.
- **Response:** `200 OK` with JSON `{ status: "healthy", timestamp: string }` or `503 Service Unavailable`.
