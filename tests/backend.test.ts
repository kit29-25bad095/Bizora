import { describe, it, expect } from "vitest";
import { AuditService } from "../src/lib/services/audit.service";
import { CustomerService } from "../src/lib/services/customer.service";
import { TransactionService } from "../src/lib/services/transaction.service";
import { QuotationService } from "../src/lib/services/quotation.service";
import { RecoveryService } from "../src/lib/services/recovery.service";
import { SessionUser } from "../src/lib/auth/session";
import { Customer, Transaction, Quotation } from "@/types/domain";
import { ForbiddenError, ValidationError } from "../src/lib/errors";

const tenantId = "11111111-1111-4111-8111-111111111111";

const ownerUser: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  businessId: tenantId,
  email: "owner@bizora.app",
  name: "Owner User",
  role: "owner",
  createdAt: new Date().toISOString(),
};

const managerUser: SessionUser = {
  id: "00000000-0000-4000-8000-000000000002",
  businessId: tenantId,
  email: "manager@bizora.app",
  name: "Manager User",
  role: "manager",
  createdAt: new Date().toISOString(),
};

describe("Phase 10 — Backend Implementation: Audit Service & Chaining", () => {
  it("creates cryptographically chained events and validates integrity", () => {
    const event1 = AuditService.createEvent({
      businessId: tenantId,
      sequenceNumber: 1n,
      action: "customer.created",
      entityType: "customer",
      entityId: "cust-1",
      metadata: { name: "Acme Corp" },
    });

    const event2 = AuditService.createEvent({
      businessId: tenantId,
      sequenceNumber: 2n,
      action: "transaction.recorded",
      entityType: "transaction",
      entityId: "tx-1",
      metadata: { amount: 50000 },
      previousHash: event1.eventHash,
    });

    expect(event1.eventHash).toBeDefined();
    expect(event2.previousHash).toBe(event1.eventHash);

    const check = AuditService.verifyChainIntegrity([event1, event2]);
    expect(check.valid).toBe(true);
  });

  it("detects tampered audit events in the chain", () => {
    const event1 = AuditService.createEvent({
      businessId: tenantId,
      sequenceNumber: 1n,
      action: "order.placed",
      entityType: "order",
      entityId: "ord-1",
    });

    const event2 = AuditService.createEvent({
      businessId: tenantId,
      sequenceNumber: 2n,
      action: "order.shipped",
      entityType: "order",
      entityId: "ord-1",
      previousHash: event1.eventHash,
    });

    const tamperedEvent1 = {
      ...event1,
      metadata: { malicious_change: true },
    };

    const check = AuditService.verifyChainIntegrity([tamperedEvent1, event2]);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Tampered event payload");
  });
});

