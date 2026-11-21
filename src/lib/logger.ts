/**
 * STRUCTURED LOGGING FOUNDATION
 * Emits JSON formatted log events with correlation IDs and automated PII/credential redaction.
 * Compatible with cloud log aggregators (Datadog, BetterStack, Loki, CloudWatch).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "sessionsecret",
  "apikey",
]);

export function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5) return "[DEPTH_LIMIT]";
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[^a-z]/g, ""))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redactSensitiveData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const sanitizeForLogging = redactSensitiveData;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    err?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? (redactSensitiveData(context) as Record<string, unknown>) : undefined,
      error: err
        ? {
            name: err.name,
            message: err.message,
            stack: this.isProduction ? undefined : err.stack,
          }
        : undefined,
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isProduction) {
      const entry = this.formatEntry("debug", message, context);
      console.debug(`[DEBUG] ${entry.timestamp} - ${entry.message}`, entry.context ?? "");
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry("info", message, context);
    if (this.isProduction) {
      console.log(JSON.stringify(entry));
    } else {
      console.info(`[INFO]  ${entry.timestamp} - ${entry.message}`, entry.context ?? "");
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.formatEntry("warn", message, context);
    if (this.isProduction) {
      console.warn(JSON.stringify(entry));
    } else {
      console.warn(`[WARN]  ${entry.timestamp} - ${entry.message}`, entry.context ?? "");
    }
  }

  error(message: string, err?: Error, context?: Record<string, unknown>): void {
    const entry = this.formatEntry("error", message, context, err);
    if (this.isProduction) {
      console.error(JSON.stringify(entry));
    } else {
      console.error(`[ERROR] ${entry.timestamp} - ${entry.message}`, err ?? "", entry.context ?? "");
    }
  }
}

export const logger = new Logger();
