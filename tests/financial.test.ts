import { describe, it, expect } from "vitest";
import { calculateStoreFinancials, calculateDailySalesTrend } from "@/lib/engine/financial";
import { formatMinorUnits, parseToMinorUnits } from "@/lib/engine/currency";
import { Transaction, Quotation } from "@/types/domain";

describe("Deterministic Financial Calculations & Currency Engine", () => {
  const sampleTransactions: Transaction[] = [
    {
      id: "tx-1",
      businessId: "biz-1",
      customerId: "cust-1",
      transactionDate: "2026-11-01T10:00:00Z",
      grossAmountMinorUnits: 10000n, // $100.00
      discountAmountMinorUnits: 1000n, // $10.00
      taxAmountMinorUnits: 720n, // $7.20
      netAmountMinorUnits: 9000n, // $90.00
      refundedAmountMinorUnits: 0n,
      amountMinorUnits: 9000n,
      currency: "USD",
      currencyExponent: 2,
      status: "completed",
      settlementStatus: "settled",
      paymentChannel: "pos",
    },
    {
      id: "tx-2",
      businessId: "biz-1",
      customerId: "cust-2",
      transactionDate: "2026-11-02T12:00:00Z",
      grossAmountMinorUnits: 25000n, // $250.00
      discountAmountMinorUnits: 0n,
      taxAmountMinorUnits: 2000n,
      netAmountMinorUnits: 25000n, // $250.00
      refundedAmountMinorUnits: 5000n, // $50.00 partial refund
      amountMinorUnits: 20000n, // $200.00 settled
      currency: "USD",
      currencyExponent: 2,
      status: "completed",
      settlementStatus: "settled",
      paymentChannel: "cash",
    },
    {
      id: "tx-3",
      businessId: "biz-1",
      customerId: "cust-1",
      transactionDate: "2026-11-03T15:00:00Z",
      grossAmountMinorUnits: 5000n,
      discountAmountMinorUnits: 0n,
      taxAmountMinorUnits: 400n,
      netAmountMinorUnits: 5000n,
      refundedAmountMinorUnits: 0n,
      amountMinorUnits: 5000n,
      currency: "USD",
      currencyExponent: 2,
      status: "cancelled", // should be excluded from net totals
      settlementStatus: "pending",
      paymentChannel: "online",
    },
  ];

  const sampleQuotations: Quotation[] = [
    {
      id: "q-1",
      businessId: "biz-1",
      customerName: "Acme Corp",
      quoteNumber: "Q-101",
      issuedDate: "2026-11-01T10:00:00Z",
      validUntilDate: "2026-12-01T23:59:59Z", // Open
      amountMinorUnits: 50000n, // $500.00
      currency: "USD",
      currencyExponent: 2,
      status: "sent",
      probabilityPercentage: 70,
      itemsDescription: "Hardware bundle",
      createdAt: "2026-11-01T10:00:00Z",
    },
    {
      id: "q-2",
      businessId: "biz-1",
      customerName: "Beta Corp",
      quoteNumber: "Q-102",
      issuedDate: "2026-10-01T10:00:00Z",
      validUntilDate: "2026-10-20T23:59:59Z", // Expired
      amountMinorUnits: 30000n, // $300.00
      currency: "USD",
      currencyExponent: 2,
      status: "expired",
      probabilityPercentage: 50,
      itemsDescription: "Plumbing pipes",
      createdAt: "2026-10-01T10:00:00Z",
    },
  ];

  it("calculates authoritative Gross Sales, Net Sales, Refunds and Settled Payments accurately", () => {
    const summary = calculateStoreFinancials(sampleTransactions, sampleQuotations, "USD", 2);

    // Gross: 10000n + 25000n = 35000n (cancelled tx-3 excluded)
    expect(summary.grossSalesMinorUnits).toBe(35000n);

    // Discounts: 1000n
    expect(summary.discountsMinorUnits).toBe(1000n);

    // Net: 9000n + 25000n = 34000n
    expect(summary.netSalesMinorUnits).toBe(34000n);

    // Refunds: 5000n
    expect(summary.refundsMinorUnits).toBe(5000n);

    // Settled Payments: tx-1 (9000n) + tx-2 (20000n) = 29000n
    expect(summary.settledPaymentsMinorUnits).toBe(29000n);

    // Cash Collected: tx-2 only = 20000n
    expect(summary.cashCollectedMinorUnits).toBe(20000n);

    // Total Completed Orders: 2
    expect(summary.totalOrdersCount).toBe(2);

    // AOV = NetSales (34000n) / 2 = 17000n ($170.00)
    expect(summary.averageOrderValueMinorUnits).toBe(17000n);

    // Open Quotes: 50000n ($500.00)
    expect(summary.openQuotationsValueMinorUnits).toBe(50000n);

    // Expired Quotes: 30000n ($300.00)
    expect(summary.expiredQuotationsValueMinorUnits).toBe(30000n);
  });

  it("formats minor units accurately across standard, zero-decimal and 3-decimal currencies", () => {
    expect(formatMinorUnits(125050n, "USD", 2)).toBe("$1,250.50");
    expect(formatMinorUnits(5000n, "EUR", 2)).toBe("€50.00");
    expect(formatMinorUnits(1500000n, "JPY", 0)).toBe("¥1,500,000");
    expect(formatMinorUnits(2750n, "BHD", 3)).toBe("BD 2.750");
    expect(formatMinorUnits(-4500n, "USD", 2)).toBe("-$45.00");
  });

  it("parses decimal strings to minor units without IEEE floating point inaccuracies", () => {
    expect(parseToMinorUnits("1250.50", 2)).toBe(125050n);
    expect(parseToMinorUnits("19.99", 2)).toBe(1999n);
    expect(parseToMinorUnits("500", 2)).toBe(50000n);
    expect(parseToMinorUnits("1500", 0)).toBe(1500n);
  });
});
