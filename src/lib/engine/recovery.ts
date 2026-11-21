/**
 * REVENUE RECOVERY & DRAFT SYNTHESIS ENGINE
 * Generates personalized recovery drafts for inactive customers and expired quotes.
 * Strictly enforces Human-in-the-Loop approval before any client handoff link is constructed.
 */

import { Customer, Quotation, RecoveryDraft, CommunicationHandoff } from "@/types/domain";
import { CustomerDormancyAssessment, RecoveryOpportunitySummary } from "@/types/engine";
import { formatMinorUnits } from "./currency";

export function summarizeRecoveryOpportunities(
  assessments: CustomerDormancyAssessment[],
  quotations: Quotation[],
  existingDrafts: RecoveryDraft[],
  currency = "USD"
): RecoveryOpportunitySummary {
  let atRiskRevenue = 0n;
  let atRiskCount = 0;
  let dormantHighValueCount = 0;

  for (const a of assessments) {
    if (a.riskLevel === "high" || a.riskLevel === "critical") {
      atRiskRevenue += a.estimatedOpportunityLossMinorUnits;
      atRiskCount++;
      if (a.totalSpendMinorUnits > 50000n) {
        // High-value threshold (> $500)
        dormantHighValueCount++;
      }
    }
  }

  const now = new Date().toISOString();
  let expiredQuotesCount = 0;
  for (const q of quotations) {
    if (q.status === "expired" || (q.status === "sent" && q.validUntilDate < now)) {
      expiredQuotesCount++;
    }
  }

  const pendingDraftsCount = existingDrafts.filter(
    (d) => d.status === "pending_approval"
  ).length;

  return {
    totalAtRiskRevenueMinorUnits: atRiskRevenue,
    atRiskCustomerCount: atRiskCount,
    dormantHighValueCustomersCount: dormantHighValueCount,
    expiredQuoteOpportunitiesCount: expiredQuotesCount,
    actionableDraftsPendingApprovalCount: pendingDraftsCount,
    currency,
  };
}

/**
 * Synthesizes an initial recommendation draft for a dormant customer.
 */
export function generateCustomerRecoveryDraft(
  customer: Customer,
  assessment: CustomerDormancyAssessment,
  businessName: string
): RecoveryDraft {
  const channel = customer.phone ? "whatsapp" : "email";
  const recipient = customer.phone || customer.email || "Unknown";

  const formattedSpend = formatMinorUnits(customer.totalSpendMinorUnits);

  let draftSubject: string | undefined;
  let draftBody = "";

  if (channel === "whatsapp") {
    draftBody = `Hi ${customer.name}, it's been a while since your last visit to ${businessName}! We wanted to check in and see if you need anything replenished. As a valued customer, let us know how we can help you today!`;
  } else {
    draftSubject = `We miss you at ${businessName}`;
    draftBody = `Hi ${customer.name},\n\nWe noticed you haven't visited us in the past ${assessment.daysSinceLastPurchase} days. We value your business (with over ${customer.totalOrders} past orders!) and would love to welcome you back.\n\nReply to this email or stop by our store to see what's new!\n\nBest regards,\nThe Team at ${businessName}`;
  }

  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    businessId: customer.businessId,
    customerId: customer.id,
    customerName: customer.name,
    recipientIdentifier: recipient,
    suggestedChannel: channel,
    draftSubject,
    draftBody,
    aiRationale: `Customer usually orders every ${assessment.averageCycleDays} days, but has been inactive for ${assessment.daysSinceLastPurchase} days (${assessment.cycleMultiplier}x their usual cadence). Churn risk is ${assessment.riskLevel.toUpperCase()}.`,
    aiRiskScore: assessment.dormancyScore,
    aiPromptVersion: "v1.2-retail-winback",
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Synthesizes a quotation follow-up draft for an expiring or expired quotation.
 */
export function generateQuotationFollowupDraft(
  quote: Quotation,
  customerName: string,
  recipientPhoneOrEmail: string,
  businessName: string
): RecoveryDraft {
  const isPhone = !recipientPhoneOrEmail.includes("@");
  const channel = isPhone ? "whatsapp" : "email";

  const formattedAmount = formatMinorUnits(quote.amountMinorUnits, quote.currency, quote.currencyExponent);

  let draftSubject: string | undefined;
  let draftBody = "";

  if (channel === "whatsapp") {
    draftBody = `Hello ${customerName}, following up from ${businessName} regarding Quotation #${quote.quoteNumber} (${formattedAmount}) for ${quote.itemsDescription}. Are you still looking to proceed, or did you have any questions on pricing?`;
  } else {
    draftSubject = `Following up on Quotation #${quote.quoteNumber} - ${businessName}`;
    draftBody = `Dear ${customerName},\n\nI am checking in regarding Quotation #${quote.quoteNumber} for ${formattedAmount} (${quote.itemsDescription}), issued on ${new Date(quote.issuedDate).toLocaleDateString()}.\n\nPlease let us know if you would like us to reserve these items or if you need any adjustments to the scope.\n\nBest regards,\n${businessName}`;
  }

  return {
    id: `draft-quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    businessId: quote.businessId,
    customerId: quote.customerId || "unregistered-quote-customer",
    customerName,
    quotationId: quote.id,
    quoteNumber: quote.quoteNumber,
    recipientIdentifier: recipientPhoneOrEmail,
    suggestedChannel: channel,
    draftSubject,
    draftBody,
    aiRationale: `Quotation #${quote.quoteNumber} for ${formattedAmount} is pending with validity until ${new Date(quote.validUntilDate).toLocaleDateString()}. Conversion probability is ${quote.probabilityPercentage}%.`,
    aiRiskScore: 70,
    aiPromptVersion: "v1.2-quote-recovery",
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates client-side URI handoff link for an approved draft.
 * STRICT RULE: Only generates link for status = 'approved'.
 */
export function createHandoffLink(
  draft: RecoveryDraft,
  userId: string
): { handoff: CommunicationHandoff; url: string } {
  if (draft.status !== "approved") {
    throw new Error("Cannot generate handoff link for an unapproved draft. Human owner sign-off required.");
  }

  let handoffUrl = "";
  const recipientClean = draft.recipientIdentifier.replace(/[^0-9+]/g, "");

  if (draft.suggestedChannel === "whatsapp") {
    const encodedText = encodeURIComponent(draft.draftBody);
    // Remove leading '+' for wa.me URL
    const waPhone = recipientClean.startsWith("+") ? recipientClean.slice(1) : recipientClean;
    handoffUrl = `https://wa.me/${waPhone}?text=${encodedText}`;
  } else {
    const encodedSubject = encodeURIComponent(draft.draftSubject || "Customer Update");
    const encodedBody = encodeURIComponent(draft.draftBody);
    handoffUrl = `mailto:${draft.recipientIdentifier}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  const handoff: CommunicationHandoff = {
    id: `handoff-${Date.now()}`,
    businessId: draft.businessId,
    draftId: draft.id,
    customerId: draft.customerId,
    customerName: draft.customerName,
    channel: draft.suggestedChannel,
    handoffUrl,
    initiatedByUserId: userId,
    handoffInitiatedAt: new Date().toISOString(),
    userConfirmedOutcome: "unconfirmed",
  };

  return { handoff, url: handoffUrl };
}
