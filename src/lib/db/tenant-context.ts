import { ForbiddenError } from "../errors";

export interface TenantContext {
  businessId: string;
}

/**
 * Validates a UUID v4 string to ensure SQL safety before setting local session variables.
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Generates the fail-closed SQL statement to set the local tenant context.
 * In PostgreSQL with RLS enabled, this binds RLS policies to the tenant.
 */
export function buildTenantContextSql(businessId: string): string {
  if (!isValidUuid(businessId)) {
    throw new ForbiddenError(`Invalid business_id UUID format: '${businessId}'`);
  }
  return `SET LOCAL app.current_tenant_id = '${businessId}';`;
}

/**
 * Wraps database operations within a tenant-scoped execution boundary.
 * Enforces that a valid businessId is provided and passes a verified context.
 */
export async function withTenantContext<T>(
  businessId: string,
  operation: (ctx: TenantContext) => Promise<T>
): Promise<T> {
  if (!businessId || !isValidUuid(businessId)) {
    throw new ForbiddenError(
      `Tenant boundary enforcement: invalid or missing business_id '${businessId}'`
    );
  }

  // The tenant context is validated and passed to the caller
  return await operation({ businessId });
}
