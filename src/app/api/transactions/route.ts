import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const transactions = await storeRepo.getTransactions(businessId);

    return NextResponse.json({
      success: true,
      data: transactions.map((t) => ({
        ...t,
        grossAmountMinorUnits: t.grossAmountMinorUnits.toString(),
        discountAmountMinorUnits: t.discountAmountMinorUnits.toString(),
        taxAmountMinorUnits: t.taxAmountMinorUnits.toString(),
        netAmountMinorUnits: t.netAmountMinorUnits.toString(),
        refundedAmountMinorUnits: t.refundedAmountMinorUnits.toString(),
        amountMinorUnits: t.amountMinorUnits.toString(),
      })),
      total: transactions.length,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
