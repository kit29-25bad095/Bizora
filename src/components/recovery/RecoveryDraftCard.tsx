"use client";

import React, { useState } from "react";
import { RecoveryDraft } from "@/types/domain";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  MessageSquare,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit3,
  Sparkles,
} from "lucide-react";

interface RecoveryDraftCardProps {
  draft: RecoveryDraft;
  onApprove: (draftId: string, editedBody?: string) => Promise<void>;
  onReject: (draftId: string, reason: string) => Promise<void>;
  onInitiateHandoff: (draft: RecoveryDraft) => void;
}

export function RecoveryDraftCard({
  draft,
  onApprove,
  onReject,
  onInitiateHandoff,
}: RecoveryDraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bodyText, setBodyText] = useState(draft.draftBody);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWhatsApp = draft.suggestedChannel === "whatsapp";
  const isApproved = draft.status === "approved";
  const isPending = draft.status === "pending_approval";
  const isRejected = draft.status === "rejected";

  const handleSaveAndApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(draft.id, bodyText !== draft.draftBody ? bodyText : undefined);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    const reason = prompt("Please provide a reason for rejecting this AI draft:", "Tone not suitable");
    if (reason) {
      setIsSubmitting(true);
      try {
        await onReject(draft.id, reason);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="py-4 px-6 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isWhatsApp
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {isWhatsApp ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">{draft.customerName}</span>
              {draft.quoteNumber && (
                <span className="text-xs text-slate-500 font-mono">
                  (Quote #{draft.quoteNumber})
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Channel: {isWhatsApp ? "WhatsApp Direct" : "Email"}</span>
              <span>•</span>
              <span className="font-mono text-slate-600">{draft.recipientIdentifier}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isApproved && (
            <Badge variant="success" className="gap-1 text-[11px] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              Approved by Owner
            </Badge>
          )}
          {isPending && (
            <Badge variant="warning" className="gap-1 text-[11px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              Pending Owner Sign-Off
            </Badge>
          )}
          {isRejected && (
            <Badge variant="danger" className="gap-1 text-[11px] font-bold">
              <XCircle className="w-3 h-3" />
              Rejected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* AI Rationale Box */}
        <div className="p-3.5 bg-amber-50/50 rounded-lg border border-amber-200/60 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-amber-900">AI Intelligence Insight: </span>
            {draft.aiRationale}
          </div>
        </div>

        {/* Message Subject & Body */}
        {draft.draftSubject && (
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Subject</label>
            <div className="text-sm font-medium text-slate-900 mt-0.5">{draft.draftSubject}</div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Message Content</label>
            {isPending && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit Message
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={4}
                className="w-full text-xs text-slate-900 border border-blue-400 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveAndApprove} disabled={isSubmitting}>
                  Save & Approve
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
              {draft.draftBody}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {isApproved && draft.approvedAt && (
              <span>Approved on {new Date(draft.approvedAt).toLocaleDateString()}</span>
            )}
            {isRejected && draft.rejectionReason && (
              <span className="text-rose-600">Rejection note: {draft.rejectionReason}</span>
            )}
            {isPending && <span>HITL Rule: Explicit owner review required before handoff.</span>}
          </div>

          <div className="flex items-center gap-2">
            {isPending && !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleRejectClick} disabled={isSubmitting}>
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleSaveAndApprove}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve Draft
                </Button>
              </>
            )}

            {isApproved && (
              <Button
                variant="primary"
                size="sm"
                className={`${
                  isWhatsApp ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                } gap-1.5`}
                onClick={() => onInitiateHandoff(draft)}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Launch {isWhatsApp ? "WhatsApp" : "Email"} Handoff
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
