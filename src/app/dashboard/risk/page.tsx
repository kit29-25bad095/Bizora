"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { formatMinorUnits } from "@/lib/engine/currency";
import { KPICard } from "@/components/ui/KPICard";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { AlertTriangle, ShieldAlert, Sparkles, UserX, Clock } from "lucide-react";

interface RiskProfile {
  customerId: string;
  customerName: string;
  phone?: string;
  email?: string;
  totalSpendMinorUnits: string;
  totalOrders: number;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  averageCycleDays: number;
  cycleMultiplier: number;
  dormancyScore: number;
  riskLevel: "active" | "low" | "medium" | "high" | "critical" | "insufficient_history";
  explanation: string;
  estimatedOpportunityLossMinorUnits: string;
}

export default function CustomerRiskPage() {
  const [profiles, setProfiles] = useState<RiskProfile[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCustomerRisk();
      setProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer risk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, []);

  if (error) {
    return <ErrorState message={error} onRetry={fetchRisk} />;
  }

  const criticalCount = profiles.filter((p) => p.riskLevel === "critical").length;
  const highCount = profiles.filter((p) => p.riskLevel === "high").length;
  const totalAtRisk = criticalCount + highCount;

  let totalOpportunityLoss = 0n;
  for (const p of profiles) {
    if (p.riskLevel === "critical" || p.riskLevel === "high") {
      totalOpportunityLoss += BigInt(p.estimatedOpportunityLossMinorUnits);
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    if (filter === "all") return true;
    if (filter === "at_risk") return p.riskLevel === "critical" || p.riskLevel === "high";
    return p.riskLevel === filter;
  });

  const getRiskBadge = (level: RiskProfile["riskLevel"]) => {
    switch (level) {
      case "critical":
        return <Badge variant="danger">Critical Risk</Badge>;
      case "high":
        return <Badge variant="warning">High Risk</Badge>;
      case "medium":
        return <Badge variant="neutral">Medium</Badge>;
      case "low":
        return <Badge variant="success">Low</Badge>;
      case "insufficient_history":
        return <Badge variant="neutral">N &lt; 3 Orders</Badge>;
      default:
        return <Badge variant="success">Active</Badge>;
    }
  };

  const columns: Column<RiskProfile>[] = [
    {
      header: "Customer",
      accessorKey: "customerName",
      cell: (p) => (
        <div>
          <div className="font-semibold text-slate-900">{p.customerName}</div>
          <div className="text-xs text-slate-400 font-mono">{p.phone || p.email || "No contact"}</div>
        </div>
      ),
    },
    {
      header: "Risk Status",
      accessorKey: "riskLevel",
      cell: (p) => getRiskBadge(p.riskLevel),
    },
    {
      header: "Inactivity",
      accessorKey: "daysSinceLastPurchase",
      cell: (p) => (
        <div>
          <span className="font-semibold text-slate-800">{p.daysSinceLastPurchase} days</span>
          <span className="text-xs text-slate-400 block">
            {p.averageCycleDays > 0 ? `${p.cycleMultiplier}x typical cadence` : "Baseline not established"}
          </span>
        </div>
      ),
    },
    {
      header: "Lifetime Value",
      accessorKey: "totalSpendMinorUnits",
      cell: (p) => (
        <span className="font-mono text-slate-700">
          {formatMinorUnits(BigInt(p.totalSpendMinorUnits), "USD")}
        </span>
      ),
    },
    {
      header: "Estimated Opportunity Loss",
      accessorKey: "estimatedOpportunityLossMinorUnits",
      cell: (p) => (
        <span className="font-mono font-semibold text-rose-700">
          {formatMinorUnits(BigInt(p.estimatedOpportunityLossMinorUnits), "USD")}
        </span>
      ),
    },
    {
      header: "Action",
      cell: (p) => (
        <Link href={`/dashboard/recommendations?customerId=${p.customerId}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Recommend</span>
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Risk Monitoring</h1>
          <p className="text-xs text-slate-500 mt-1">
            Statistical churn detection evaluating individualized purchasing intervals against historical cadence.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="At-Risk Customers"
          value={totalAtRisk}
          subtitle="Exceeding normal purchase cadence"
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
        <KPICard
          title="Critical Churn Risk"
          value={criticalCount}
          subtitle="> 2.5x standard purchase interval"
          icon={ShieldAlert}
          variant="danger"
          loading={loading}
        />
        <KPICard
          title="Est. Revenue Exposure"
          value={formatMinorUnits(totalOpportunityLoss, "USD")}
          subtitle="Annualized missed reorder value"
          icon={UserX}
          variant="warning"
          loading={loading}
        />
        <KPICard
          title="Monitored Cadences"
          value={profiles.length}
          subtitle="Qualified accounts evaluated"
          icon={Clock}
          variant="default"
          loading={loading}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Filter Risk:</span>
        {[
          { id: "all", label: "All Customers" },
          { id: "at_risk", label: "At-Risk Only" },
          { id: "critical", label: "Critical" },
          { id: "high", label: "High" },
          { id: "insufficient_history", label: "Insufficient History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredProfiles}
        loading={loading}
        keyExtractor={(p) => p.customerId}
        emptyTitle="No at-risk customers found"
        emptyDescription="All customers in this category are ordering within expected cadences."
      />
    </div>
  );
}
