/**
 * DETERMINISTIC FINANCIAL ENGINE
 * Implements authoritative mathematical calculations for Gross Sales, Net Sales,
 * Settled Payments, Cash Inflows, Discounts, Taxes, and AOV using BigInt minor units.
 * LLMs are structurally prohibited from modifying or computing these numbers.
 */

import { Transaction, Quotation } from "@/types/domain";
import { StoreFinancialSummary, DailySalesTrend } from "@/types/engine";

export function calculateStoreFinancials(
  transactions: Transaction[],
  quotations: Quotation[],
  currency = "USD",
  currencyExponent = 2
): StoreFinancialSummary {
  let grossSales = 0n;
  let discounts = 0n;
  let taxes = 0n;
  let netSales = 0n;
  let refunds = 0n;
  let settledPayments = 0n;
  let cashCollected = 0n;
  let completedOrdersCount = 0;

  const uniqueCustomers = new Set<string>();

  for (const tx of transactions) {
    if (tx.customerId) {
      uniqueCustomers.add(tx.customerId);
    }

    if (tx.status === "cancelled") {
      continue;
    }

    grossSales += tx.grossAmountMinorUnits;
    discounts += tx.discountAmountMinorUnits;
    taxes += tx.taxAmountMinorUnits;
    netSales += tx.netAmountMinorUnits;
    refunds += tx.refundedAmountMinorUnits;

    if (tx.status === "completed") {
      completedOrdersCount++;

      if (tx.settlementStatus === "settled") {
        settledPayments += tx.amountMinorUnits;
      }

      if (tx.paymentChannel === "cash") {
        cashCollected += tx.amountMinorUnits;
      }
    }
  }

  // Quotation metrics
  let openQuotesValue = 0n;
  let expiredQuotesValue = 0n;

  const now = new Date().toISOString();

  for (const quote of quotations) {
    if (quote.status === "sent" || quote.status === "draft") {
      // Dynamic evaluation: if validUntilDate < now, consider it expired
      if (quote.validUntilDate < now) {
        expiredQuotesValue += quote.amountMinorUnits;
      } else {
        openQuotesValue += quote.amountMinorUnits;
      }
    } else if (quote.status === "expired") {
      expiredQuotesValue += quote.amountMinorUnits;
    }
  }

  // Calculate Average Order Value (AOV = netSales / completedOrdersCount)
  const aov =
    completedOrdersCount > 0
      ? netSales / BigInt(completedOrdersCount)
      : 0n;

  return {
    grossSalesMinorUnits: grossSales,
    discountsMinorUnits: discounts,
    taxMinorUnits: taxes,
    netSalesMinorUnits: netSales,
    refundsMinorUnits: refunds,
    settledPaymentsMinorUnits: settledPayments,
    cashCollectedMinorUnits: cashCollected,
    averageOrderValueMinorUnits: aov,
    totalOrdersCount: completedOrdersCount,
    totalCustomersCount: uniqueCustomers.size,
    openQuotationsValueMinorUnits: openQuotesValue,
    expiredQuotationsValueMinorUnits: expiredQuotesValue,
    currency,
    currencyExponent,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateDailySalesTrend(
  transactions: Transaction[],
  days = 14
): DailySalesTrend[] {
  const trendMap = new Map<string, { gross: bigint; net: bigint; count: number }>();

  // Initialize days
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0]!;
    trendMap.set(dateKey, { gross: 0n, net: 0n, count: 0 });
  }

  for (const tx of transactions) {
    if (tx.status === "cancelled") continue;
    const txDate = tx.transactionDate.split("T")[0]!;
    const existing = trendMap.get(txDate);
    if (existing) {
      existing.gross += tx.grossAmountMinorUnits;
      existing.net += tx.netAmountMinorUnits;
      existing.count += 1;
    }
  }

  return Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    grossMinorUnits: data.gross,
    netMinorUnits: data.net,
    orderCount: data.count,
  }));
}
