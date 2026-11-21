"use server";

import { storeRepo } from "@/lib/data/repository";
import { DraftStatus, RecoveryDraft } from "@/types/domain";
import { generateCustomerRecoveryDraft, generateQuotationFollowupDraft } from "@/lib/engine/recovery";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { revalidatePath } from "next/cache";

export async function approveDraftAction(
  draftId: string,
  editedBody?: string
): Promise<{ success: boolean; draft?: RecoveryDraft; error?: string }> {
  try {
    const businessId = "biz-apex-001";
    const updated = await storeRepo.updateDraftStatus(
      businessId,
      draftId,
      "approved",
      "user-owner-001",
      { editedBody }
    );
    revalidatePath("/dashboard/recovery");
    revalidatePath("/dashboard");
    return { success: true, draft: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Approval failed" };
  }
}

export async function rejectDraftAction(
  draftId: string,
  reason: string
): Promise<{ success: boolean; draft?: RecoveryDraft; error?: string }> {
  try {
    const businessId = "biz-apex-001";
    const updated = await storeRepo.updateDraftStatus(
      businessId,
      draftId,
      "rejected",
      "user-owner-001",
      { rejectionReason: reason }
    );
    revalidatePath("/dashboard/recovery");
    revalidatePath("/dashboard");
    return { success: true, draft: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Rejection failed" };
  }
}

export async function generateDraftForCustomerAction(
  customerId: string
): Promise<{ success: boolean; draft?: RecoveryDraft; error?: string }> {
  try {
    const businessId = "biz-apex-001";
    const [business, customer, transactions] = await Promise.all([
      storeRepo.getBusiness(businessId),
      storeRepo.getCustomerById(businessId, customerId),
      storeRepo.getCustomerTransactions(businessId, customerId),
    ]);

    if (!business || !customer) {
      return { success: false, error: "Customer not found" };
    }

    const assessment = assessCustomerDormancy(customer, transactions);
    const draft = generateCustomerRecoveryDraft(customer, assessment, business.name);
    await storeRepo.createRecoveryDraft(draft);

    revalidatePath("/dashboard/recovery");
    revalidatePath("/dashboard");
    return { success: true, draft };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Draft generation failed" };
  }
}

export async function recordHandoffOutcomeAction(
  handoffId: string,
  outcome: "sent_confirmed" | "cancelled"
): Promise<{ success: boolean }> {
  revalidatePath("/dashboard/recovery");
  return { success: true };
}
