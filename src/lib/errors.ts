/**
 * CENTRALIZED ERROR HANDLING FOUNDATION
 * Standardized application error hierarchy and safe client response sanitization.
 * Prevents internal database details, stack traces, and PII from leaking to clients.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TENANT_ISOLATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_SERVER_ERROR";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    code: ErrorCode = "INTERNAL_SERVER_ERROR",
    statusCode = 500,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.fieldErrors = fieldErrors;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400, fieldErrors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied: insufficient permissions") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Resource", id?: string) {
    const msg = id ? `${entity} with ID '${id}' not found` : `${entity} not found`;
    super(msg, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource state conflict or duplicate detected") {
    super(message, "CONFLICT", 409);
  }
}

export class TenantIsolationError extends AppError {
  constructor(message = "Tenant context violation: cross-tenant access denied") {
    super(message, "TENANT_ISOLATION_ERROR", 403);
  }
}

export interface SafeErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    timestamp: string;
  };
}

/**
 * Extracts HTTP status code from any error.
 */
export function getHttpStatus(err: unknown): number {
  if (err instanceof AppError) {
    return err.statusCode;
  }
  return 500;
}

/**
 * Sanitizes any error (known AppError or unknown Error) into a safe client envelope.
 */
export function toSafeErrorResponse(err: unknown): SafeErrorEnvelope {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        fieldErrors: err.fieldErrors,
        timestamp,
      },
    };
  }

  // Unhandled / unexpected exception: sanitize database, connection strings, or internal errors
  const isDev = process.env.NODE_ENV === "development";
  const isSensitive =
    err instanceof Error &&
    /postgres|connection|relation|database|secret|password|stack|table|column/i.test(err.message);

  const errorMessage =
    isDev && !isSensitive && err instanceof Error
      ? err.message
      : "An unexpected internal error occurred.";

  return {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: errorMessage,
      timestamp,
    },
  };
}
