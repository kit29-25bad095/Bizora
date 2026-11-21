import crypto from "node:crypto";
import { withTenantContext } from "../db/tenant-context";
import { assessCustomerDormancy } from "../engine/dormancy";
import { CustomerDormancyAssessment } from "@/types/engine";
import { Customer, Transaction } from "@/types/domain";
import { ValidationError } from "../errors";

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  externalCustomerId?: string;
  tags?: string[];
}

export interface CustomerRecord {
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
  status: "active" | "inactive" | "churned" | "archived";
  createdAt: string;
  updatedAt: string;
}

export class CustomerService {
  /**
   * Creates a new customer within tenant boundary.
   */
  static async createCustomer(
    businessId: string,
    input: CreateCustomerInput
  ): Promise<CustomerRecord> {
    return withTenantContext(businessId, async (ctx) => {
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError("Customer name is required");
      }

      const now = new Date().toISOString();
      const customer: CustomerRecord = {
        id: crypto.randomUUID(),
        businessId: ctx.businessId,
        externalCustomerId: input.externalCustomerId,
        name: input.name.trim(),
        email: input.email?.trim().toLowerCase(),
        phone: input.phone?.trim(),
        tags: input.tags || [],
        firstSeenAt: now,
        lastActivityAt: now,
        totalSpendMinorUnits: 0n,
        totalOrders: 0,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      return customer;
    });
  }

  /**
   * Assesses a customer's dormancy profile using the deterministic dormancy engine.
   */
  static assessDormancy(
    customer: CustomerRecord,
    transactions: Transaction[] = [],
    asOfDate: Date = new Date()
  ): CustomerDormancyAssessment {
    const domainCustomer: Customer = {
      id: customer.id,
      businessId: customer.businessId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tags: customer.tags,
      totalSpendMinorUnits: customer.totalSpendMinorUnits,
      totalOrders: customer.totalOrders,
      averageOrderValueMinorUnits:
        customer.totalOrders > 0
          ? customer.totalSpendMinorUnits / BigInt(customer.totalOrders)
          : 0n,
      lastActivityAt: customer.lastActivityAt,
      firstSeenAt: customer.firstSeenAt,
      status: customer.status,
    };

    return assessCustomerDormancy(domainCustomer, transactions, asOfDate);
  }
}
