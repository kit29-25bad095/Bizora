import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, ARGON2_CONFIG } from "../src/lib/auth/password";
import { requirePermission, hasPermission, requireRole } from "../src/lib/auth/rbac";
import { assertTenantAccess } from "../src/lib/auth/tenant-guard";
import { SessionUser } from "../src/lib/auth/session";
import { toSafeErrorResponse, AppError, ForbiddenError, UnauthorizedError } from "../src/lib/errors";
import { sanitizeForLogging } from "../src/lib/logger";
import { isValidUuid, buildTenantContextSql } from "../src/lib/db/tenant-context";

describe("Phase 13 — QA Security Audit: Authentication & Cryptography", () => {
  it("enforces minimum password length and rejects weak passwords", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/at least 8 characters/);
    await expect(hashPassword("")).rejects.toThrow(/at least 8 characters/);
  });

  it("produces compliant Argon2id hashes with non-deterministic salting", async () => {
    const password = "EnterpriseSecureP@ss2026!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Each hash must contain unique random salt
    expect(hash1).not.toBe(hash2);
    expect(hash1.startsWith("$argon2id$")).toBe(true);
    expect(hash2.startsWith("$argon2id$")).toBe(true);

    // Both must verify correctly against original password
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });

  it("constant-time verification returns false safely on invalid hashes or tampering", async () => {
    const validHash = await hashPassword("ValidPassword123!");
    expect(await verifyPassword("ValidPassword123!", "corrupted_hash")).toBe(false);
    expect(await verifyPassword("ValidPassword123!", "")).toBe(false);
    expect(await verifyPassword("", validHash)).toBe(false);
    expect(await verifyPassword("WrongPassword123!", validHash)).toBe(false);
  });
});

describe("Phase 13 — QA Security Audit: Access Control & IDOR Prevention", () => {
  const tenantA = "11111111-1111-4111-8111-111111111111";
  const tenantB = "22222222-2222-4222-8222-222222222222";

  const ownerA: SessionUser = {
    id: "user-owner-a",
    businessId: tenantA,
    email: "owner@tenanta.com",
    name: "Owner A",
    role: "owner",
    createdAt: new Date().toISOString(),
  };

  const managerA: SessionUser = {
    id: "user-manager-a",
    businessId: tenantA,
    email: "manager@tenanta.com",
    name: "Manager A",
    role: "manager",
    createdAt: new Date().toISOString(),
  };

  const analystA: SessionUser = {
    id: "user-analyst-a",
    businessId: tenantA,
    email: "analyst@tenanta.com",
    name: "Analyst A",
    role: "analyst",
    createdAt: new Date().toISOString(),
  };

  it("strictly prevents privilege escalation: Manager cannot approve or dispatch", () => {
    expect(() => requirePermission(managerA, "recovery:approve")).toThrow(ForbiddenError);
    expect(() => requirePermission(managerA, "recovery:execute")).toThrow(ForbiddenError);
    expect(() => requirePermission(managerA, "business:manage")).toThrow(ForbiddenError);
    expect(() => requirePermission(managerA, "users:manage")).toThrow(ForbiddenError);
  });

  it("strictly prevents privilege escalation: Analyst cannot modify any data", () => {
    expect(() => requirePermission(analystA, "customers:write")).toThrow(ForbiddenError);
    expect(() => requirePermission(analystA, "transactions:write")).toThrow(ForbiddenError);
    expect(() => requirePermission(analystA, "quotations:write")).toThrow(ForbiddenError);
    expect(() => requirePermission(analystA, "recovery:draft")).toThrow(ForbiddenError);
    expect(() => requirePermission(analystA, "recovery:approve")).toThrow(ForbiddenError);
  });

  it("strictly blocks cross-tenant access attempts (IDOR defense)", () => {
    expect(() => assertTenantAccess(ownerA, tenantB)).toThrow(ForbiddenError);
    expect(() => assertTenantAccess(ownerA, tenantB)).toThrow(/Tenant boundary violation/);
    expect(() => assertTenantAccess(managerA, tenantB)).toThrow(ForbiddenError);
    expect(() => assertTenantAccess(analystA, tenantB)).toThrow(ForbiddenError);
  });
});

describe("Phase 13 — QA Security Audit: Injection Protection & Parameter Validation", () => {
  it("rejects SQL injection payloads in tenant ID validation", () => {
    const maliciousPayloads = [
      "'; DROP TABLE businesses; --",
      "11111111-1111-4111-8111-111111111111' OR '1'='1",
      "<script>alert(1)</script>",
      "../../etc/passwd",
      "00000000-0000-0000-0000-000000000000; SELECT * FROM users",
    ];

    for (const payload of maliciousPayloads) {
      expect(isValidUuid(payload)).toBe(false);
      expect(() => buildTenantContextSql(payload)).toThrow(ForbiddenError);
    }
  });

  it("validates legitimate UUID v4 successfully", () => {
    expect(isValidUuid("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(true);
    expect(isValidUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
  });
});

describe("Phase 13 — QA Security Audit: Information Leakage & Error Sanitization", () => {
  it("toSafeErrorResponse strips database error codes and internal stack traces", () => {
    const internalDbError = new Error(
      "error: relation 'businesses' does not exist at postgres.internal.connection:5432"
    );

    const safeEnvelope = toSafeErrorResponse(internalDbError);
    expect(safeEnvelope.success).toBe(false);
    expect(safeEnvelope.error.code).toBe("INTERNAL_SERVER_ERROR");
    // In production or test, it must not expose raw connection string
    expect(safeEnvelope.error.message).not.toContain("postgres.internal.connection:5432");
  });

  it("logger recursively redacts sensitive credentials and tokens", () => {
    const sensitiveLog = {
      user: "alice",
      password: "SuperSecretPassword123!",
      token: "bearer_secret_token_abc123",
      authorization: "Bearer eyJhbGciOi...",
      session: {
        cookie: "bizora_session=encrypted_secret",
        apiKey: "live_key_xyz987",
      },
    };

    const sanitized = sanitizeForLogging(sensitiveLog) as typeof sensitiveLog;
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.authorization).toBe("[REDACTED]");
    expect(sanitized.session.cookie).toBe("[REDACTED]");
    expect(sanitized.session.apiKey).toBe("[REDACTED]");
    expect(sanitized.user).toBe("alice");
  });
});
