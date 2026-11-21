/**
 * BIZORA DOMAIN MODEL TYPES
 * Strictly typed integer minor-unit financial representation.
 */

export type Role = "owner" | "manager" | "analyst";

export interface Business {
  id: string;
  name: string;
  slug: string;
  industry: "retail" | "ecommerce" | "wholesale" | "hardware";
  baseCurrency: string;
  currencyExponent: number; // 2 for USD/EUR/GBP, 0 for JPY, 3 for BHD
  timezone: string;
  status: "active" | "suspended" | "archived";
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  businessId: string;
}

export interface Customer {
  id: string;
  businessId: string;
  externalCustomerId?: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  firstSeenAt: string;
  lastActivityAt: string;
  totalSpendMinorUnits: bigint;
  totalOrders: number;
  averageOrderValueMinorUnits: bigint;
  status: "active" | "inactive" | "churned" | "archived";
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  sku?: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: bigint;
  discountMinorUnits: bigint;
  totalMinorUnits: bigint;
}

export interface Transaction {
  id: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  externalTransactionId?: string;
  transactionDate: string;
  grossAmountMinorUnits: bigint;
  discountAmountMinorUnits: bigint;
  taxAmountMinorUnits: bigint;
  netAmountMinorUnits: bigint;
  refundedAmountMinorUnits: bigint;
  amountMinorUnits: bigint; // settled net (netAmount - refundedAmount)
  currency: string;
  currencyExponent: number;
  status: "completed" | "refunded" | "cancelled";
  settlementStatus: "settled" | "pending" | "disputed";
  paymentChannel: "pos" | "online" | "bank_transfer" | "cash";
  items?: TransactionItem[];
}

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface Quotation {
  id: string;
  businessId: string;
  customerId?: string;
  customerName: string;
  quoteNumber: string;
  issuedDate: string;
  validUntilDate: string;
  sentAt?: string;
  sentChannel?: "whatsapp" | "email" | "in_person" | "portal";
  amountMinorUnits: bigint;
  currency: string;
  currencyExponent: number;
  status: QuotationStatus;
  probabilityPercentage: number;
  itemsDescription: string;
  createdAt: string;
}

export type DraftStatus = "pending_approval" | "approved" | "rejected" | "superseded";

export interface RecoveryDraft {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  recipientIdentifier: string; // Phone for WhatsApp, Email for mailto
  quotationId?: string;
  quoteNumber?: string;
  suggestedChannel: "whatsapp" | "email";
  draftSubject?: string;
  draftBody: string;
  aiRationale: string;
  aiRiskScore: number; // 1-100
  aiPromptVersion: string;
  status: DraftStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationHandoff {
  id: string;
  businessId: string;
  draftId: string;
  customerId: string;
  customerName: string;
  channel: "whatsapp" | "email";
  handoffUrl: string; // wa.me or mailto
  initiatedByUserId: string;
  handoffInitiatedAt: string;
  userConfirmedOutcome: "unconfirmed" | "sent_confirmed" | "customer_replied" | "cancelled";
  outcomeRecordedAt?: string;
}
