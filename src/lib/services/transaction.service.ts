import crypto from "node:crypto";
import { withTenantContext } from "../db/tenant-context";
import { calculateStoreFinancials } from "../engine/financial";
import { Transaction } from "@/types/domain";
import { StoreFinancialSummary } from "@/types/engine";
import { ValidationError } from "../errors";
import { tenantCache } from "../cache";

export interface TransactionItemInput {
  sku?: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: bigint;
  discountMinorUnits?: bigint;
}

export interface CreateTransactionInput {
  customerId?: string;
  externalTransactionId?: string;
  transactionDate?: Date;
  currency: string;
  currencyExponent?: number;
  items: TransactionItemInput[];
  taxAmountMinorUnits?: bigint;
  paymentChannel?: "pos" | "online" | "bank_transfer" | "cash";
}

export class TransactionService {
  /**
   * Records a sales transaction with exact integer minor-unit financial calculations.
   */
  static async recordTransaction(
    businessId: string,
    input: CreateTransactionInput
  ): Promise<{ transaction: Transaction; breakdown: { grossAmountMinorUnits: bigint; discountAmountMinorUnits: bigint; taxAmountMinorUnits: bigint; netAmountMinorUnits: bigint; amountMinorUnits: bigint } }> {
    return withTenantContext(businessId, async (ctx) => {
      if (!input.items || input.items.length === 0) {
        throw new ValidationError("Transaction must include at least one line item");
      }

      if (!input.currency || input.currency.length !== 3) {
        throw new ValidationError("ISO 4217 3-letter currency code is required");
      }

      // Calculate totals across items
      let grossAmount = 0n;
      let totalDiscount = 0n;

      for (const item of input.items) {
        if (item.unitPriceMinorUnits < 0n) {
          throw new ValidationError("Unit price cannot be negative");
        }
        if (item.quantity <= 0) {
          throw new ValidationError("Item quantity must be greater than zero");
        }

        const itemGross = item.unitPriceMinorUnits * BigInt(Math.round(item.quantity));
        const itemDiscount = item.discountMinorUnits || 0n;

        grossAmount += itemGross;
        totalDiscount += itemDiscount;
      }

      const taxAmount = input.taxAmountMinorUnits || 0n;
      const netAmount = grossAmount - totalDiscount + taxAmount;
      const amount = netAmount;

      const now = new Date().toISOString();
      const txDate = (input.transactionDate || new Date()).toISOString();

      const transaction: Transaction = {
        id: crypto.randomUUID(),
        businessId: ctx.businessId,
        customerId: input.customerId,
        externalTransactionId: input.externalTransactionId,
        transactionDate: txDate,
        grossAmountMinorUnits: grossAmount,
        discountAmountMinorUnits: totalDiscount,
        taxAmountMinorUnits: taxAmount,
        netAmountMinorUnits: netAmount,
        refundedAmountMinorUnits: 0n,
        amountMinorUnits: amount,
        currency: input.currency.toUpperCase(),
        currencyExponent: input.currencyExponent || 2,
        status: "completed",
        settlementStatus: "settled",
        paymentChannel: input.paymentChannel || "pos",
      };

      const breakdown = {
        grossAmountMinorUnits: grossAmount,
        discountAmountMinorUnits: totalDiscount,
        taxAmountMinorUnits: taxAmount,
        netAmountMinorUnits: netAmount,
        amountMinorUnits: amount,
      };

      // Invalidate cached financial aggregations on mutation
      await tenantCache.invalidateTenant(ctx.businessId, "financials");

      return { transaction, breakdown };
    });
  }

  /**
   * Aggregates store financials deterministically.
   */
  static getFinancialSummary(
    transactions: Transaction[],
    currency = "USD",
    currencyExponent = 2
  ): StoreFinancialSummary {
    return calculateStoreFinancials(transactions, [], currency, currencyExponent);
  }
}
