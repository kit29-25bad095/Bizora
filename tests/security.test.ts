import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, ARGON2_CONFIG } from "../src/lib/auth/password";
import {
  hasPermission,
  hasRole,
  requirePermission,
  requireRole,
  Permission,
} from "../src/lib/auth/rbac";
import { assertTenantAccess } from "../src/lib/auth/tenant-guard";
import { SessionUser } from "../src/lib/auth/session";
import { ForbiddenError, UnauthorizedError } from "../src/lib/errors";

describe("Phase 08 — Security Foundation: Password Hashing", () => {
  it("enforces Argon2id parameters configuration", () => {
    expect(ARGON2_CONFIG.memoryCost).toBe(65536);
    expect(ARGON2_CONFIG.timeCost).toBe(3);
    expect(ARGON2_CONFIG.parallelism).toBe(4);
    expect(ARGON2_CONFIG.outputLen).toBe(32);
  });

  it("hashes password and verifies successfully", async () => {
    const plaintext = "SuperSecretP@ssw0rd!2026";
    const hashed = await hashPassword(plaintext);

    expect(hashed).toBeDefined();
    expect(hashed).toContain("$argon2id$");

    const isValid = await verifyPassword(plaintext, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("WrongPassword123!", hashed);
    expect(isInvalid).toBe(false);
  });

  it("rejects passwords under 8 characters", async () => {
    await expect(hashPassword("short")).rejects.toThrow(
      "Password must be at least 8 characters in length"
    );
  });
});

describe("Phase 08 — Security Foundation: Role-Based Access Control (RBAC)", () => {
  const ownerUser: SessionUser = {
    id: "user-owner-1",
    businessId: "11111111-1111-4111-8111-111111111111",
    email: "owner@bizora.app",
    name: "Owner Alice",
    role: "owner",
    createdAt: new Date().toISOString(),
  };

  const managerUser: SessionUser = {
    id: "user-manager-1",
    businessId: "11111111-1111-4111-8111-111111111111",
    email: "manager@bizora.app",
    name: "Manager Bob",
    role: "manager",
    createdAt: new Date().toISOString(),
  };

  const analystUser: SessionUser = {
    id: "user-analyst-1",
    businessId: "11111111-1111-4111-8111-111111111111",
    email: "analyst@bizora.app",
    name: "Analyst Charlie",
    role: "analyst",
    createdAt: new Date().toISOString(),
  };

  it("verifies Owner has full approval, execution, and management permissions", () => {
    expect(hasPermission("owner", "recovery:approve")).toBe(true);
    expect(hasPermission("owner", "recovery:execute")).toBe(true);
    expect(hasPermission("owner", "business:manage")).toBe(true);
    expect(hasPermission("owner", "users:manage")).toBe(true);
    expect(hasPermission("owner", "customers:write")).toBe(true);
    expect(hasPermission("owner", "transactions:write")).toBe(true);
    expect(hasPermission("owner", "quotations:write")).toBe(true);
  });

  it("verifies Manager can draft and write, but CANNOT approve recovery or manage business", () => {
    expect(hasPermission("manager", "recovery:draft")).toBe(true);
    expect(hasPermission("manager", "customers:write")).toBe(true);
    expect(hasPermission("manager", "transactions:write")).toBe(true);
    expect(hasPermission("manager", "quotations:write")).toBe(true);

    // Forbidden for Manager:
    expect(hasPermission("manager", "recovery:approve")).toBe(false);
    expect(hasPermission("manager", "recovery:execute")).toBe(false);
    expect(hasPermission("manager", "business:manage")).toBe(false);
    expect(hasPermission("manager", "users:manage")).toBe(false);
  });

  it("verifies Analyst has strictly read-only access", () => {
    expect(hasPermission("analyst", "analytics:read")).toBe(true);
    expect(hasPermission("analyst", "customers:read")).toBe(true);
    expect(hasPermission("analyst", "transactions:read")).toBe(true);
    expect(hasPermission("analyst", "quotations:read")).toBe(true);
    expect(hasPermission("analyst", "recovery:read")).toBe(true);

    // All write operations forbidden for Analyst:
    expect(hasPermission("analyst", "customers:write")).toBe(false);
    expect(hasPermission("analyst", "transactions:write")).toBe(false);
    expect(hasPermission("analyst", "quotations:write")).toBe(false);
    expect(hasPermission("analyst", "recovery:draft")).toBe(false);
    expect(hasPermission("analyst", "recovery:approve")).toBe(false);
  });

  it("requirePermission succeeds for valid role and throws ForbiddenError for unauthorized role", () => {
    expect(() => requirePermission(ownerUser, "recovery:approve")).not.toThrow();
    expect(() => requirePermission(managerUser, "customers:write")).not.toThrow();

    expect(() => requirePermission(managerUser, "recovery:approve")).toThrow(ForbiddenError);
    expect(() => requirePermission(analystUser, "customers:write")).toThrow(ForbiddenError);
  });

  it("requirePermission throws UnauthorizedError for missing session user", () => {
    expect(() => requirePermission(null, "analytics:read")).toThrow(UnauthorizedError);
  });

  it("requireRole checks role whitelist correctly", () => {
    expect(() => requireRole(ownerUser, ["owner"])).not.toThrow();
    expect(() => requireRole(managerUser, ["owner", "manager"])).not.toThrow();
    expect(() => requireRole(analystUser, ["owner", "manager"])).toThrow(ForbiddenError);
  });
});

describe("Phase 08 — Security Foundation: Multi-Tenant Boundary Enforcement", () => {
  const tenantA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const tenantB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

  const userTenantA: SessionUser = {
    id: "user-a-1",
    businessId: tenantA,
    email: "user@tenant-a.com",
    name: "Tenant A User",
    role: "owner",
    createdAt: new Date().toISOString(),
  };

  it("allows access when tenant matches user session", () => {
    expect(() => assertTenantAccess(userTenantA, tenantA)).not.toThrow();
  });

  it("strictly rejects cross-tenant access with ForbiddenError", () => {
    expect(() => assertTenantAccess(userTenantA, tenantB)).toThrow(ForbiddenError);
    expect(() => assertTenantAccess(userTenantA, tenantB)).toThrow(
      /Tenant boundary violation/
    );
  });

  it("throws UnauthorizedError when session user is missing", () => {
    expect(() => assertTenantAccess(null, tenantA)).toThrow(UnauthorizedError);
  });
});
