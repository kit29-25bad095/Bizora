import React from "react";
import Link from "next/link";
import { storeRepo } from "@/lib/data/repository";
import { assessCustomerDormancy } from "@/lib/engine/dormancy";
import { formatMinorUnits } from "@/lib/engine/currency";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Users, Clock, Sparkles, Filter, Phone, Mail } from "lucide-react";

export default async function CustomersPage() {
  const businessId = "biz-apex-001";
  const [customers, transactions] = await Promise.all([
    storeRepo.getCustomers(businessId),
    storeRepo.getTransactions(businessId),
  ]);

  const assessments = customers.map((c) => {
    const custTx = transactions.filter((t) => t.customerId === c.id);
    return assessCustomerDormancy(c, custTx);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Directory & Inactivity Radar
            </h1>
            <Badge variant="default" className="text-xs">
              {customers.length} Accounts
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track individual purchasing cadence, lifetime value, and automated churn-risk scores.
          </p>
        </div>
      </div>

      {/* Customer Directory Table */}
      <Card className="shadow-xs">
        <CardHeader className="py-4">
          <div>
            <CardTitle className="text-base">All Trade & Retail Customers</CardTitle>
            <CardDescription>
              Ranked by purchase recency and statistical dormancy assessment.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-6">Customer & Contact</th>
                  <th className="py-3 px-6">Category / Tags</th>
                  <th className="py-3 px-6">Lifetime Value</th>
                  <th className="py-3 px-6">Order Cycle</th>
                  <th className="py-3 px-6">Last Active</th>
                  <th className="py-3 px-6">Churn Risk</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.map((a) => {
                  const cust = customers.find((c) => c.id === a.customerId)!;
                  const badgeVariant =
                    a.riskLevel === "critical"
                      ? "danger"
                      : a.riskLevel === "high"
                      ? "warning"
                      : a.riskLevel === "medium"
                      ? "default"
                      : "success";

                  return (
                    <tr key={a.customerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 text-sm">{a.customerName}</div>
                        <div className="flex items-center gap-3 mt-1 text-slate-400 text-[11px]">
                          {a.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {a.phone}
                            </span>
                          )}
                          {a.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {a.email}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {cust.tags.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">
                          {formatMinorUnits(a.totalSpendMinorUnits)}
                        </div>
                        <div className="text-slate-400 text-[11px]">{a.totalOrders} total orders</div>
                      </td>

                      <td className="py-4 px-6">
                        {a.riskLevel === "insufficient_history" ? (
                          <span className="text-slate-400 italic text-[11px]">Insufficient history (&lt;3 orders)</span>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800">
                              Every ~{a.averageCycleDays} days
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Variance: ±{a.cycleStandardDeviationDays}d
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-800">{a.daysSinceLastPurchase} days ago</div>
                        <div className="text-slate-400 text-[11px]">
                          {new Date(a.lastPurchaseDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Badge variant={badgeVariant} className="uppercase text-[10px] font-bold">
                            {a.riskLevel.replace("_", " ")}
                          </Badge>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {a.dormancyScore}/100
                          </span>
                        </div>
                        {a.estimatedOpportunityLossMinorUnits > 0n && (
                          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                            {formatMinorUnits(a.estimatedOpportunityLossMinorUnits)} at risk
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link href={`/dashboard/recovery?customer=${a.customerId}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            Draft Recovery
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
