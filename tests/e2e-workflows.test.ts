import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getMe } from "../src/app/api/auth/me/route";
import { GET as getFinancials } from "../src/app/api/financials/route";
import { GET as getCustomers } from "../src/app/api/customers/route";
import { GET as getRisk } from "../src/app/api/risk/route";
import { GET as getOpportunities } from "../src/app/api/recovery/opportunities/route";
import { GET as getDrafts, POST as createDraft } from "../src/app/api/recovery/drafts/route";
import { PATCH as updateDraft } from "../src/app/api/recovery/drafts/[id]/route";
import { POST as approveDraft } from "../src/app/api/recovery/drafts/[id]/approve/route";
import { POST as generateHandoff } from "../src/app/api/recovery/handoff/route";

describe("Phase 13 — QA End-to-End Workflow Verification", () => {
  let e2eDraftId: string;

  // Workflow A — Business Dashboard
  it("Workflow A: User opens dashboard and receives verified metrics from backend", async () => {
    // 1. Session verification
    const meRes = await getMe();
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.success).toBe(true);
    expect(meBody.data.role).toBe("owner");

    // 2. Financial KPIs
    const req = new NextRequest("http://localhost:3000/api/financials");
    const finRes = await getFinancials(req);
    expect(finRes.status).toBe(200);
    const finBody = await finRes.json();
    expect(finBody.success).toBe(true);

    const gross = BigInt(finBody.data.grossSalesMinorUnits);
    const net = BigInt(finBody.data.netSalesMinorUnits);
    const discounts = BigInt(finBody.data.discountsMinorUnits);

    expect(gross).toBeGreaterThan(0n);
    expect(net).toBe(gross - discounts);
    expect(finBody.data.completedOrdersCount).toBeGreaterThan(0);
  });

  // Workflow B — Customer Intelligence
  it("Workflow B: Customer intelligence identifies inactive or at-risk customers", async () => {
    // 1. Directory retrieval
    const custReq = new NextRequest("http://localhost:3000/api/customers");
    const custRes = await getCustomers(custReq);
    expect(custRes.status).toBe(200);
    const custBody = await custRes.json();
    expect(custBody.data.length).toBeGreaterThan(0);

    // 2. Risk classification check
    const riskReq = new NextRequest("http://localhost:3000/api/risk");
    const riskRes = await getRisk(riskReq);
    expect(riskRes.status).toBe(200);
    const riskBody = await riskRes.json();
    expect(riskBody.success).toBe(true);
    expect(riskBody.data.length).toBeGreaterThan(0);

    // Verify statistical explanation format
    for (const profile of riskBody.data) {
      expect(profile.customerId).toBeDefined();
      expect(profile.customerName).toBeDefined();
      expect(profile.riskLevel).toBeDefined();
      expect(profile.explanation).toBeDefined();
    }
  });

  // Workflow C — Revenue Recovery
  it("Workflow C: Revenue recovery aggregates opportunities associated with customer accounts", async () => {
    const oppReq = new NextRequest("http://localhost:3000/api/recovery/opportunities");
    const oppRes = await getOpportunities(oppReq);
    expect(oppRes.status).toBe(200);
    const oppBody = await oppRes.json();
    expect(oppBody.success).toBe(true);

    expect(BigInt(oppBody.data.totalAtRiskRevenueMinorUnits)).toBeGreaterThan(0n);
    expect(oppBody.data.atRiskCustomerCount).toBeGreaterThan(0);
  });

  // Workflow D — Communication and Approval
  it("Workflow D: Generates draft, edits body, enforces approval, and prohibits automated dispatch", async () => {
    // 1. Generate Draft
    const createReq = new NextRequest("http://localhost:3000/api/recovery/drafts", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cust-e2e-001",
        customerName: "Workflow Test Client",
        customerEmail: "procurement@client.com",
        suggestedChannel: "email",
        draftSubject: "Checking in on hardware order",
        draftBody: "Hi there, wanted to follow up on your recent inquiry.",
        aiRationale: "Inactive for 68 days",
        aiRiskScore: 75,
      }),
    });

    const createRes = await createDraft(createReq);
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    expect(createBody.data.status).toBe("pending_approval");
    e2eDraftId = createBody.data.id;

    // 2. Edit Draft Body
    const editReq = new NextRequest(`http://localhost:3000/api/recovery/drafts/${e2eDraftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        draftBody: "Refined body: Following up on hardware supply inquiry with personalized volume pricing.",
      }),
    });
    const editRes = await updateDraft(editReq, {
      params: Promise.resolve({ id: e2eDraftId }),
    });
    expect(editRes.status).toBe(200);
    const editBody = await editRes.json();
    expect(editBody.data.draftBody).toContain("Refined body:");

    // 3. Reject premature handoff (Safety gate)
    const earlyHandoffReq = new NextRequest("http://localhost:3000/api/recovery/handoff", {
      method: "POST",
      body: JSON.stringify({ draftId: e2eDraftId }),
    });
    const earlyHandoffRes = await generateHandoff(earlyHandoffReq);
    expect(earlyHandoffRes.status).toBe(400);

    // 4. Owner approves draft
    const approveReq = new NextRequest(
      `http://localhost:3000/api/recovery/drafts/${e2eDraftId}/approve`,
      { method: "POST" }
    );
    const approveRes = await approveDraft(approveReq, {
      params: Promise.resolve({ id: e2eDraftId }),
    });
    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.data.status).toBe("approved");

    // 5. Authorized handoff URL generation
    const handoffReq = new NextRequest("http://localhost:3000/api/recovery/handoff", {
      method: "POST",
      body: JSON.stringify({ draftId: e2eDraftId }),
    });
    const handoffRes = await generateHandoff(handoffReq);
    expect(handoffRes.status).toBe(200);
    const handoffBody = await handoffRes.json();
    expect(handoffBody.data.handoff.channel).toBe("email");
    expect(handoffBody.data.url.startsWith("mailto:")).toBe(true);
  });

  // Workflow E — Persistence
  it("Workflow E: Verified changes remain persistently stored in backend state", async () => {
    const listReq = new NextRequest("http://localhost:3000/api/recovery/drafts?status=approved");
    const listRes = await getDrafts(listReq);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();

    const verified = listBody.data.find((d: { id: string }) => d.id === e2eDraftId);
    expect(verified).toBeDefined();
    expect(verified.status).toBe("approved");
    expect(verified.draftBody).toContain("Refined body:");
  });
});
