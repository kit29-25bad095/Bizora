import React from "react";
import { storeRepo } from "@/lib/data/repository";
import { RecoveryCenterClient } from "./RecoveryCenterClient";
import { generateDraftForCustomerAction } from "./actions";

interface RecoveryPageProps {
  searchParams: Promise<{ customer?: string; quote?: string }>;
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const businessId = "biz-apex-001";
  const params = await searchParams;

  // If customer query param is passed, generate draft if one doesn't exist
  if (params.customer) {
    const existing = await storeRepo.getRecoveryDrafts(businessId);
    const hasDraft = existing.some((d) => d.customerId === params.customer);
    if (!hasDraft) {
      await generateDraftForCustomerAction(params.customer);
    }
  }

  const drafts = await storeRepo.getRecoveryDrafts(businessId);

  return <RecoveryCenterClient initialDrafts={drafts} />;
}
