"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Mail,
  AlertTriangle,
  Send,
} from "lucide-react";

interface DraftItem {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  quotationId?: string;
  quoteNumber?: string;
  recipientIdentifier: string;
  suggestedChannel: "whatsapp" | "email";
  draftSubject?: string;
  draftBody: string;
  aiRationale: string;
  aiRiskScore: number;
  status: "pending_approval" | "approved" | "rejected" | "superseded";
  createdAt: string;
  updatedAt: string;
}

export default function ApprovalsPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("pending_approval");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval / Rejection dialog state
  const [selectedDraft, setSelectedDraft] = useState<DraftItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Handoff link state
  const [handoffModal, setHandoffModal] = useState<{
    draft: DraftItem;
    url: string;
  } | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDrafts();
      setDrafts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleApprove = async () => {
    if (!selectedDraft) return;
    setProcessing(true);
    try {
      await apiClient.approveDraft(selectedDraft.id);
      setSelectedDraft(null);
      setActionType(null);
      await fetchDrafts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDraft) return;
    setProcessing(true);
    try {
      await apiClient.rejectDraft(selectedDraft.id, rejectReason);
      setSelectedDraft(null);
      setActionType(null);
      setRejectReason("");
      await fetchDrafts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateHandoff = async (draft: DraftItem) => {
    try {
      const result = await apiClient.generateHandoff(draft.id);
      setHandoffModal({ draft, url: result.url });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Handoff generation failed");
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchDrafts} />;
  }

  const pendingDrafts = drafts.filter((d) => d.status === "pending_approval");
  const approvedDrafts = drafts.filter((d) => d.status === "approved");
  const rejectedDrafts = drafts.filter((d) => d.status === "rejected");

  const filteredDrafts =
    activeTab === "pending_approval"
      ? pendingDrafts
      : activeTab === "approved"
      ? approvedDrafts
      : rejectedDrafts;

  const tabs = [
    { id: "pending_approval", label: "Awaiting Sign-Off", badge: pendingDrafts.length },
    { id: "approved", label: "Approved & Dispatchable", badge: approvedDrafts.length },
    { id: "rejected", label: "Rejected History", badge: rejectedDrafts.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Human-in-the-Loop Approvals
            </h1>
            <Badge variant="default" className="text-xs">
              Owner Authorization Required
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative gatekeeper workspace. No customer communication can be generated or sent without explicit approval.
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong className="font-semibold text-slate-900">Zero Autonomous Dispatch: </strong>
          Bizora will never contact a customer on your behalf automatically. When you approve a draft, a client-side
          handoff link (<code>wa.me</code> or <code>mailto:</code>) is prepared for you to review and open in your own browser.
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"></div>
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Drafts in this Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {activeTab === "pending_approval"
              ? "All generated drafts have been reviewed by the owner."
              : "No historical records match this filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => (
            <Card key={draft.id} className="p-5 border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    {draft.suggestedChannel === "whatsapp" ? (
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{draft.customerName}</h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Target: {draft.recipientIdentifier} ({draft.suggestedChannel.toUpperCase()})
                    </p>
                  </div>
                </div>

                <Badge
                  variant={
                    draft.status === "approved"
                      ? "success"
                      : draft.status === "rejected"
                      ? "danger"
                      : "warning"
                  }
                  className="capitalize"
                >
                  {draft.status.replace("_", " ")}
                </Badge>
              </div>

              {/* Message Body */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 my-3">
                {draft.draftSubject && (
                  <div className="text-xs font-semibold text-slate-800 pb-1.5 mb-1.5 border-b border-slate-200/60">
                    Subject: {draft.draftSubject}
                  </div>
                )}
                <p className="text-xs text-slate-700 whitespace-pre-line font-sans leading-relaxed">
                  {draft.draftBody}
                </p>
              </div>

              {/* Rationale & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500 italic line-clamp-1 max-w-md">
                  AI Rationale: {draft.aiRationale}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {draft.status === "pending_approval" && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setSelectedDraft(draft);
                          setActionType("reject");
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedDraft(draft);
                          setActionType("approve");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Draft</span>
                      </Button>
                    </>
                  )}

                  {draft.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => handleGenerateHandoff(draft)}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Handoff Link</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Approval */}
      {selectedDraft && actionType === "approve" && (
        <ConfirmationDialog
          isOpen={true}
          title="Approve Outreach Communication"
          message={`Are you sure you want to approve this message for ${selectedDraft.customerName}? Once approved, a client-side handoff link will be ready for execution.`}
          confirmLabel="Authorize Outreach"
          variant="success"
          loading={processing}
          onConfirm={handleApprove}
          onClose={() => {
            setSelectedDraft(null);
            setActionType(null);
          }}
        />
      )}

      {/* Rejection Modal */}
      {selectedDraft && actionType === "reject" && (
        <Modal
          isOpen={true}
          title="Reject Outreach Draft"
          onClose={() => {
            setSelectedDraft(null);
            setActionType(null);
          }}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Provide an optional reason for audit logging. The draft will be moved to the rejected archive.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Customer already called via phone; discount inappropriate..."
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDraft(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReject} disabled={processing}>
                {processing ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Client-Side Handoff Modal */}
      {handoffModal && (
        <Modal
          isOpen={true}
          title="Client-Side Communication Handoff Ready"
          onClose={() => setHandoffModal(null)}
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Owner approval verified. Click below to launch the communication in your client application.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Handoff URI Scheme</label>
              <input
                type="text"
                readOnly
                value={handoffModal.url}
                className="w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-600 select-all"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setHandoffModal(null)}>
                Dismiss
              </Button>
              <a
                href={handoffModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setHandoffModal(null)}
              >
                <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <span>Open in {handoffModal.draft.suggestedChannel === "whatsapp" ? "WhatsApp" : "Email"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
