import React from "react";
import { DailySalesTrend } from "@/types/engine";
import { formatMinorUnits } from "@/lib/engine/currency";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  trends: DailySalesTrend[];
  currency?: string;
}

export function RevenueChart({ trends, currency = "USD" }: RevenueChartProps) {
  // Find maximum net sales for relative scaling
  const maxNet = trends.reduce((max, t) => (t.netMinorUnits > max ? t.netMinorUnits : max), 1000n);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>14-Day Sales & Order Volume Velocity</span>
          </CardTitle>
          <CardDescription>
            Authoritative daily net sales calculated deterministically from settled receipts.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64 flex items-end gap-3 pt-6 pb-2">
          {trends.map((t, idx) => {
            const heightPct = Math.max(8, Number((t.netMinorUnits * 100n) / maxNet));
            const dateLabel = new Date(t.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const hasSales = t.netMinorUnits > 0n;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-24 bg-slate-900 text-white text-[11px] p-2 rounded-md shadow-lg pointer-events-none z-10 whitespace-nowrap">
                  <div className="font-semibold">{dateLabel}</div>
                  <div>Net: {formatMinorUnits(t.netMinorUnits, currency)}</div>
                  <div className="text-slate-400">{t.orderCount} orders</div>
                </div>

                {/* Bar */}
                <div className="w-full bg-slate-100 rounded-t-sm flex items-end h-full">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      hasSales
                        ? "bg-blue-600 group-hover:bg-blue-700"
                        : "bg-slate-200"
                    }`}
                  ></div>
                </div>

                {/* X-axis date */}
                <span className="text-[10px] text-slate-400 font-medium rotate-[-45deg] origin-top-left mt-2 block">
                  {dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
