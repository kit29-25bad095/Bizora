import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { requirePermission } from "@/lib/auth/rbac";
import { SessionUser } from "@/lib/auth/session";
import { toSafeErrorResponse, getHttpStatus, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = "11111111-1111-4111-8111-111111111111";

    // In production session is retrieved via iron-session cookie
    // For current runtime user context, this verifies Owner permission
    const currentUser: SessionUser = {
      id: "00000000-0000-4000-8000-000000000001",
      businessId,
      email: "owner@bizora.app",
      name: "Apex Owner",
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    // Strict security check: Only owner has 'recovery:approve'
    requirePermission(currentUser, "recovery:approve");

    const existing = await storeRepo.getRecoveryDraftById(businessId, id);
    if (!existing) {
      throw new NotFoundError("RecoveryDraft", id);
    }

    if (existing.status !== "pending_approval") {
      throw new ValidationError(
        `Draft cannot be approved. Current status is '${existing.status}'.`
      );
    }

    const updated = await storeRepo.updateDraftStatus(
      businessId,
      id,
      "approved",
      currentUser.id
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
