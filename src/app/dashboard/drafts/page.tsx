"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileEdit, MessageSquare, Mail, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";

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

export default function CampaignDraftsPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("pending_approval");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingDraft, setEditingDraft] = useState<DraftItem | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDrafts();
      setDrafts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const openEditModal = (draft: DraftItem) => {
    setEditingDraft(draft);
    setEditBody(draft.draftBody);
    setEditSubject(draft.draftSubject || "");
  };

  const saveEdit = async () => {
    if (!editingDraft) return;
    setSaving(true);
    try {
      await apiClient.updateDraft(editingDraft.id, {
        draftBody: editBody,
        draftSubject: editSubject || undefined,
      });
      setEditingDraft(null);
      await fetchDrafts();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save draft edits");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchDrafts} />;
  }

  const filteredDrafts = drafts.filter((d) => {
    if (activeTab === "all") return true;
    return d.status === activeTab;
  });

  const pendingCount = drafts.filter((d) => d.status === "pending_approval").length;
  const approvedCount = drafts.filter((d) => d.status === "approved").length;
  const rejectedCount = drafts.filter((d) => d.status === "rejected").length;

  const tabs = [
    { id: "pending_approval", label: "Pending Approval", badge: pendingCount },
    { id: "approved", label: "Approved", badge: approvedCount },
    { id: "rejected", label: "Rejected", badge: rejectedCount },
    { id: "all", label: "All Drafts" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Drafts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and refine personalized outreach messages before submitting for Owner approval.
          </p>
        </div>
        <Link href="/dashboard/approvals">
          <Button variant="primary" size="sm" className="gap-2">
            <span>Go to Approvals</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Drafts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"></div>
          ))}
        </div>
      ) : filteredDrafts.length === 0 ? (
        <Card className="p-10 text-center">
          <FileEdit className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Drafts in this View</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Generate new recommendations from the Customer Risk view or wait for new campaign triggers.
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{draft.customerName}</h4>
                      {draft.quoteNumber && (
                        <span className="text-xs text-slate-500 font-mono">
                          (Quote #{draft.quoteNumber})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      To: {draft.recipientIdentifier} via {draft.suggestedChannel.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {draft.status === "pending_approval" && (
                    <Badge variant="warning" className="gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Pending Sign-Off</span>
                    </Badge>
                  )}
                  {draft.status === "approved" && (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved</span>
                    </Badge>
                  )}
                  {draft.status === "rejected" && (
                    <Badge variant="danger" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>Rejected</span>
                    </Badge>
                  )}
                </div>
              </div>

              {/* Message Content Preview */}
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

              {/* Rationale and Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                <span className="italic line-clamp-1 max-w-lg">
                  Rationale: {draft.aiRationale}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {draft.status === "pending_approval" && (
                    <Button variant="outline" size="sm" onClick={() => openEditModal(draft)}>
                      Edit Content
                    </Button>
                  )}
                  <Link href="/dashboard/approvals">
                    <Button variant="secondary" size="sm">
                      Review in Approvals
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Content Modal */}
      {editingDraft && (
        <Modal
          isOpen={true}
          onClose={() => setEditingDraft(null)}
          title={`Edit Outreach Draft — ${editingDraft.customerName}`}
        >
          <div className="space-y-4">
            {editingDraft.suggestedChannel === "email" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Message Body</label>
              <textarea
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEditingDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
