import { SessionUser } from "./session";
import { ForbiddenError, UnauthorizedError } from "../errors";

/**
 * Enforces strict multi-tenant boundary.
 * Throws UnauthorizedError if no authenticated user is present.
 * Throws ForbiddenError if user's businessId does not match the target tenant.
 */
export function assertTenantAccess(
  user: SessionUser | undefined | null,
  targetBusinessId: string
): asserts user is SessionUser {
  if (!user) {
    throw new UnauthorizedError("Authentication required for tenant operation");
  }

  if (!targetBusinessId || typeof targetBusinessId !== "string") {
    throw new ForbiddenError("Invalid or missing target tenant identifier");
  }

  if (user.businessId !== targetBusinessId) {
    throw new ForbiddenError(
      `Tenant boundary violation: user tenant '${user.businessId}' cannot access resource in tenant '${targetBusinessId}'`
    );
  }
}
