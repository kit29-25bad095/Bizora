import React from "react";
import { StoreFinancialSummary, RecoveryOpportunitySummary } from "@/types/engine";
import { formatMinorUnits } from "@/lib/engine/currency";
import { DollarSign, ArrowUpRight, TrendingUp, AlertTriangle, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

interface KPICardsProps {
  financials: StoreFinancialSummary;
  recovery: RecoveryOpportunitySummary;
}

export function KPICards({ financials, recovery }: KPICardsProps) {
  const cards = [
    {
      label: "Net Sales (Settled)",
      value: formatMinorUnits(financials.netSalesMinorUnits, financials.currency, financials.currencyExponent),
      subtext: `From ${financials.totalOrdersCount} completed orders`,
      icon: DollarSign,
      color: "text-blue-600 bg-blue-50 border-blue-100",
      change: "+8.4%",
      isPositive: true,
    },
    {
      label: "Cash Collected",
      value: formatMinorUnits(financials.cashCollectedMinorUnits, financials.currency, financials.currencyExponent),
      subtext: "Direct cleared in-store & POS cash",
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      change: "+12.1%",
      isPositive: true,
    },
    {
      label: "Average Order Value (AOV)",
      value: formatMinorUnits(financials.averageOrderValueMinorUnits, financials.currency, financials.currencyExponent),
      subtext: `Across ${financials.totalCustomersCount} active customer accounts`,
      icon: ArrowUpRight,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      change: "+4.2%",
      isPositive: true,
    },
    {
      label: "Revenue at Churn Risk",
      value: formatMinorUnits(recovery.totalAtRiskRevenueMinorUnits, recovery.currency),
      subtext: `${recovery.atRiskCustomerCount} inactive high-value accounts`,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      change: "Action Req",
      isPositive: false,
      badge: "High Priority",
    },
    {
      label: "Open Quotations Pipeline",
      value: formatMinorUnits(financials.openQuotationsValueMinorUnits, financials.currency, financials.currencyExponent),
      subtext: "Active pending commercial bids",
      icon: FileSpreadsheet,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      change: "Pipeline",
      isPositive: true,
    },
    {
      label: "Expired Quotes Unrecovered",
      value: formatMinorUnits(financials.expiredQuotationsValueMinorUnits, financials.currency, financials.currencyExponent),
      subtext: `${recovery.expiredQuoteOpportunitiesCount} quotes past validity date`,
      icon: ShieldCheck,
      color: "text-purple-600 bg-purple-50 border-purple-100",
      change: "Win-back Opp",
      isPositive: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="hover:border-slate-300 transition-all shadow-xs">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{c.value}</span>
                {c.badge ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                    {c.badge}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-semibold ${
                      c.isPositive ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {c.change}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{c.subtext}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
