import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { toSafeErrorResponse, getHttpStatus, NotFoundError, ValidationError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = "11111111-1111-4111-8111-111111111111";
    const body = await req.json();

    const existing = await storeRepo.getRecoveryDraftById(businessId, id);
    if (!existing) {
      throw new NotFoundError("RecoveryDraft", id);
    }

    if (existing.status !== "pending_approval") {
      throw new ValidationError(
        `Cannot edit draft with status '${existing.status}'. Only pending_approval drafts may be edited.`
      );
    }

    const updated = await storeRepo.updateDraftStatus(
      businessId,
      id,
      existing.status,
      "user-current",
      {
        editedBody: body.draftBody,
        editedSubject: body.draftSubject,
      }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
