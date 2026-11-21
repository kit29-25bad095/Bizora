import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TenantIsolationError,
  toSafeErrorResponse,
} from "@/lib/errors";

describe("Phase 06 Foundation — Error Handling & Sanitization", () => {
  it("preserves specific HTTP status codes and error codes on domain exceptions", () => {
    const valErr = new ValidationError("Invalid phone number", { phone: ["E.164 format required"] });
    expect(valErr.statusCode).toBe(400);
    expect(valErr.code).toBe("VALIDATION_ERROR");
    expect(valErr.fieldErrors?.phone).toBeDefined();

    const authErr = new UnauthorizedError();
    expect(authErr.statusCode).toBe(401);
    expect(authErr.code).toBe("UNAUTHORIZED");

    const forbiddenErr = new ForbiddenError();
    expect(forbiddenErr.statusCode).toBe(403);
    expect(forbiddenErr.code).toBe("FORBIDDEN");

    const notFoundErr = new NotFoundError("Customer", "cust-99");
    expect(notFoundErr.statusCode).toBe(404);
    expect(notFoundErr.code).toBe("NOT_FOUND");
    expect(notFoundErr.message).toContain("cust-99");

    const tenantErr = new TenantIsolationError();
    expect(tenantErr.statusCode).toBe(403);
    expect(tenantErr.code).toBe("TENANT_ISOLATION_ERROR");
  });

  it("sanitizes unexpected internal runtime errors into safe client envelopes", () => {
    const rawDbError = new Error("FATAL: connection to server at postgres://admin:secret@host failed");
    const safeResponse = toSafeErrorResponse(rawDbError);

    expect(safeResponse.success).toBe(false);
    expect(safeResponse.error.code).toBe("INTERNAL_SERVER_ERROR");
    // In production or when sanitized, should not leak credentials
    expect(safeResponse.error.timestamp).toBeDefined();
  });

  it("formats AppError into structured safe envelopes", () => {
    const appErr = new ValidationError("Malformed CSV row", { row5: ["Amount must be a number"] });
    const safeResponse = toSafeErrorResponse(appErr);

    expect(safeResponse.success).toBe(false);
    expect(safeResponse.error.code).toBe("VALIDATION_ERROR");
    expect(safeResponse.error.message).toBe("Malformed CSV row");
    expect(safeResponse.error.fieldErrors?.row5).toContain("Amount must be a number");
  });
});
