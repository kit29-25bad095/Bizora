import { describe, it, expect } from "vitest";
import {
  generateCustomerRecoveryDraft,
  generateQuotationFollowupDraft,
  createHandoffLink,
  summarizeRecoveryOpportunities,
} from "@/lib/engine/recovery";
import { Customer, Quotation, RecoveryDraft } from "@/types/domain";
import { CustomerDormancyAssessment } from "@/types/engine";

describe("Recovery Workflow & Human-in-the-Loop Safety Gatekeeper", () => {
  const mockCustomer: Customer = {
    id: "cust-1",
    businessId: "biz-1",
    name: "Apex Woodworking",
    phone: "+15551234567",
    email: "owner@apexwood.com",
    tags: ["Trade"],
    firstSeenAt: "2025-01-01T00:00:00Z",
    lastActivityAt: "2026-06-01T00:00:00Z",
    totalSpendMinorUnits: 500000n,
    totalOrders: 5,
    averageOrderValueMinorUnits: 100000n,
    status: "active",
  };

  const mockAssessment: CustomerDormancyAssessment = {
    customerId: "cust-1",
    customerName: "Apex Woodworking",
    totalSpendMinorUnits: 500000n,
    totalOrders: 5,
    lastPurchaseDate: "2026-06-01T00:00:00Z",
    daysSinceLastPurchase: 90,
    averageCycleDays: 30,
    cycleStandardDeviationDays: 5,
    cycleMultiplier: 3.0,
    dormancyScore: 88,
    riskLevel: "critical",
    explanation: "Inactive for 90 days (3.0x cycle).",
    estimatedOpportunityLossMinorUnits: 200000n,
  };

  it("generates an initial recovery draft marked strictly as pending_approval", () => {
    const draft = generateCustomerRecoveryDraft(mockCustomer, mockAssessment, "Apex Hardware");

    expect(draft.status).toBe("pending_approval");
    expect(draft.customerId).toBe("cust-1");
    expect(draft.suggestedChannel).toBe("whatsapp");
    expect(draft.aiRiskScore).toBe(88);
    expect(draft.draftBody).toContain("Apex Woodworking");
    expect(draft.approvedAt).toBeUndefined();
  });

  it("strictly prohibits generating client-side handoff links for unapproved drafts", () => {
    const unapprovedDraft: RecoveryDraft = {
      id: "draft-unapproved",
      businessId: "biz-1",
      customerId: "cust-1",
      customerName: "Apex Woodworking",
      recipientIdentifier: "+15551234567",
      suggestedChannel: "whatsapp",
      draftBody: "Check in message",
      aiRationale: "High churn risk",
      aiRiskScore: 80,
      aiPromptVersion: "v1.2",
      status: "pending_approval", // Unapproved!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(() => createHandoffLink(unapprovedDraft, "user-owner-001")).toThrow(
      "Cannot generate handoff link for an unapproved draft. Human owner sign-off required."
    );
  });

  it("generates sanitized wa.me handoff URI once draft is explicitly approved by owner", () => {
    const approvedDraft: RecoveryDraft = {
      id: "draft-approved",
      businessId: "biz-1",
      customerId: "cust-1",
      customerName: "Apex Woodworking",
      recipientIdentifier: "+15551234567",
      suggestedChannel: "whatsapp",
      draftBody: "Hello Apex Woodworking! Checking in from Apex Hardware.",
      aiRationale: "High churn risk",
      aiRiskScore: 80,
      aiPromptVersion: "v1.2",
      status: "approved", // Approved!
      approvedByUserId: "user-owner-001",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { handoff, url } = createHandoffLink(approvedDraft, "user-owner-001");

    expect(handoff.channel).toBe("whatsapp");
    expect(handoff.userConfirmedOutcome).toBe("unconfirmed");
    expect(url).toContain("https://wa.me/15551234567?text=");
    expect(url).toContain(encodeURIComponent("Hello Apex Woodworking! Checking in from Apex Hardware."));
  });

  it("generates sanitized mailto handoff URI with subject and body for email drafts", () => {
    const emailDraft: RecoveryDraft = {
      id: "draft-email",
      businessId: "biz-1",
      customerId: "cust-1",
      customerName: "Apex Woodworking",
      recipientIdentifier: "owner@apexwood.com",
      suggestedChannel: "email",
      draftSubject: "Checking in from Apex Hardware",
      draftBody: "Hello from Apex Hardware. We would love to check in.",
      aiRationale: "Customer inactive",
      aiRiskScore: 75,
      aiPromptVersion: "v1.2",
      status: "approved",
      approvedByUserId: "user-owner-001",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { url } = createHandoffLink(emailDraft, "user-owner-001");

    expect(url).toContain("mailto:owner@apexwood.com?subject=");
    expect(url).toContain(encodeURIComponent("Checking in from Apex Hardware"));
    expect(url).toContain(encodeURIComponent("Hello from Apex Hardware. We would love to check in."));
  });
});
