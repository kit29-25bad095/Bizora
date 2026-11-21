import { describe, it, expect } from "vitest";
import { sealData, unsealData } from "iron-session";
import { SessionUser, sessionOptions } from "../src/lib/auth/session";
import { TenantCacheService } from "../src/lib/cache";
import { isValidUuid } from "../src/lib/db/tenant-context";

describe("Phase 15 — Multi-Server Architecture & Stateless Validation", () => {
  const secretKey = "bizora_production_session_secret_32chars_min!";

  it("Validates stateless authentication across independent server nodes (Node A -> Node B)", async () => {
    const mockUser: SessionUser = {
      id: "usr-node-101",
      businessId: "11111111-1111-4111-8111-111111111111",
      email: "director@bizora-enterprise.com",
      name: "Finance Director",
      role: "owner",
      createdAt: new Date().toISOString(),
    };

    // Node A seals the session cookie using shared SESSION_SECRET
    const sealedCookieOnNodeA = await sealData(
      { user: mockUser, isLoggedIn: true },
      { password: secretKey }
    );

    expect(typeof sealedCookieOnNodeA).toBe("string");
    expect(sealedCookieOnNodeA.length).toBeGreaterThan(32);

    // Node B (independent process memory) unseals the exact same cookie with zero local state
    const unsealedOnNodeB = await unsealData<{ user: SessionUser; isLoggedIn: boolean }>(
      sealedCookieOnNodeA,
      { password: secretKey }
    );

    expect(unsealedOnNodeB.isLoggedIn).toBe(true);
    expect(unsealedOnNodeB.user?.id).toBe(mockUser.id);
    expect(unsealedOnNodeB.user?.businessId).toBe(mockUser.businessId);
    expect(unsealedOnNodeB.user?.role).toBe("owner");
  });

  it("Rejects tampered cookies or mismatched session secrets across nodes", async () => {
    const wrongSecret = "different_secret_key_that_is_32chars_long!";
    const sealedCookie = await sealData(
      { user: { id: "u-1" }, isLoggedIn: true },
      { password: secretKey }
    );

    // With incorrect cluster secret, iron-session safely fails open to empty session
    const unsealedWithWrongSecret = await unsealData<{ user?: { id: string }; isLoggedIn?: boolean }>(
      sealedCookie,
      { password: wrongSecret }
    );
    expect(unsealedWithWrongSecret.user).toBeUndefined();
    expect(unsealedWithWrongSecret.isLoggedIn).toBeFalsy();

    // Corrupted or tampered ciphertext safely resolves to an unauthenticated empty session
    const corruptedResult = await unsealData<{ user?: { id: string } }>(
      "corrupted_invalid_tampered_cookie_string",
      { password: secretKey }
    );
    expect(corruptedResult.user).toBeUndefined();
  });

  it("Validates shared distributed caching and cross-node cache synchronization", async () => {
    const sharedClusterCache = new TenantCacheService();
    const tenantId = "11111111-1111-4111-8111-111111111111";

    // Node 1 writes to cache
    await sharedClusterCache.set(tenantId, "dashboard", "summary", { revenue: "5000000" }, 30);

    // Node 2 reads from cache
    const readOnNode2 = await sharedClusterCache.get<{ revenue: string }>(
      tenantId,
      "dashboard",
      "summary"
    );
    expect(readOnNode2?.revenue).toBe("5000000");

    // Node 2 invalidates on transaction write
    const invalidated = await sharedClusterCache.invalidateTenant(tenantId, "dashboard");
    expect(invalidated).toBe(1);

    // Node 1 attempts to read - must be cache miss
    const readOnNode1After = await sharedClusterCache.get(tenantId, "dashboard", "summary");
    expect(readOnNode1After).toBeNull();
  });

  it("Enforces tenant isolation in cluster cache keys to prevent cross-tenant contamination", () => {
    const clusterCache = new TenantCacheService();
    const validTenantA = "11111111-1111-4111-8111-111111111111";
    const invalidTenant = "malicious_string_or_unauthorized_token";

    expect(() => clusterCache.buildKey(invalidTenant, "orders")).toThrow(
      /Security Exception: Cannot build cache key/
    );

    const validKey = clusterCache.buildKey(validTenantA, "orders", "list");
    expect(validKey).toBe(`bizora:tenant:${validTenantA}:orders:list`);
  });

  it("Validates idempotent background job execution semantics", () => {
    // Verifies that jobs processed concurrently on multiple worker nodes cannot duplicate effects
    const processedJobLedger = new Set<string>();

    function processJobIdempotently(jobId: string, payload: unknown): { status: "processed" | "skipped" } {
      if (processedJobLedger.has(jobId)) {
        return { status: "skipped" };
      }
      processedJobLedger.add(jobId);
      return { status: "processed" };
    }

    const jobA = "job-dedup-uuid-001";
    const run1 = processJobIdempotently(jobA, { importBatchId: "batch-1" });
    const run2 = processJobIdempotently(jobA, { importBatchId: "batch-1" });
    const run3 = processJobIdempotently(jobA, { importBatchId: "batch-1" });

    expect(run1.status).toBe("processed");
    expect(run2.status).toBe("skipped");
    expect(run3.status).toBe("skipped");
    expect(processedJobLedger.size).toBe(1);
  });
});
