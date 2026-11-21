import { NextRequest, NextResponse } from "next/server";
import { storeRepo } from "@/lib/data/repository";
import { DraftStatus, RecoveryDraft } from "@/types/domain";
import { toSafeErrorResponse, getHttpStatus, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DraftStatus | null;

    let drafts = await storeRepo.getRecoveryDrafts(businessId);
    if (status) {
      drafts = drafts.filter((d) => d.status === status);
    }

    return NextResponse.json({
      success: true,
      data: drafts,
      total: drafts.length,
    });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const body = await req.json();

    if (!body.customerId || !body.customerName || !body.draftBody) {
      throw new ValidationError("Missing required fields for recovery draft creation");
    }

    const newDraft: RecoveryDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      businessId,
      customerId: body.customerId,
      customerName: body.customerName,
      quotationId: body.quotationId,
      quoteNumber: body.quoteNumber,
      recipientIdentifier: body.recipientIdentifier || body.customerPhone || body.customerEmail || "N/A",
      suggestedChannel: body.suggestedChannel || "whatsapp",
      draftSubject: body.draftSubject,
      draftBody: body.draftBody,
      aiRationale: body.aiRationale || "Draft synthesized per recovery opportunity analysis",
      aiRiskScore: body.aiRiskScore || 50,
      aiPromptVersion: "v1.2-retail-winback",
      status: "pending_approval",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await storeRepo.createRecoveryDraft(newDraft);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    const safeError = toSafeErrorResponse(error);
    const status = getHttpStatus(error);
    return NextResponse.json(safeError, { status });
  }
}
