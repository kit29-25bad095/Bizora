import React from "react";
import { CustomerDormancyAssessment } from "@/types/engine";
import { formatMinorUnits } from "@/lib/engine/currency";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { AlertCircle, Clock, Sparkles, UserCheck } from "lucide-react";
import Link from "next/link";

interface RiskRadarProps {
  assessments: CustomerDormancyAssessment[];
}

export function RiskRadar({ assessments }: RiskRadarProps) {
  const atRiskList = assessments.filter(
    (a) => a.riskLevel === "critical" || a.riskLevel === "high" || a.riskLevel === "medium"
  );

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Customer Inactivity & Churn Risk Radar</span>
          </CardTitle>
          <CardDescription>
            Flagged accounts where elapsed days since purchase exceed individual historical cycles.
          </CardDescription>
        </div>
        <Link href="/dashboard/customers">
          <Button variant="outline" size="sm">
            View All ({assessments.length})
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {atRiskList.map((cust) => {
            const badgeVariant =
              cust.riskLevel === "critical"
                ? "danger"
                : cust.riskLevel === "high"
                ? "warning"
                : "default";

            return (
              <div
                key={cust.customerId}
                className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-slate-900">{cust.customerName}</span>
                    <Badge variant={badgeVariant} className="uppercase text-[10px] font-bold">
                      {cust.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{cust.explanation}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last Order: {cust.daysSinceLastPurchase} days ago
                    </span>
                    <span>•</span>
                    <span>Lifetime Spend: {formatMinorUnits(cust.totalSpendMinorUnits)}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-xs font-semibold text-rose-600">
                    {formatMinorUnits(cust.estimatedOpportunityLossMinorUnits)} at risk
                  </span>
                  <Link href={`/dashboard/recovery?customer=${cust.customerId}`}>
                    <Button variant="secondary" size="sm" className="gap-1 text-xs">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Prepare Recovery
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
