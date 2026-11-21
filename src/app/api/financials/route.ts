import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { calculateStoreFinancials, calculateDailySalesTrend } from "@/lib/engine/financial";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";
import { tenantCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";

    const cachedData = await tenantCache.getOrSet(
      businessId,
      "financials",
      "summary",
      30, // 30 seconds TTL
      async () => {
        const transactions = await storeRepo.getTransactions(businessId);
        const quotations = await storeRepo.getQuotations(businessId);

        const financials = calculateStoreFinancials(transactions, quotations, "USD", 2);
        const dailySalesTrend = calculateDailySalesTrend(transactions);

        return {
          grossSalesMinorUnits: financials.grossSalesMinorUnits.toString(),
          discountsMinorUnits: financials.discountsMinorUnits.toString(),
          taxesMinorUnits: financials.taxMinorUnits.toString(),
          netSalesMinorUnits: financials.netSalesMinorUnits.toString(),
          refundsMinorUnits: financials.refundsMinorUnits.toString(),
          settledPaymentsMinorUnits: financials.settledPaymentsMinorUnits.toString(),
          cashCollectedMinorUnits: financials.cashCollectedMinorUnits.toString(),
          averageOrderValueMinorUnits: financials.averageOrderValueMinorUnits.toString(),
          openQuotationsValueMinorUnits: financials.openQuotationsValueMinorUnits.toString(),
          expiredQuotationsValueMinorUnits: financials.expiredQuotationsValueMinorUnits.toString(),
          completedOrdersCount: financials.totalOrdersCount,
          uniqueCustomerCount: financials.totalCustomersCount,
          currency: financials.currency,
          currencyExponent: financials.currencyExponent,
          calculatedAt: financials.calculatedAt,
          dailySalesTrend: dailySalesTrend.map((d) => ({
            date: d.date,
            grossSalesMinorUnits: d.grossMinorUnits.toString(),
            netSalesMinorUnits: d.netMinorUnits.toString(),
            orderCount: d.orderCount,
          })),
        };
      }
    );

    return NextResponse.json({
      success: true,
      data: cachedData,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
