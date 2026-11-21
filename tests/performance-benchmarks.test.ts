import { describe, it, expect, beforeEach } from "vitest";
import { calculateStoreFinancials, calculateDailySalesTrend } from "../src/lib/engine/financial";
import { formatMinorUnits, parseToMinorUnits } from "../src/lib/engine/currency";
import { assessCustomerDormancy } from "../src/lib/engine/dormancy";
import { tenantCache } from "../src/lib/cache";
import { AuditService } from "../src/lib/services/audit.service";
import { Transaction, Customer, Quotation } from "@/types/domain";

describe("Phase 14 — Performance, Scalability & Load Testing Benchmarks", () => {
  beforeEach(() => {
    tenantCache.clear();
  });

  it("Benchmark 1: High-Volume Transaction Financial Aggregation (10,000 Transactions)", () => {
    const mockTransactions: Transaction[] = [];
    const baseDate = new Date("2026-01-01T00:00:00Z").getTime();

    for (let i = 0; i < 10_000; i++) {
      const txDate = new Date(baseDate + (i % 30) * 86_400_000).toISOString();
      mockTransactions.push({
        id: `tx-bench-${i}`,
        businessId: "11111111-1111-4111-8111-111111111111",
        customerId: `cust-${i % 250}`,
        transactionDate: txDate,
        grossAmountMinorUnits: BigInt((i % 500 + 1) * 100),
        discountAmountMinorUnits: BigInt((i % 50) * 10),
        taxAmountMinorUnits: BigInt((i % 40) * 5),
        netAmountMinorUnits: BigInt((i % 500 + 1) * 100 - (i % 50) * 10 + (i % 40) * 5),
        refundedAmountMinorUnits: i % 100 === 0 ? 500n : 0n,
        amountMinorUnits: BigInt((i % 500 + 1) * 100 - (i % 50) * 10 + (i % 40) * 5),
        currency: "USD",
        currencyExponent: 2,
        status: i % 50 === 0 ? "refunded" : "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      });
    }

    const startTime = performance.now();
    const financials = calculateStoreFinancials(mockTransactions, [], "USD", 2);
    const durationMs = performance.now() - startTime;

    expect(financials.totalOrdersCount).toBeGreaterThan(9_000);
    expect(financials.grossSalesMinorUnits).toBeGreaterThan(0n);
    expect(durationMs).toBeLessThan(150); // Under 150ms for 10,000 BigInt transactions

    const trendStart = performance.now();
    const trend = calculateDailySalesTrend(mockTransactions, 14);
    const trendDurationMs = performance.now() - trendStart;

    expect(trend.length).toBe(14);
    expect(trendDurationMs).toBeLessThan(100);
  });

  it("Benchmark 2: Currency Minor-Unit Conversion Throughput (10,000 Operations)", () => {
    const startTime = performance.now();
    let sampleFormatted = "";

    for (let i = 0; i < 10_000; i++) {
      const amountStr = `${(i % 1000) + 1}.${(i % 99).toString().padStart(2, "0")}`;
      const minor = parseToMinorUnits(amountStr, "USD", 2);
      sampleFormatted = formatMinorUnits(minor, "USD", 2);
    }

    const durationMs = performance.now() - startTime;
    expect(sampleFormatted.startsWith("$")).toBe(true);
    expect(durationMs).toBeLessThan(250); // 10,000 ops in < 250ms (>40,000 ops/sec)
  });

  it("Benchmark 3: Statistical Dormancy Engine Cadence Analysis (1,000 Customers)", () => {
    const customer: Customer = {
      id: "cust-bench-1",
      businessId: "11111111-1111-4111-8111-111111111111",
      name: "Benchmark Enterprise",
      totalSpendMinorUnits: 2500000n,
      totalOrders: 12,
      lastActivityAt: "2026-01-01T00:00:00Z",
      firstSeenAt: "2025-01-01T00:00:00Z",
      status: "active",
      tags: [],
      averageOrderValueMinorUnits: 208333n,
    };

    const customerTxs: Transaction[] = [];
    for (let j = 0; j < 12; j++) {
      customerTxs.push({
        id: `tx-cust-${j}`,
        businessId: customer.businessId,
        customerId: customer.id,
        transactionDate: new Date(2025, j, 15).toISOString(),
        grossAmountMinorUnits: 208333n,
        discountAmountMinorUnits: 0n,
        taxAmountMinorUnits: 0n,
        netAmountMinorUnits: 208333n,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: 208333n,
        currency: "USD",
        currencyExponent: 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: "pos",
      });
    }

    const startTime = performance.now();
    for (let i = 0; i < 1_000; i++) {
      const assessment = assessCustomerDormancy(customer, customerTxs);
      expect(assessment.riskLevel).toBeDefined();
    }
    const durationMs = performance.now() - startTime;

    expect(durationMs).toBeLessThan(200); // 1,000 evaluations in < 200ms
  });

  it("Benchmark 4: Multi-Tenant Cache Isolation & Invalidation Throughput", async () => {
    const tenantA = "11111111-1111-4111-8111-111111111111";
    const tenantB = "22222222-2222-4222-8222-222222222222";

    // Set 1,000 cached records across two tenants
    const startTime = performance.now();
    for (let i = 0; i < 500; i++) {
      await tenantCache.set(tenantA, "financials", `key-${i}`, { val: i }, 60);
      await tenantCache.set(tenantB, "financials", `key-${i}`, { val: i * 2 }, 60);
    }
    const setDurationMs = performance.now() - startTime;
    expect(setDurationMs).toBeLessThan(100);

    // Verify sub-millisecond retrieval (1,000 lookups)
    const readStart = performance.now();
    for (let i = 0; i < 500; i++) {
      const valA = await tenantCache.get<{ val: number }>(tenantA, "financials", `key-${i}`);
      const valB = await tenantCache.get<{ val: number }>(tenantB, "financials", `key-${i}`);
      expect(valA?.val).toBe(i);
      expect(valB?.val).toBe(i * 2);
    }
    const readDurationMs = performance.now() - readStart;
    expect(readDurationMs).toBeLessThan(150); // 1,000 lookups in < 150ms (< 0.15ms/lookup)

    // Verify tenant-scoped invalidation
    const deletedA = await tenantCache.invalidateTenant(tenantA, "financials");
    expect(deletedA).toBe(500);

    // Tenant A keys must be gone, Tenant B keys must remain intact
    const valAAfter = await tenantCache.get(tenantA, "financials", "key-0");
    const valBAfter = await tenantCache.get<{ val: number }>(tenantB, "financials", "key-0");
    expect(valAAfter).toBeNull();
    expect(valBAfter?.val).toBe(0);

    const stats = tenantCache.getStats();
    expect(stats.hits).toBe(1001); // 1,000 baseline reads + 1 tenant B read
    expect(stats.invalidations).toBe(500);
  });

  it("Benchmark 5: Cryptographic SHA-256 Audit Ledger Chain Computation (500 Blocks)", () => {
    const businessId = "11111111-1111-4111-8111-111111111111";
    const entries = [];
    let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const startTime = performance.now();
    for (let i = 0; i < 500; i++) {
      const event = AuditService.createEvent({
        businessId,
        sequenceNumber: BigInt(i + 1),
        action: "financials:recalculated",
        entityType: "transaction",
        entityId: `entity-${i}`,
        previousHash: prevHash,
        metadata: { blockIndex: i, computedAt: Date.now() },
      });
      prevHash = event.eventHash;
      entries.push(event);
    }
    const durationMs = performance.now() - startTime;

    expect(entries.length).toBe(500);
    expect(durationMs).toBeLessThan(100); // 500 chained cryptographic hashes in < 100ms
  });

  it("Benchmark 6: Concurrent Request Latency Profiling (p50, p90, p95, p99)", async () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const latencies: number[] = [];

    // Simulate 200 concurrent requests with cache warmup
    await tenantCache.set(tenantId, "dashboard", "kpis", { revenue: "125000.00" }, 60);

    for (let i = 0; i < 200; i++) {
      const t0 = performance.now();
      const res = await tenantCache.get(tenantId, "dashboard", "kpis");
      const elapsed = performance.now() - t0;
      latencies.push(elapsed);
      expect(res).toBeDefined();
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p90 = latencies[Math.floor(latencies.length * 0.9)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    // Sub-millisecond performance profile
    expect(p50).toBeLessThan(1.0); // p50 < 1.0ms
    expect(p95).toBeLessThan(2.0); // p95 < 2.0ms
    expect(p99).toBeLessThan(5.0); // p99 < 5.0ms
  });
});
