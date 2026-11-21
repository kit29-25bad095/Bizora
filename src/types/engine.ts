/**
 * BIZORA ENGINE DATA TYPES
 * Output contracts for deterministic financial calculations and dormancy intelligence.
 */

export interface FinancialMetricCard {
  label: string;
  amountMinorUnits: bigint;
  formattedAmount: string;
  changePercentage: number;
  direction: "up" | "down" | "neutral";
  currency: string;
  description: string;
}

export interface StoreFinancialSummary {
  grossSalesMinorUnits: bigint;
  discountsMinorUnits: bigint;
  taxMinorUnits: bigint;
  netSalesMinorUnits: bigint;
  refundsMinorUnits: bigint;
  settledPaymentsMinorUnits: bigint;
  cashCollectedMinorUnits: bigint;
  averageOrderValueMinorUnits: bigint;
  totalOrdersCount: number;
  totalCustomersCount: number;
  openQuotationsValueMinorUnits: bigint;
  expiredQuotationsValueMinorUnits: bigint;
  currency: string;
  currencyExponent: number;
  calculatedAt: string;
}

export interface DailySalesTrend {
  date: string;
  grossMinorUnits: bigint;
  netMinorUnits: bigint;
  orderCount: number;
}

export type RiskLevel = "low" | "medium" | "high" | "critical" | "insufficient_history";

export interface CustomerDormancyAssessment {
  customerId: string;
  customerName: string;
  phone?: string;
  email?: string;
  totalSpendMinorUnits: bigint;
  totalOrders: number;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  averageCycleDays: number;
  cycleStandardDeviationDays: number;
  cycleMultiplier: number;
  dormancyScore: number; // 0 (active) to 100 (critically dormant)
  riskLevel: RiskLevel;
  explanation: string;
  estimatedOpportunityLossMinorUnits: bigint;
}

export interface RecoveryOpportunitySummary {
  totalAtRiskRevenueMinorUnits: bigint;
  atRiskCustomerCount: number;
  dormantHighValueCustomersCount: number;
  expiredQuoteOpportunitiesCount: number;
  actionableDraftsPendingApprovalCount: number;
  currency: string;
}
