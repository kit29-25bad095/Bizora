import React from "react";
import Link from "next/link";
import { storeRepo } from "../../../lib/data/repository";
import { formatMinorUnits } from "../../../lib/engine/currency";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { FileSpreadsheet, Clock, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

export default async function QuotationsPage() {
  const businessId = "biz-apex-001";
  const quotations = await storeRepo.getQuotations(businessId);

  const now = new Date().toISOString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quotation Pipeline & Expiry Tracker
            </h1>
            <Badge variant="default" className="text-xs">
              {quotations.length} Active Quotes
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Prevent quotation abandonment by monitoring validity deadlines and initiating timely win-back outreach.
          </p>
        </div>
      </div>

      {/* Quotation Table */}
      <Card className="shadow-xs">
        <CardHeader className="py-4">
          <div>
            <CardTitle className="text-base">All Commercial Quotes & Estimates</CardTitle>
            <CardDescription>
              Explicit user-defined validity expiration tracking with direct win-back draft actions.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-6">Quote # & Customer</th>
                  <th className="py-3 px-6">Scope / Items</th>
                  <th className="py-3 px-6">Proposed Amount</th>
                  <th className="py-3 px-6">Issued Date</th>
                  <th className="py-3 px-6">Validity Deadline</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Win-Back Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => {
                  const isPastExpiry = q.validUntilDate < now;
                  const isExpired = q.status === "expired" || (q.status === "sent" && isPastExpiry);
                  const isAccepted = q.status === "accepted";

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm font-mono">
                          {q.quoteNumber}
                        </div>
                        <div className="text-slate-600 font-medium mt-0.5">{q.customerName}</div>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <div className="text-slate-800 line-clamp-2">{q.itemsDescription}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatMinorUnits(q.amountMinorUnits, q.currency, q.currencyExponent)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {q.probabilityPercentage}% win probability
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-slate-700">
                          {new Date(q.issuedDate).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className={isPastExpiry ? "text-rose-600 font-semibold" : "text-slate-800"}>
                          {new Date(q.validUntilDate).toLocaleDateString()}
                        </div>
                        {isPastExpiry && (
                          <div className="text-[10px] text-rose-500 font-medium">Lapsed / Expired</div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {isAccepted ? (
                          <Badge variant="success" className="gap-1 font-semibold uppercase text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Accepted
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="danger" className="gap-1 font-semibold uppercase text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Expired
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1 font-semibold uppercase text-[10px]">
                            <Clock className="w-3 h-3" /> Open
                          </Badge>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link href={`/dashboard/recovery?quote=${q.id}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {isExpired ? "Recover Quote" : "Follow-Up"}
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
