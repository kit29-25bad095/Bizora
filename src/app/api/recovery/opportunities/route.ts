import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { summarizeRecoveryOpportunities } from "@/lib/engine/recovery";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const customers = await storeRepo.getCustomers(businessId);
    const transactions = await storeRepo.getTransactions(businessId);
    const quotations = await storeRepo.getQuotations(businessId);
    const drafts = await storeRepo.getRecoveryDrafts(businessId);

    const assessments = customers.map((c) => {
      const custTx = transactions.filter((t) => t.customerId === c.id);
      return assessCustomerDormancy(c, custTx);
    });

    const summary = summarizeRecoveryOpportunities(assessments, quotations, drafts, "USD");

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        totalAtRiskRevenueMinorUnits: summary.totalAtRiskRevenueMinorUnits.toString(),
      },
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
