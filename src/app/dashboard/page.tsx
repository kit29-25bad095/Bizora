import React from "react";
import Link from "next/link";
import { storeRepo } from "@/lib/data/repository";
import { calculateStoreFinancials, calculateDailySalesTrend } from "@/lib/engine/financial";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { summarizeRecoveryOpportunities } from "@/lib/engine/recovery";
import { KPICards } from "@/components/dashboard/KPICards";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const businessId = "biz-apex-001";

  const [business, customers, transactions, quotations, drafts] = await Promise.all([
    storeRepo.getBusiness(businessId),
    storeRepo.getCustomers(businessId),
    storeRepo.getTransactions(businessId),
    storeRepo.getQuotations(businessId),
    storeRepo.getRecoveryDrafts(businessId),
  ]);

  if (!business) {
    return <div>Business not found.</div>;
  }

  // Calculate deterministic metrics
  const financials = calculateStoreFinancials(
    transactions,
    quotations,
    business.baseCurrency,
    business.currencyExponent
  );
  const trends = calculateDailySalesTrend(transactions);

  // Assess dormancy for all customers
  const assessments = customers.map((c) => {
    const custTx = transactions.filter((t) => t.customerId === c.id);
    return assessCustomerDormancy(c, custTx);
  });

  const recoverySummary = summarizeRecoveryOpportunities(
    assessments,
    quotations,
    drafts,
    business.baseCurrency
  );

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Executive Revenue Dashboard
            </h1>
            <Badge variant="success" className="font-semibold text-xs">
              Live Intel
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative performance indicators for {business.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/recovery">
            <Button variant="secondary" size="md" className="gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Review Drafts ({recoverySummary.actionableDraftsPendingApprovalCount})</span>
            </Button>
          </Link>
          <Link href="/dashboard/quotations">
            <Button variant="outline" size="md">
              Pipeline ({quotations.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Recovery Alert Banner if pending drafts exist */}
      {recoverySummary.actionableDraftsPendingApprovalCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-950">
                Action Required: {recoverySummary.actionableDraftsPendingApprovalCount} Recovery Message Drafts Awaiting Approval
              </div>
              <div className="text-xs text-amber-800">
                Identified {recoverySummary.atRiskCustomerCount} high-risk accounts with over ${Number(recoverySummary.totalAtRiskRevenueMinorUnits) / 100} at risk of churn.
              </div>
            </div>
          </div>
          <Link href="/dashboard/recovery">
            <Button variant="primary" size="sm" className="bg-amber-700 hover:bg-amber-800 text-white gap-1.5 shrink-0">
              Review & Sign Off <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Financial KPIs */}
      <KPICards financials={financials} recovery={recoverySummary} />

      {/* Charts & Risk Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart trends={trends} currency={business.baseCurrency} />
        <RiskRadar assessments={assessments} />
      </div>
    </div>
  );
}
