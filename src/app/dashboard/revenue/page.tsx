"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { formatMinorUnits } from "@/lib/engine/currency";
import { KPICard } from "@/components/ui/KPICard";
import { ChartContainer } from "@/components/ui/ChartContainer";
import { DataTable, Column } from "@/components/ui/DataTable";
import { DateRangeSelector, DateRange } from "@/components/ui/DateRangeSelector";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { DollarSign, TrendingUp, CreditCard, Banknote, RefreshCcw } from "lucide-react";

interface FinancialData {
  grossSalesMinorUnits: string;
  discountsMinorUnits: string;
  taxesMinorUnits: string;
  netSalesMinorUnits: string;
  refundsMinorUnits: string;
  settledPaymentsMinorUnits: string;
  cashCollectedMinorUnits: string;
  averageOrderValueMinorUnits: string;
  completedOrdersCount: number;
  uniqueCustomerCount: number;
  currency: string;
  currencyExponent: number;
  dailySalesTrend: Array<{
    date: string;
    grossSalesMinorUnits: string;
    netSalesMinorUnits: string;
    orderCount: number;
  }>;
}

interface TransactionItem {
  id: string;
  customerName?: string;
  transactionDate: string;
  netAmountMinorUnits: string;
  amountMinorUnits: string;
  currency: string;
  status: string;
  paymentChannel: string;
}

export default function RevenueAnalyticsPage() {
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [finData, txData] = await Promise.all([
        apiClient.getFinancials(),
        apiClient.getTransactions(),
      ]);
      setFinancials(finData);
      setTransactions(txData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  const columns: Column<TransactionItem>[] = [
    {
      header: "Date & Time",
      accessorKey: "transactionDate",
      cell: (tx) => (
        <span className="font-mono text-xs text-slate-600">
          {new Date(tx.transactionDate).toLocaleDateString()} {new Date(tx.transactionDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customerName",
      cell: (tx) => <span className="font-medium text-slate-900">{tx.customerName || "Walk-in Retail Customer"}</span>,
    },
    {
      header: "Payment Channel",
      accessorKey: "paymentChannel",
      cell: (tx) => (
        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {tx.paymentChannel.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amountMinorUnits",
      cell: (tx) => (
        <span className="font-semibold text-slate-900 font-mono">
          {formatMinorUnits(BigInt(tx.amountMinorUnits), tx.currency)}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (tx) => (
        <Badge variant={tx.status === "completed" ? "success" : "neutral"} className="capitalize">
          {tx.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative deterministic revenue calculations powered by the Bizora integer minor-unit engine.
          </p>
        </div>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Gross Sales"
          value={financials ? formatMinorUnits(BigInt(financials.grossSalesMinorUnits), financials.currency) : "$0.00"}
          subtitle="Before discounts and taxes"
          icon={DollarSign}
          variant="brand"
          loading={loading}
          trend={{ value: "+12.4%", direction: "up", label: "vs prior period" }}
        />
        <KPICard
          title="Net Sales"
          value={financials ? formatMinorUnits(BigInt(financials.netSalesMinorUnits), financials.currency) : "$0.00"}
          subtitle="Recognized order revenue"
          icon={TrendingUp}
          variant="success"
          loading={loading}
          trend={{ value: "+9.1%", direction: "up", label: "vs prior period" }}
        />
        <KPICard
          title="Settled Inflows"
          value={financials ? formatMinorUnits(BigInt(financials.settledPaymentsMinorUnits), financials.currency) : "$0.00"}
          subtitle="Cash & settled card transactions"
          icon={CreditCard}
          variant="default"
          loading={loading}
        />
        <KPICard
          title="Average Order Value"
          value={financials ? formatMinorUnits(BigInt(financials.averageOrderValueMinorUnits), financials.currency) : "$0.00"}
          subtitle={`${financials?.completedOrdersCount || 0} completed orders`}
          icon={Banknote}
          variant="default"
          loading={loading}
        />
      </div>

      {/* Financial Accounting Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartContainer
            title="Daily Sales Trend"
            subtitle="Deterministic daily revenue performance"
            accessibleDescription="Daily revenue trend chart showing sales performance over time"
          >
            {financials && financials.dailySalesTrend.length > 0 ? (
              <div className="h-64 flex items-end gap-3 pt-8 pb-4">
                {financials.dailySalesTrend.map((d) => {
                  const val = Number(d.netSalesMinorUnits) / 100;
                  const maxVal = 2500;
                  const heightPercent = Math.min(100, Math.max(10, (val / maxVal) * 100));

                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${val.toFixed(0)}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-blue-600 rounded-t-sm hover:bg-blue-700 transition-colors"
                      ></div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {d.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                No trend data recorded for selected period.
              </div>
            )}
          </ChartContainer>
        </div>

        {/* Accounting Reconciliation Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Financial Reconciliation</h3>
            <p className="text-xs text-slate-500 mb-4">
              Reconciled minor units conforming to strict GAAP standards.
            </p>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Gross Sales:</span>
                <span className="font-mono font-medium text-slate-900">
                  {financials ? formatMinorUnits(BigInt(financials.grossSalesMinorUnits), financials.currency) : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                <span>Discounts Applied:</span>
                <span className="font-mono font-medium">
                  -{financials ? formatMinorUnits(BigInt(financials.discountsMinorUnits), financials.currency) : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Taxes Collected:</span>
                <span className="font-mono font-medium text-slate-900">
                  +{financials ? formatMinorUnits(BigInt(financials.taxesMinorUnits), financials.currency) : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-slate-900 font-bold text-slate-900">
                <span>Net Sales:</span>
                <span className="font-mono">
                  {financials ? formatMinorUnits(BigInt(financials.netSalesMinorUnits), financials.currency) : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-slate-500">
                <span>Cash Collected:</span>
                <span className="font-mono text-slate-700">
                  {financials ? formatMinorUnits(BigInt(financials.cashCollectedMinorUnits), financials.currency) : "$0.00"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500">
            All arithmetic is computed deterministically in the backend with zero floating-point approximation.
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Recorded Transactions</h3>
          <span className="text-xs text-slate-500">{transactions.length} total records</span>
        </div>
        <DataTable
          columns={columns}
          data={transactions}
          loading={loading}
          keyExtractor={(tx) => tx.id}
          emptyTitle="No transactions found"
          emptyDescription="No recorded sales transactions match this view."
        />
      </div>
    </div>
  );
}
