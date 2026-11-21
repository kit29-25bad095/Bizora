/**
 * BIZORA CENTRALIZED FRONTEND API CLIENT
 * Strongly-typed HTTP client for communicating with backend Next.js API routes.
 * Enforces standardized envelopes, error normalization, and loading states.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  atRiskCount?: number;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    timestamp: string;
  };
}

class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "API_ERROR", statusCode = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
    const errorCode = json.error?.code || "UNKNOWN_ERROR";
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return json.data as T;
}

export const apiClient = {
  // Authentication & Session
  async getMe() {
    return request<{
      id: string;
      businessId: string;
      email: string;
      name: string;
      role: "owner" | "manager" | "analyst";
    }>("/api/auth/me");
  },

  // Health
  async getHealth() {
    return request<{
      status: string;
      timestamp: string;
      uptime: number;
    }>("/api/health");
  },

  // Financials & Analytics
  async getFinancials() {
    return request<{
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
    }>("/api/financials");
  },

  // Customers
  async getCustomers(query?: { search?: string; status?: string }) {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.status) params.set("status", query.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<
      Array<{
        id: string;
        businessId: string;
        name: string;
        email?: string;
        phone?: string;
        tags: string[];
        firstSeenAt: string;
        lastActivityAt: string;
        totalSpendMinorUnits: string;
        totalOrders: number;
        averageOrderValueMinorUnits: string;
        status: "active" | "inactive" | "churned" | "archived";
      }>
    >(`/api/customers${qs}`);
  },

  // Customer Risk
  async getCustomerRisk() {
    return request<
      Array<{
        customerId: string;
        customerName: string;
        phone?: string;
        email?: string;
        totalSpendMinorUnits: string;
        totalOrders: number;
        lastPurchaseDate: string;
        daysSinceLastPurchase: number;
        averageCycleDays: number;
        cycleStandardDeviationDays: number;
        cycleMultiplier: number;
        dormancyScore: number;
        riskLevel: "active" | "low" | "medium" | "high" | "critical" | "insufficient_history";
        explanation: string;
        estimatedOpportunityLossMinorUnits: string;
      }>
    >("/api/risk");
  },

  // Recovery Opportunities Summary
  async getRecoveryOpportunities() {
    return request<{
      totalAtRiskRevenueMinorUnits: string;
      atRiskCustomerCount: number;
      dormantHighValueCustomersCount: number;
      expiredQuoteOpportunitiesCount: number;
      actionableDraftsPendingApprovalCount: number;
      currency: string;
    }>("/api/recovery/opportunities");
  },

  // Recovery Drafts
  async getDrafts(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<
      Array<{
        id: string;
        businessId: string;
        customerId: string;
        customerName: string;
        quotationId?: string;
        quoteNumber?: string;
        recipientIdentifier: string;
        suggestedChannel: "whatsapp" | "email";
        draftSubject?: string;
        draftBody: string;
        aiRationale: string;
        aiRiskScore: number;
        aiPromptVersion: string;
        status: "pending_approval" | "approved" | "rejected" | "superseded";
        createdAt: string;
        updatedAt: string;
      }>
    >(`/api/recovery/drafts${qs}`);
  },

  // Edit draft content
  async updateDraft(id: string, body: { draftBody: string; draftSubject?: string }) {
    return request(`/api/recovery/drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  // Approve draft (Owner permission required)
  async approveDraft(id: string) {
    return request(`/api/recovery/drafts/${id}/approve`, {
      method: "POST",
    });
  },

  // Reject draft (Owner permission required)
  async rejectDraft(id: string, reason?: string) {
    return request(`/api/recovery/drafts/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // Dispatch client-side handoff
  async generateHandoff(draftId: string) {
    return request<{
      handoff: {
        id: string;
        channel: "whatsapp" | "email";
        handoffUrl: string;
        userConfirmedOutcome: string;
      };
      url: string;
    }>("/api/recovery/handoff", {
      method: "POST",
      body: JSON.stringify({ draftId }),
    });
  },

  // Transactions
  async getTransactions() {
    return request<
      Array<{
        id: string;
        businessId: string;
        customerId?: string;
        customerName?: string;
        transactionDate: string;
        grossAmountMinorUnits: string;
        netAmountMinorUnits: string;
        amountMinorUnits: string;
        currency: string;
        status: string;
        paymentChannel: string;
      }>
    >("/api/transactions");
  },

  // Quotations
  async getQuotations() {
    return request<
      Array<{
        id: string;
        businessId: string;
        customerName: string;
        quoteNumber: string;
        issuedDate: string;
        validUntilDate: string;
        amountMinorUnits: string;
        currency: string;
        status: string;
        probabilityPercentage: number;
        itemsDescription: string;
      }>
    >("/api/quotations");
  },
};
