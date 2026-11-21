import { UserRole, SessionUser } from "./session";
import { ForbiddenError, UnauthorizedError } from "../errors";

export type Permission =
  | "analytics:read"
  | "customers:read"
  | "customers:write"
  | "transactions:read"
  | "transactions:write"
  | "quotations:read"
  | "quotations:write"
  | "recovery:read"
  | "recovery:draft"
  | "recovery:approve"
  | "recovery:execute"
  | "business:manage"
  | "users:manage";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  owner: [
    "analytics:read",
    "customers:read",
    "customers:write",
    "transactions:read",
    "transactions:write",
    "quotations:read",
    "quotations:write",
    "recovery:read",
    "recovery:draft",
    "recovery:approve",
    "recovery:execute",
    "business:manage",
    "users:manage",
  ],
  manager: [
    "analytics:read",
    "customers:read",
    "customers:write",
    "transactions:read",
    "transactions:write",
    "quotations:read",
    "quotations:write",
    "recovery:read",
    "recovery:draft",
  ],
  analyst: [
    "analytics:read",
    "customers:read",
    "transactions:read",
    "quotations:read",
    "recovery:read",
  ],
};

/**
 * Check whether a specific role has a given permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}

/**
 * Check if a role is included in allowed roles.
 */
export function hasRole(role: UserRole, allowedRoles: readonly UserRole[]): boolean {
  return allowedRoles.includes(role);
}

/**
 * Guard that throws UnauthorizedError if user is not authenticated,
 * or ForbiddenError if user lacks the required permission.
 */
export function requirePermission(
  user: SessionUser | undefined | null,
  permission: Permission
): asserts user is SessionUser {
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(
      `Access denied: role '${user.role}' lacks permission '${permission}'`
    );
  }
}

/**
 * Guard that throws UnauthorizedError if user is not authenticated,
 * or ForbiddenError if user's role is not among allowedRoles.
 */
export function requireRole(
  user: SessionUser | undefined | null,
  allowedRoles: readonly UserRole[]
): asserts user is SessionUser {
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!hasRole(user.role, allowedRoles)) {
    throw new ForbiddenError(
      `Access denied: role '${user.role}' is not authorized for this operation`
    );
  }
}
