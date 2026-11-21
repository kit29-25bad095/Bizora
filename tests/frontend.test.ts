import { describe, it, expect, vi } from "vitest";
import React from "react";
import { formatMinorUnits } from "../src/lib/engine/currency";
import { apiClient } from "../src/lib/api/client";
import { NAV_ITEMS } from "../src/components/layout/Sidebar";

describe("Phase 11 — Frontend Architecture: Navigation & Shell", () => {
  it("exposes all 9 mandatory platform routes in the sidebar", () => {
    const expectedRoutes = [
      "/dashboard",
      "/dashboard/revenue",
      "/dashboard/customers",
      "/dashboard/risk",
      "/dashboard/recovery",
      "/dashboard/recommendations",
      "/dashboard/drafts",
      "/dashboard/approvals",
      "/dashboard/settings",
    ];

    const actualHrefs = NAV_ITEMS.map((item) => item.href);
    expect(actualHrefs).toEqual(expectedRoutes);
  });

  it("designates Approvals with Owner authorization requirement badge", () => {
    const approvalsItem = NAV_ITEMS.find((item) => item.href === "/dashboard/approvals");
    expect(approvalsItem).toBeDefined();
    expect(approvalsItem?.badge).toBe("Owner");
  });
});

describe("Phase 11 — Frontend Architecture: Currency Formatting Utilities", () => {
  it("formats integer minor units deterministically across currency exponents", () => {
    // USD: exponent 2
    expect(formatMinorUnits(125000n, "USD", 2)).toBe("$1,250.00");
    expect(formatMinorUnits(50n, "USD", 2)).toBe("$0.50");
    expect(formatMinorUnits(0n, "USD", 2)).toBe("$0.00");

    // EUR: exponent 2
    expect(formatMinorUnits(8500n, "EUR", 2)).toBe("€85.00");

    // GBP: exponent 2
    expect(formatMinorUnits(19999n, "GBP", 2)).toBe("£199.99");

    // JPY: zero-decimal exponent 0
    expect(formatMinorUnits(5000n, "JPY", 0)).toBe("¥5,000");

    // BHD: exponent 3
    expect(formatMinorUnits(12345n, "BHD", 3)).toBe("BD 12.345");
  });
});

describe("Phase 11 — Frontend Architecture: Centralized API Client", () => {
  it("apiClient exports expected resource query methods", () => {
    expect(typeof apiClient.getMe).toBe("function");
    expect(typeof apiClient.getHealth).toBe("function");
    expect(typeof apiClient.getFinancials).toBe("function");
    expect(typeof apiClient.getCustomers).toBe("function");
    expect(typeof apiClient.getCustomerRisk).toBe("function");
    expect(typeof apiClient.getRecoveryOpportunities).toBe("function");
    expect(typeof apiClient.getDrafts).toBe("function");
    expect(typeof apiClient.approveDraft).toBe("function");
    expect(typeof apiClient.rejectDraft).toBe("function");
    expect(typeof apiClient.generateHandoff).toBe("function");
    expect(typeof apiClient.getTransactions).toBe("function");
    expect(typeof apiClient.getQuotations).toBe("function");
  });
});
