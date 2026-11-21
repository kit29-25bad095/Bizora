/**
 * CUSTOMER DORMANCY & CHURN-RISK INTELLIGENCE ENGINE
 * Evaluates individual customer purchase cadence against statistical intervals.
 * Enforces strict sample-size guardrails (N < 3 => insufficient_history) and zero-variance buffers.
 */

import { Customer, Transaction } from "@/types/domain";
import { CustomerDormancyAssessment, RiskLevel } from "@/types/engine";

export function assessCustomerDormancy(
  customer: Customer,
  customerTransactions: Transaction[],
  observationDate = new Date()
): CustomerDormancyAssessment {
  const completedTx = customerTransactions
    .filter((t) => t.status === "completed")
    .sort(
      (a, b) =>
        new Date(a.transactionDate).getTime() -
        new Date(b.transactionDate).getTime()
    );

  const totalOrders = completedTx.length;
  const lastTx = completedTx[completedTx.length - 1];
  const lastPurchaseDate = lastTx ? lastTx.transactionDate : customer.lastActivityAt;

  const msSinceLast =
    observationDate.getTime() - new Date(lastPurchaseDate).getTime();
  const daysSinceLastPurchase = Math.max(0, Math.floor(msSinceLast / (1000 * 60 * 60 * 24)));

  // Guardrail 1: Insufficient history (N < 3)
  if (totalOrders < 3) {
    return {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalSpendMinorUnits: customer.totalSpendMinorUnits,
      totalOrders,
      lastPurchaseDate,
      daysSinceLastPurchase,
      averageCycleDays: 0,
      cycleStandardDeviationDays: 0,
      cycleMultiplier: 1.0,
      dormancyScore: 10,
      riskLevel: "insufficient_history",
      explanation: `Customer has only ${totalOrders} recorded orders. Minimum 3 purchases required for baseline dormancy modeling.`,
      estimatedOpportunityLossMinorUnits: 0n,
    };
  }

  // Calculate intervals between consecutive purchases
  const intervals: number[] = [];
  for (let i = 1; i < completedTx.length; i++) {
    const prev = new Date(completedTx[i - 1]!.transactionDate).getTime();
    const curr = new Date(completedTx[i]!.transactionDate).getTime();
    const intervalDays = Math.max(1, Math.round((curr - prev) / (1000 * 60 * 60 * 24)));
    intervals.push(intervalDays);
  }

  // Mean interval (average cycle)
  const sumIntervals = intervals.reduce((acc, val) => acc + val, 0);
  const avgCycle = Math.round(sumIntervals / intervals.length);

  // Standard deviation
  const variance =
    intervals.reduce((acc, val) => acc + Math.pow(val - avgCycle, 2), 0) /
    intervals.length;
  let stdDev = Math.round(Math.sqrt(variance));

  // Guardrail 2: Zero or very low variance default
  if (stdDev < 2) {
    stdDev = 4; // 4-day minimum natural variance buffer
  }

  const cycleMultiplier = Number((daysSinceLastPurchase / (avgCycle || 1)).toFixed(1));

  // Calculate Dormancy Score D in [0, 100]
  // Based on Z-score: z = (daysSinceLast - avgCycle) / stdDev
  const zScore = (daysSinceLastPurchase - avgCycle) / stdDev;

  let dormancyScore = 0;
  let riskLevel: RiskLevel = "low";

  if (zScore <= 0.5) {
    dormancyScore = Math.max(5, Math.round(20 * (daysSinceLastPurchase / avgCycle)));
    riskLevel = "low";
  } else if (zScore <= 1.5) {
    dormancyScore = Math.round(30 + (zScore - 0.5) * 30); // 30 - 60
    riskLevel = "medium";
  } else if (zScore <= 2.5) {
    dormancyScore = Math.round(60 + (zScore - 1.5) * 25); // 60 - 85
    riskLevel = "high";
  } else {
    dormancyScore = Math.min(100, Math.round(85 + (zScore - 2.5) * 10)); // 85 - 100
    riskLevel = "critical";
  }

  // Explanation in plain business language
  let explanation = "";
  if (riskLevel === "low") {
    explanation = `Active cadence: Last purchased ${daysSinceLastPurchase} days ago (normal cycle is ${avgCycle} days; ${cycleMultiplier}x cycle elapsed).`;
  } else if (riskLevel === "medium") {
    explanation = `Slight delay: ${daysSinceLastPurchase} days since last purchase exceeds average ${avgCycle}-day cadence by ${cycleMultiplier}x.`;
  } else if (riskLevel === "high") {
    explanation = `High churn risk: ${daysSinceLastPurchase} days inactive (${cycleMultiplier}x regular ${avgCycle}-day cycle). Purchase window lapsed.`;
  } else {
    explanation = `Critical dormancy: Inactive for ${daysSinceLastPurchase} days (${cycleMultiplier}x cycle). Immediate win-back recovery action recommended.`;
  }

  // Estimated Opportunity Loss = AOV * estimated missed cycles
  const aov = customer.totalOrders > 0 ? customer.totalSpendMinorUnits / BigInt(customer.totalOrders) : 0n;
  const missedCycles = Math.max(0, Math.floor(daysSinceLastPurchase / (avgCycle || 1)) - 1);
  const estimatedOpportunityLossMinorUnits = aov * BigInt(missedCycles);

  return {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    email: customer.email,
    totalSpendMinorUnits: customer.totalSpendMinorUnits,
    totalOrders,
    lastPurchaseDate,
    daysSinceLastPurchase,
    averageCycleDays: avgCycle,
    cycleStandardDeviationDays: stdDev,
    cycleMultiplier,
    dormancyScore,
    riskLevel,
    explanation,
    estimatedOpportunityLossMinorUnits,
  };
}
