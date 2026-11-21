import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const customers = await storeRepo.getCustomers(businessId);
    const transactions = await storeRepo.getTransactions(businessId);

    const assessments = customers.map((c) => {
      const custTx = transactions.filter((t) => t.customerId === c.id);
      const assessment = assessCustomerDormancy(c, custTx);
      return {
        ...assessment,
        totalSpendMinorUnits: assessment.totalSpendMinorUnits.toString(),
        estimatedOpportunityLossMinorUnits: assessment.estimatedOpportunityLossMinorUnits.toString(),
      };
    });

    const atRiskCount = assessments.filter(
      (a) => a.riskLevel === "high" || a.riskLevel === "critical"
    ).length;

    return NextResponse.json({
      success: true,
      data: assessments,
      total: assessments.length,
      atRiskCount,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
