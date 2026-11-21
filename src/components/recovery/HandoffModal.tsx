"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ExternalLink, CheckCircle2, ShieldAlert, MessageSquare, Mail } from "lucide-react";
import { RecoveryDraft, CommunicationHandoff } from "@/types/domain";
import { createHandoffLink } from "@/lib/engine/recovery";

interface HandoffModalProps {
  draft: RecoveryDraft | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmOutcome: (handoffId: string, outcome: "sent_confirmed" | "cancelled") => void;
}

export function HandoffModal({
  draft,
  isOpen,
  onClose,
  onConfirmOutcome,
}: HandoffModalProps) {
  const [handoffData, setHandoffData] = useState<{
    handoff: CommunicationHandoff;
    url: string;
  } | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);

  // When draft changes or opens, create handoff link
  React.useEffect(() => {
    if (draft && draft.status === "approved") {
      try {
        const generated = createHandoffLink(draft, "user-owner-001");
        setHandoffData(generated);
        setHasLaunched(false);
      } catch (err) {
        console.error("Failed to generate handoff:", err);
      }
    }
  }, [draft]);

  if (!draft || !handoffData) return null;

  const isWhatsApp = draft.suggestedChannel === "whatsapp";

  const handleLaunch = () => {
    window.open(handoffData.url, "_blank");
    setHasLaunched(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Owner Client-Side Handoff (${isWhatsApp ? "WhatsApp" : "Email"})`}
      description="Launch your native communication application with pre-filled message text."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Anti-Spam / Product Rule 10 Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-900 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Client-Side Owner Handoff: </span>
            Bizora does not send background messages. Clicking launch will open{" "}
            {isWhatsApp ? "WhatsApp Web / Mobile" : "your default Email client"} with your approved
            message ready for your final review and manual dispatch.
          </div>
        </div>

        {/* Target Details */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Recipient Customer:</span>
            <span className="font-semibold text-slate-900">{draft.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Channel & Address:</span>
            <span className="font-mono text-slate-800">
              {isWhatsApp ? `WhatsApp: ${draft.recipientIdentifier}` : `Email: ${draft.recipientIdentifier}`}
            </span>
          </div>
          {draft.draftSubject && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Subject:</span>
              <span className="text-slate-900 font-medium">{draft.draftSubject}</span>
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 uppercase">Message Text to be Passed</label>
          <div className="mt-1 p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 whitespace-pre-line font-sans max-h-40 overflow-y-auto">
            {draft.draftBody}
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-2">
          {!hasLaunched ? (
            <Button
              variant="primary"
              size="lg"
              className={`w-full py-3 ${
                isWhatsApp ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={handleLaunch}
            >
              <ExternalLink className="w-4 h-4" />
              Open {isWhatsApp ? "WhatsApp (wa.me)" : "Email Client (mailto)"}
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Handoff Initiated!
              </div>
              <p className="text-xs text-emerald-700">
                Did you complete sending the message in your {isWhatsApp ? "WhatsApp" : "Email"} client?
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onConfirmOutcome(handoffData.handoff.id, "cancelled");
                    onClose();
                  }}
                >
                  I Did Not Send
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    onConfirmOutcome(handoffData.handoff.id, "sent_confirmed");
                    onClose();
                  }}
                >
                  Confirm Sent in Client
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
