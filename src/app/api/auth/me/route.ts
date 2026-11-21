import { NextResponse } from "next/server";
import { toSafeErrorResponse, getHttpStatus } from "@/lib/errors";

export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        data: {
          id: "00000000-0000-4000-8000-000000000001",
          businessId: "11111111-1111-4111-8111-111111111111",
          email: "owner@bizora.app",
          name: "Apex Owner",
          role: "owner",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