describe("Phase 10 — Backend Implementation: Customer Service", () => {
  it("creates customer within tenant context", async () => {
    const customer = await CustomerService.createCustomer(tenantId, {
      name: "Global Traders Ltd",
      email: "info@globaltraders.com",
      phone: "+15551234567",
      tags: ["wholesale", "priority"],
    });

    expect(customer.id).toBeDefined();
    expect(customer.businessId).toBe(tenantId);
    expect(customer.name).toBe("Global Traders Ltd");
    expect(customer.totalSpendMinorUnits).toBe(0n);
    expect(customer.status).toBe("active");
  });

  it("rejects blank customer names", async () => {
    await expect(
      CustomerService.createCustomer(tenantId, { name: "   " })
    ).rejects.toThrow(ValidationError);
  });

  it("computes dormancy score for customer with historical transactions", async () => {
    const customer = await CustomerService.createCustomer(tenantId, {
      name: "Dormant Co",
    });

    const mockTransactions: Transaction[] = [
      {
        id: "tx-1",
        businessId: tenantId,
        customerId: customer.id,
        transactionDate: "2024-01-01T00:00:00Z",
        grossAmountMinorUnits: 10000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 10000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 10000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-2",
        businessId: tenantId,
        customerId: customer.id,
        transactionDate: "2024-02-01T00:00:00Z",
        grossAmountMinorUnits: 15000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 15000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 15000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-3",
        businessId: tenantId,
        customerId: customer.id,
        transactionDate: "2024-03-01T00:00:00Z",
        grossAmountMinorUnits: 20000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 20000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 20000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
    ];

    const assessment = CustomerService.assessDormancy(
      customer,
      mockTransactions,
      new Date("2024-08-01T00:00:00Z")
    );

    expect(assessment.customerId).toBe(customer.id);
    expect(assessment.daysSinceLastPurchase).toBeGreaterThan(100);
    expect(["high", "critical"]).toContain(assessment.riskLevel);
  });
});

describe("Phase 10 — Backend Implementation: Transaction Service", () => {
  it("records transaction with precise minor-unit financial breakdown", async () => {
    const result = await TransactionService.recordTransaction(tenantId, {
      currency: "USD",
      currencyExponent: 2,
      items: [
        {
          description: "Premium Widget",
          quantity: 2,
          unitPriceMinorUnits: 5000n, // $50.00 each
          discountMinorUnits: 1000n,  // $10.00 discount
        },
        {
          description: "Service Pack",
          quantity: 1,
          unitPriceMinorUnits: 2500n, // $25.00
        },
      ],
      taxAmountMinorUnits: 800n, // $8.00 tax
    });

    // Gross: (2 * 5000) + (1 * 2500) = 12500
    // Discount: 1000
    // Tax: 800
    // Net: 12500 - 1000 + 800 = 12300 ($123.00)
    expect(result.breakdown.grossAmountMinorUnits).toBe(12500n);
    expect(result.breakdown.discountAmountMinorUnits).toBe(1000n);
    expect(result.breakdown.taxAmountMinorUnits).toBe(800n);
    expect(result.breakdown.netAmountMinorUnits).toBe(12300n);
    expect(result.breakdown.amountMinorUnits).toBe(12300n);
    expect(result.transaction.businessId).toBe(tenantId);
    expect(result.transaction.status).toBe("completed");
  });
});

describe("Phase 10 — Backend Implementation: Quotation Service", () => {
  it("creates quotation and calculates minor-unit totals", async () => {
    const now = new Date();
    const validUntil = new Date(now.getTime() + 14 * 86400000);

    const quote = await QuotationService.createQuotation(tenantId, {
      quoteNumber: "Q-2026-001",
      issuedDate: now,
      validUntilDate: validUntil,
      currency: "USD",
      items: [
        {
          description: "Enterprise Server License",
          quantity: 1,
          unitPriceMinorUnits: 199900n, // $1,999.00
        },
      ],
    });

    expect(quote.quoteNumber).toBe("Q-2026-001");
    expect(quote.amountMinorUnits).toBe(199900n);
    expect(quote.status).toBe("draft");
  });

  it("enforces quotation status lifecycle transitions", () => {
    expect(QuotationService.transitionStatus("draft", "sent")).toBe(true);
    expect(QuotationService.transitionStatus("sent", "accepted")).toBe(true);

    expect(() => QuotationService.transitionStatus("draft", "accepted")).toThrow(
      ValidationError
    );

    expect(() => QuotationService.transitionStatus("accepted", "draft")).toThrow(
      ValidationError
    );
  });
});

describe("Phase 10 — Backend Implementation: Recovery Workflow & Handoffs", () => {
  it("executes the full recovery cycle with Owner approval and client-side handoff", async () => {
    const customer: Customer = {
      id: "cust-1",
      businessId: tenantId,
      name: "Robert Chen",
      phone: "+15559876543",
      email: "robert@chen.com",
      tags: ["vip", "priority"],
      totalSpendMinorUnits: 120000n,
      totalOrders: 5,
      averageOrderValueMinorUnits: 24000n,
      lastActivityAt: "2024-01-01T00:00:00Z",
      firstSeenAt: "2023-01-01T00:00:00Z",
      status: "active",
    };

    const assessment = {
      customerId: "cust-1",
      customerName: "Robert Chen",
      phone: "+15559876543",
      email: "robert@chen.com",
      totalSpendMinorUnits: 120000n,
      totalOrders: 5,
      lastPurchaseDate: "2024-01-01T00:00:00Z",
      daysSinceLastPurchase: 90,
      averageCycleDays: 30,
      cycleStandardDeviationDays: 5,
      cycleMultiplier: 3.0,
      dormancyScore: 85,
      riskLevel: "critical" as const,
      explanation: "Inactive for 3x normal cadence",
      estimatedOpportunityLossMinorUnits: 40000n,
    };

    // 1. Create Draft
    const draft = await RecoveryService.createCustomerDraft(
      tenantId,
      customer,
      assessment,
      "Bizora Retail"
    );

    expect(draft.status).toBe("pending_approval");
    expect(draft.suggestedChannel).toBe("whatsapp");

    // 2. Manager attempts approval -> must be rejected with ForbiddenError
    await expect(
      RecoveryService.approveDraft(tenantId, draft, managerUser)
    ).rejects.toThrow(ForbiddenError);

    // 3. Manager attempts handoff on unapproved draft -> must be rejected
    await expect(
      RecoveryService.generateHandoff(tenantId, draft, managerUser)
    ).rejects.toThrow(ForbiddenError);

    // 4. Owner approves draft
    const approvedDraft = await RecoveryService.approveDraft(tenantId, draft, ownerUser);
    expect(approvedDraft.status).toBe("approved");

    // 5. Owner generates client-side handoff
    const { handoff, url } = await RecoveryService.generateHandoff(
      tenantId,
      approvedDraft,
      ownerUser
    );

    expect(handoff.channel).toBe("whatsapp");
    expect(url).toContain("https://wa.me/15559876543?text=");
    expect(handoff.userConfirmedOutcome).toBe("unconfirmed");
  });
});
