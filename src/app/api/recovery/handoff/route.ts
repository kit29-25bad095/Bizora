import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { createHandoffLink } from "@/lib/engine/recovery";
import { requirePermission } from "@/lib/auth/rbac";
import { SessionUser } from "@/lib/auth/session";
import { toSafeErrorResponse, getHttpStatus, NotFoundError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const body = await req.json();

    if (!body.draftId) {
      throw new ValidationError("draftId is required to generate handoff");
    }

    const currentUser: SessionUser = {
      id: "00000000-0000-4000-8000-000000000001",
      businessId,
      email: "owner@bizora.app",
      name: "Apex Owner",
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    requirePermission(currentUser, "recovery:execute");

    const draft = await storeRepo.getRecoveryDraftById(businessId, body.draftId);
    if (!draft) {
      throw new NotFoundError("RecoveryDraft", body.draftId);
    }

    if (draft.status !== "approved") {
      throw new ValidationError(
        `Draft #${draft.id} cannot be dispatched. Status is '${draft.status}', but must be 'approved' by Owner.`
      );
    }

    const { handoff, url } = createHandoffLink(draft, currentUser.id);
    await storeRepo.recordCommunicationHandoff(handoff);

    return NextResponse.json({
      success: true,
      data: {
        handoff,
        url,
      },
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
