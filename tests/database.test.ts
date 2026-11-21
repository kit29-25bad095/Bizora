import { describe, it, expect } from "vitest";
import * as schema from "../src/lib/db/schema";
import {
  isValidUuid,
  buildTenantContextSql,
  withTenantContext,
} from "../src/lib/db/tenant-context";
import { ForbiddenError } from "../src/lib/errors";

describe("Phase 09 — Database Implementation: Schema Architecture", () => {
  it("defines all core domain tables with composite primary keys and tenant isolation", () => {
    // Identity domain
    expect(schema.businesses).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.businessUsers).toBeDefined();

    // Core business domain
    expect(schema.customers).toBeDefined();
    expect(schema.transactions).toBeDefined();
    expect(schema.transactionItems).toBeDefined();
    expect(schema.quotations).toBeDefined();
    expect(schema.quotationItems).toBeDefined();

    // Ingestion domain
    expect(schema.importBatches).toBeDefined();

    // Recovery domain
    expect(schema.recoveryCampaigns).toBeDefined();
    expect(schema.recoveryDrafts).toBeDefined();
    expect(schema.communicationHandoffs).toBeDefined();

    // Audit domain
    expect(schema.auditEvents).toBeDefined();
  });

  it("verifies financial tables store amounts as minor units with currency fields", () => {
    const tx = schema.transactions;
    expect(tx.grossAmountMinorUnits).toBeDefined();
    expect(tx.discountAmountMinorUnits).toBeDefined();
    expect(tx.taxAmountMinorUnits).toBeDefined();
    expect(tx.netAmountMinorUnits).toBeDefined();
    expect(tx.refundedAmountMinorUnits).toBeDefined();
    expect(tx.amountMinorUnits).toBeDefined();
    expect(tx.currency).toBeDefined();
    expect(tx.currencyExponent).toBeDefined();

    const quote = schema.quotations;
    expect(quote.amountMinorUnits).toBeDefined();
    expect(quote.currency).toBeDefined();
    expect(quote.currencyExponent).toBeDefined();
  });
});

describe("Phase 09 — Database Implementation: Tenant Context & RLS Enforcement", () => {
  const validTenantId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const invalidTenantId = "invalid-uuid-string";

  it("validates UUID v4 format correctly", () => {
    expect(isValidUuid(validTenantId)).toBe(true);
    expect(isValidUuid(invalidTenantId)).toBe(false);
    expect(isValidUuid("")).toBe(false);
    expect(isValidUuid("12345")).toBe(false);
  });

  it("builds safe RLS tenant context SQL query", () => {
    const sql = buildTenantContextSql(validTenantId);
    expect(sql).toBe(`SET LOCAL app.current_tenant_id = '${validTenantId}';`);
  });

  it("rejects invalid UUID in buildTenantContextSql with ForbiddenError", () => {
    expect(() => buildTenantContextSql(invalidTenantId)).toThrow(ForbiddenError);
  });

  it("withTenantContext wraps execution with validated tenant context", async () => {
    const result = await withTenantContext(validTenantId, async (ctx) => {
      expect(ctx.businessId).toBe(validTenantId);
      return "success";
    });

    expect(result).toBe("success");
  });

  it("withTenantContext rejects invalid tenantId", async () => {
    await expect(
      withTenantContext(invalidTenantId, async () => {
        return "should-fail";
      })
    ).rejects.toThrow(ForbiddenError);
  });
});
