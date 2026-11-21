import { describe, it, expect } from "vitest";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { Customer, Transaction } from "@/types/domain";

describe("Customer Dormancy & Churn-Risk Scoring Engine", () => {
  const baseCustomer: Customer = {
    id: "cust-test-1",
    businessId: "biz-1",
    name: "Acme Contracting",
    tags: ["Trade"],
    firstSeenAt: "2026-01-01T00:00:00Z",
    lastActivityAt: "2026-06-01T00:00:00Z",
    totalSpendMinorUnits: 300000n,
    totalOrders: 2,
    averageOrderValueMinorUnits: 150000n,
    status: "active",
  };

  it("classifies accounts with fewer than 3 transactions as insufficient_history", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-01-01T10:00:00Z",
        grossAmountMinorUnits: 150000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 150000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 150000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-2",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-03-01T10:00:00Z",
        grossAmountMinorUnits: 150000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 150000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 150000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
    ];

    const assessment = assessCustomerDormancy(baseCustomer, transactions, new Date("2026-06-01"));
    expect(assessment.riskLevel).toBe("insufficient_history");
    expect(assessment.explanation).toContain("Minimum 3 purchases required");
    expect(assessment.estimatedOpportunityLossMinorUnits).toBe(0n);
  });

  it("calculates accurate dormancy score and churn risk for regular buyers exceeding cycle", () => {
    const establishedCustomer: Customer = {
      ...baseCustomer,
      totalOrders: 4,
      totalSpendMinorUnits: 400000n,
    };

    // Orders every ~30 days (Jan 1, Jan 31, Mar 2, Apr 1)
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-01-01T10:00:00Z",
        grossAmountMinorUnits: 100000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 100000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 100000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-2",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-01-31T10:00:00Z",
        grossAmountMinorUnits: 100000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 100000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 100000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-3",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-03-02T10:00:00Z",
        grossAmountMinorUnits: 100000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 100000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 100000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
      {
        id: "tx-4",
        businessId: "biz-1",
        customerId: "cust-test-1",
        transactionDate: "2026-04-01T10:00:00Z",
        grossAmountMinorUnits: 100000n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 100000n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 100000n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      },
    ];

    // Case A: Observed 15 days later (April 16) -> Low Risk
    const activeAssessment = assessCustomerDormancy(establishedCustomer, transactions, new Date("2026-04-16T10:00:00Z"));
    expect(activeAssessment.riskLevel).toBe("low");
    expect(activeAssessment.dormancyScore).toBeLessThanOrEqual(30);

    // Case B: Observed 90 days later (July 1) -> Critical Churn Risk (3x the 30-day cadence)
    const dormantAssessment = assessCustomerDormancy(establishedCustomer, transactions, new Date("2026-07-01T10:00:00Z"));
    expect(dormantAssessment.riskLevel).toBe("critical");
    expect(dormantAssessment.dormancyScore).toBeGreaterThanOrEqual(80);
    expect(dormantAssessment.cycleMultiplier).toBeGreaterThanOrEqual(2.5);
    expect(dormantAssessment.estimatedOpportunityLossMinorUnits).toBeGreaterThan(0n);
  });
});
