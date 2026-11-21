"use client";

import React, { useState } from "react";
import { RecoveryDraft } from "../../../types/domain";
import { RecoveryDraftCard } from "../../../components/recovery/RecoveryDraftCard";
import { HandoffModal } from "../../../components/recovery/HandoffModal";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { approveDraftAction, rejectDraftAction, recordHandoffOutcomeAction } from "./actions";
import { Sparkles, ShieldCheck, Filter, AlertCircle, CheckCircle2 } from "lucide-react";

interface RecoveryCenterClientProps {
  initialDrafts: RecoveryDraft[];
}

export function RecoveryCenterClient({ initialDrafts }: RecoveryCenterClientProps) {
  const [drafts, setDrafts] = useState<RecoveryDraft[]>(initialDrafts);
  const [filter, setFilter] = useState<"all" | "pending_approval" | "approved" | "rejected">("all");
  const [activeHandoffDraft, setActiveHandoffDraft] = useState<RecoveryDraft | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async (draftId: string, editedBody?: string) => {
    const res = await approveDraftAction(draftId, editedBody);
    if (res.success && res.draft) {
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? res.draft! : d)));
      showToast("Draft approved! You can now launch WhatsApp or Email handoff.");
    } else {
      alert(res.error || "Approval failed");
    }
  };

  const handleReject = async (draftId: string, reason: string) => {
    const res = await rejectDraftAction(draftId, reason);
    if (res.success && res.draft) {
      setDrafts((prev) => prev.map((d) => (d.id === draftId ? res.draft! : d)));
      showToast("Draft marked as rejected.");
    } else {
      alert(res.error || "Rejection failed");
    }
  };

  const handleInitiateHandoff = (draft: RecoveryDraft) => {
    setActiveHandoffDraft(draft);
  };

  const handleConfirmOutcome = async (
    handoffId: string,
    outcome: "sent_confirmed" | "cancelled"
  ) => {
    await recordHandoffOutcomeAction(handoffId, outcome);
    showToast(
      outcome === "sent_confirmed"
        ? "Outcome logged: Message confirmed sent in client."
        : "Outcome logged: Handoff cancelled."
    );
  };

  const filteredDrafts = drafts.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const pendingCount = drafts.filter((d) => d.status === "pending_approval").length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Revenue Recovery & Approval Center
            </h1>
            <Badge variant="warning" className="gap-1 font-semibold text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Human Approval Enforced
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review, edit, and approve AI-generated recovery communications before launching client-side outreach.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({drafts.length})
          </button>
          <button
            onClick={() => setFilter("pending_approval")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "pending_approval"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filter === "approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>
      </div>

      {/* Draft Cards List */}
      {filteredDrafts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No drafts in this view</h3>
          <p className="text-xs text-slate-400 mt-1">
            All drafts have been processed or no drafts match the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredDrafts.map((draft) => (
            <RecoveryDraftCard
              key={draft.id}
              draft={draft}
              onApprove={handleApprove}
              onReject={handleReject}
              onInitiateHandoff={handleInitiateHandoff}
            />
          ))}
        </div>
      )}

      {/* Client Handoff Modal */}
      <HandoffModal
        draft={activeHandoffDraft}
        isOpen={!!activeHandoffDraft}
        onClose={() => setActiveHandoffDraft(null)}
        onConfirmOutcome={handleConfirmOutcome}
      />
    </div>
  );
}
