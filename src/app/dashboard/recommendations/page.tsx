"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api/client";
import { formatMinorUnits } from "../../../lib/engine/currency";
import { Card } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Sparkles, MessageSquare, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";

interface RiskProfile {
  customerId: string;
  customerName: string;
  phone?: string;
  email?: string;
  daysSinceLastPurchase: number;
  averageCycleDays: number;
  cycleMultiplier: number;
  riskLevel: string;
  dormancyScore: number;
  explanation: string;
  estimatedOpportunityLossMinorUnits: string;
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<RiskProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const riskData = await apiClient.getCustomerRisk();
      // Filter to high or critical risk customers who need recommendations
      const eligible = riskData.filter(
        (p) => p.riskLevel === "critical" || p.riskLevel === "high"
      );
      setProfiles(eligible);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recovery candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleGenerateDraft = async (profile: RiskProfile) => {
    setGeneratingId(profile.customerId);
    setSuccessMessage(null);
    try {
      const channel = profile.phone ? "whatsapp" : "email";
      const recipient = profile.phone || profile.email || "Unknown";

      const subject = channel === "email" ? "Checking in from Apex Hardware" : undefined;
      const body =
        channel === "whatsapp"
          ? `Hi ${profile.customerName}, it's been a while since your last visit to Apex Hardware! We wanted to check in and see if you need anything replenished. Let us know if we can help you with anything today!`
          : `Dear ${profile.customerName},\n\nWe noticed it has been ${profile.daysSinceLastPurchase} days since your last purchase with us. We value your business and wanted to follow up to see if you have any upcoming project requirements or supply needs.\n\nBest regards,\nApex Hardware Team`;

      await apiClient.updateDraft // or create draft via API
      const res = await fetch("/api/recovery/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: profile.customerId,
          customerName: profile.customerName,
          suggestedChannel: channel,
          recipientIdentifier: recipient,
          draftSubject: subject,
          draftBody: body,
          aiRationale: profile.explanation,
          aiRiskScore: profile.dormancyScore,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to synthesize recovery draft");
      }

      setSuccessMessage(`Recovery draft created for ${profile.customerName}! Navigating to drafts workspace...`);
      setTimeout(() => {
        router.push("/dashboard/drafts");
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error generating draft");
    } finally {
      setGeneratingId(null);
    }
  };

  if (error) {
    return <ErrorState message={error} onRetry={fetchCandidates} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Recovery Recommendations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Data-backed outreach proposals prioritized by purchase dormancy and customer lifetime value.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* HITL AI Transparency Banner */}
      <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong className="font-semibold text-slate-900">Governance Notice: </strong>
          Recommendations generate draft communications only. All outgoing customer messages must be reviewed and
          approved by an authorized <strong>Owner</strong> before handoff links can be generated.
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white border border-slate-200 rounded-xl p-5 animate-pulse"></div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card className="p-10 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No Critical Churn Risks</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            All accounts are currently operating within their statistical order cycles.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => {
            const channel = profile.phone ? "whatsapp" : "email";
            return (
              <Card key={profile.customerId} className="p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{profile.customerName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{profile.phone || profile.email}</p>
                    </div>
                    <Badge variant={profile.riskLevel === "critical" ? "danger" : "warning"}>
                      {profile.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 my-3 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Days Inactive:</span>
                      <strong className="font-semibold text-slate-900">{profile.daysSinceLastPurchase} days</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cadence Multiplier:</span>
                      <span className="font-mono font-semibold text-rose-600">{profile.cycleMultiplier}x normal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Opportunity Exposure:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatMinorUnits(BigInt(profile.estimatedOpportunityLossMinorUnits), "USD")}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-blue-500 pl-3 py-0.5">
                    &ldquo;{profile.explanation}&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    {channel === "whatsapp" ? (
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span className="capitalize">{channel} Winback</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleGenerateDraft(profile)}
                    disabled={generatingId === profile.customerId}
                    className="gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingId === profile.customerId ? "Synthesizing..." : "Generate Draft"}</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
