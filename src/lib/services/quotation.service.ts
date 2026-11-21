import crypto from "node:crypto";
import { withTenantContext } from "../db/tenant-context";
import { ValidationError } from "../errors";

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface QuotationItemInput {
  sku?: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: bigint;
}

export interface CreateQuotationInput {
  customerId?: string;
  quoteNumber: string;
  issuedDate: Date;
  validUntilDate: Date;
  currency: string;
  currencyExponent?: number;
  items: QuotationItemInput[];
  probabilityPercentage?: number;
}

export interface QuotationRecord {
  id: string;
  businessId: string;
  customerId?: string;
  quoteNumber: string;
  issuedDate: string;
  validUntilDate: string;
  sentAt?: string;
  sentChannel?: string;
  amountMinorUnits: bigint;
  currency: string;
  currencyExponent: number;
  status: QuotationStatus;
  probabilityPercentage: number;
  createdAt: string;
  updatedAt: string;
}

const VALID_TRANSITIONS: Record<QuotationStatus, readonly QuotationStatus[]> = {
  draft: ["sent", "rejected"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

export class QuotationService {
  /**
   * Creates a quotation with validated total calculation.
   */
  static async createQuotation(
    businessId: string,
    input: CreateQuotationInput
  ): Promise<QuotationRecord> {
    return withTenantContext(businessId, async (ctx) => {
      if (!input.quoteNumber?.trim()) {
        throw new ValidationError("Quote number is required");
      }
      if (!input.items || input.items.length === 0) {
        throw new ValidationError("Quotation must include at least one item");
      }
      if (input.validUntilDate < input.issuedDate) {
        throw new ValidationError("Validity date cannot be earlier than issued date");
      }

      let totalMinorUnits = BigInt(0);
      for (const item of input.items) {
        if (item.unitPriceMinorUnits < BigInt(0)) {
          throw new ValidationError("Item unit price cannot be negative");
        }
        totalMinorUnits += item.unitPriceMinorUnits * BigInt(Math.round(item.quantity));
      }

      const now = new Date().toISOString();
      const quote: QuotationRecord = {
        id: crypto.randomUUID(),
        businessId: ctx.businessId,
        customerId: input.customerId,
        quoteNumber: input.quoteNumber.trim(),
        issuedDate: input.issuedDate.toISOString(),
        validUntilDate: input.validUntilDate.toISOString(),
        amountMinorUnits: totalMinorUnits,
        currency: input.currency.toUpperCase(),
        currencyExponent: input.currencyExponent || 2,
        status: "draft",
        probabilityPercentage: input.probabilityPercentage ?? 50,
        createdAt: now,
        updatedAt: now,
      };

      return quote;
    });
  }

  /**
   * Validates and transitions quotation status through its formal lifecycle.
   */
  static transitionStatus(
    currentStatus: QuotationStatus,
    targetStatus: QuotationStatus
  ): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid quotation status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(", ")}]`
      );
    }
    return true;
  }
}
