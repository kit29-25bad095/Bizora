import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMe } from "../src/app/api/auth/me/route";
import { GET as getHealth } from "../src/app/api/health/route";
import { GET as getFinancials } from "../src/app/api/financials/route";
import { GET as getCustomers, POST as createCustomer } from "../src/app/api/customers/route";
import { GET as getRisk } from "../src/app/api/risk/route";
import { GET as getOpportunities } from "../src/app/api/recovery/opportunities/route";
import { GET as getDrafts, POST as createDraft } from "../src/app/api/recovery/drafts/route";
import { PATCH as updateDraft } from "../src/app/api/recovery/drafts/[id]/route";
import { POST as approveDraft } from "../src/app/api/recovery/drafts/[id]/approve/route";
import { POST as generateHandoff } from "../src/app/api/recovery/handoff/route";
import { GET as getQuotations } from "../src/app/api/quotations/route";
import { GET as getTransactions } from "../src/app/api/transactions/route";
import { assertTenantAccess } from "../src/lib/auth/tenant-guard";
import { SessionUser } from "../src/lib/auth/session";
import { ForbiddenError } from "../src/lib/errors";

const tenantId = "11111111-1111-4111-8111-111111111111";

describe("Phase 12 — System Integration: Complete End-to-End Business Workflow", () => {
  let createdDraftId: string;

  // Step 1: Healthcheck & Authentication Integration
  it("Step 1: Authenticated session returns active user identity and tenant context", async () => {
    const healthRes = await getHealth();
    expect(healthRes.status).toBe(200);
    const healthBody = await healthRes.json();
    expect(healthBody.success).toBe(true);
    expect(healthBody.status).toBe("healthy");

    const meRes = await getMe();
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data.role).toBe("owner");
    expect(meBody.data.businessId).toBe(tenantId);
  });

  // Step 2: Revenue Performance & GAAP Accounting Integration
  it("Step 2: Backend retrieves and calculates deterministic revenue performance", async () => {
    const req = new NextRequest("http://localhost:3000/api/financials");
    const res = await getFinancials(req);
    const body = await res.json();
    if (res.status !== 200) {
      console.error("FINANCIALS_ERROR_DEBUG:", JSON.stringify(body));
    }
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // Verify mathematical GAAP reconciliation consistency
    const gross = BigInt(body.data.grossSalesMinorUnits);
    const discounts = BigInt(body.data.discountsMinorUnits);
    const taxes = BigInt(body.data.taxesMinorUnits);
    const net = BigInt(body.data.netSalesMinorUnits);

    expect(gross).toBeGreaterThan(0n);
    expect(net).toBe(gross - discounts);
    expect(body.data.dailySalesTrend.length).toBeGreaterThan(0);
  });

  // Step 3: Customer Management Integration
  it("Step 3: Customer directory is retrieved and searchable", async () => {
    const req = new NextRequest("http://localhost:3000/api/customers?status=all");
    const res = await getCustomers(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const firstCustomer = body.data[0];
    expect(firstCustomer.id).toBeDefined();
    expect(firstCustomer.name).toBeDefined();
    expect(firstCustomer.totalSpendMinorUnits).toBeDefined();
  });

  // Step 4: Statistical Inactivity & Churn Risk Detection Integration
  it("Step 4: Backend detects at-risk customers using personalized order cadences", async () => {
    const req = new NextRequest("http://localhost:3000/api/risk");
    const res = await getRisk(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Verify presence of at least one at-risk profile with statistical rationale
    const atRiskProfile = body.data.find(
      (p: { riskLevel: string }) => p.riskLevel === "critical" || p.riskLevel === "high"
    );
    expect(atRiskProfile).toBeDefined();
    expect(atRiskProfile.daysSinceLastPurchase).toBeGreaterThan(0);
    expect(atRiskProfile.explanation).toBeDefined();
    expect(BigInt(atRiskProfile.estimatedOpportunityLossMinorUnits)).toBeGreaterThan(0n);
  });

  // Step 5: Revenue Recovery Opportunities Integration
  it("Step 5: Aggregates recovery opportunities across accounts and quotes", async () => {
    const req = new NextRequest("http://localhost:3000/api/recovery/opportunities");
    const res = await getOpportunities(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(BigInt(body.data.totalAtRiskRevenueMinorUnits)).toBeGreaterThan(0n);
    expect(body.data.atRiskCustomerCount).toBeGreaterThan(0);
  });

  // Step 6 & 7: Draft Synthesis and Inline Editing Integration
  it("Step 6 & 7: Creates personalized recovery draft and supports inline editing", async () => {
    // 1. Create Draft
    const createReq = new NextRequest("http://localhost:3000/api/recovery/drafts", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cust-integration-001",
        customerName: "Integration Test Customer",
        customerPhone: "+15550001111",
        suggestedChannel: "whatsapp",
        draftBody: "Initial draft message for winback",
        aiRationale: "Inactive for 95 days (3x normal cycle)",
        aiRiskScore: 88,
      }),
    });

    const createRes = await createDraft(createReq);
    expect(createRes.status).toBe(201);

    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data.id).toBeDefined();
    expect(createBody.data.status).toBe("pending_approval");

    createdDraftId = createBody.data.id;

    // 2. Edit Draft Body inline before approval
    const patchReq = new NextRequest(
      `http://localhost:3000/api/recovery/drafts/${createdDraftId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          draftBody: "Refined human-reviewed message body for winback outreach",
        }),
      }
    );

    const patchRes = await updateDraft(patchReq, {
      params: Promise.resolve({ id: createdDraftId }),
    });
    expect(patchRes.status).toBe(200);

    const patchBody = await patchRes.json();
    expect(patchBody.success).toBe(true);
    expect(patchBody.data.draftBody).toBe(
      "Refined human-reviewed message body for winback outreach"
    );
  });

  // Step 8: Human-in-the-Loop Owner Approval and Client Handoff Integration
  it("Step 8: Enforces Owner sign-off and generates client-side handoff URL (no autonomous dispatch)", async () => {
    // 1. Attempting handoff BEFORE approval must be rejected by backend
    const earlyHandoffReq = new NextRequest("http://localhost:3000/api/recovery/handoff", {
      method: "POST",
      body: JSON.stringify({ draftId: createdDraftId }),
    });

    const earlyHandoffRes = await generateHandoff(earlyHandoffReq);
    expect(earlyHandoffRes.status).toBe(400); // Bad Request: draft must be approved first

    // 2. Owner approves the draft
    const approveReq = new NextRequest(
      `http://localhost:3000/api/recovery/drafts/${createdDraftId}/approve`,
      { method: "POST" }
    );

    const approveRes = await approveDraft(approveReq, {
      params: Promise.resolve({ id: createdDraftId }),
    });
    expect(approveRes.status).toBe(200);

    const approveBody = await approveRes.json();
    expect(approveBody.success).toBe(true);
    expect(approveBody.data.status).toBe("approved");

    // 3. Post-approval: Handoff URL is generated
    const handoffReq = new NextRequest("http://localhost:3000/api/recovery/handoff", {
      method: "POST",
      body: JSON.stringify({ draftId: createdDraftId }),
    });

    const handoffRes = await generateHandoff(handoffReq);
    expect(handoffRes.status).toBe(200);

    const handoffBody = await handoffRes.json();
    expect(handoffBody.success).toBe(true);
    expect(handoffBody.data.handoff.channel).toBe("whatsapp");
    // Verify zero autonomous dispatch: URI scheme generated for client-side execution
    expect(handoffBody.data.url).toContain("https://wa.me/15550001111?text=");
  });

  // Step 9: Persistence Verification Across Queries
  it("Step 9: Verifies approved draft remains persisted in backend repository", async () => {
    const listReq = new NextRequest("http://localhost:3000/api/recovery/drafts?status=approved");
    const listRes = await getDrafts(listReq);
    expect(listRes.status).toBe(200);

    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);

    const found = listBody.data.find((d: { id: string }) => d.id === createdDraftId);
    expect(found).toBeDefined();
    expect(found.status).toBe("approved");
  });

  // Step 10: Multi-Tenant Boundary Enforcement Integration
  it("Step 10: Cross-tenant data access attempts are strictly rejected with ForbiddenError", () => {
    const userTenantA: SessionUser = {
      id: "user-a",
      businessId: tenantId,
      email: "user@tenant-a.com",
      name: "User Tenant A",
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    const foreignTenantId = "22222222-2222-4222-8222-222222222222";

    expect(() => assertTenantAccess(userTenantA, foreignTenantId)).toThrow(ForbiddenError);
    expect(() => assertTenantAccess(userTenantA, foreignTenantId)).toThrow(
      /Tenant boundary violation/
    );
  });
});
