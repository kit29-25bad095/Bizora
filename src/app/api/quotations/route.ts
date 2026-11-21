import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const quotations = await storeRepo.getQuotations(businessId);

    return NextResponse.json({
      success: true,
      data: quotations.map((q) => ({
        ...q,
        amountMinorUnits: q.amountMinorUnits.toString(),
      })),
      total: quotations.length,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
