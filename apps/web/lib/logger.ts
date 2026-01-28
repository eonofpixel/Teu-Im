/**
 * Application-level error logging utility.
 *
 * Provides a structured interface for error capture that can be swapped
 * for a production service (Sentry, Datadog, etc.) without changing call sites.
 *
 * Current behaviour:
 *   - Development: prints full stack trace + context to console.error
 *   - Production:  sends structured payload to /api/log (server-side sink)
 *                  with a 5-second timeout so it never blocks the UI.
 *
 * Sensitive fields (passwords, API keys, tokens) are automatically redacted
 * from the serialized context before transmission.
 */

type LogContext = Record<string, unknown>;
type ErrorSeverity = "error" | "warning" | "info";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = [
  "password",
  "secret",
  "token",
  "api_key",
  "apiKey",
  "authorization",
  "cookie",
  "session",
  "soniox_api_key",
];

/**
 * Recursively strip sensitive keys from a plain object.
 */
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5) return obj; // guard against deep nesting
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
      redacted[key] = REDACTED;
    } else {
      redacted[key] = redactSensitiveData(value, depth + 1);
    }
  }
  return redacted;
}

interface LogPayload {
  level: ErrorSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: LogContext;
  timestamp: string;
  environment: string;
  url?: string;
}

/**
 * Core logging function. Dispatches based on environment.
 */
function log(
  level: ErrorSeverity,
  source: string,
  message: string,
  context?: LogContext
): void {
  const payload: LogPayload = {
    level,
    source,
    message,
    context: context
      ? (redactSensitiveData(context) as LogContext)
      : undefined,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
  };

  if (typeof window !== "undefined") {
    payload.url = window.location.href;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(`[${level.toUpperCase()}] [${source}]`, message, payload);
    return;
  }

  // Production: fire-and-forget POST to server-side log collector.
  // Uses AbortController so slow network does not block user interaction.
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);

    void fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Silently fail — logging must never crash the application.
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Log an error with optional stack trace and context.
 * Primary entry-point for error boundaries and catch blocks.
 */
export function logError(
  source: string,
  error: Error,
  context?: LogContext
): void {
  log("error", source, error.message, {
    ...context,
    stack: error.stack,
  });
}

/**
 * Log a warning message (non-fatal, worth monitoring).
 */
export function logWarning(source: string, message: string, context?: LogContext): void {
  log("warning", source, message, context);
}

/**
 * Log an informational event (feature usage, lifecycle milestones).
 */
export function logInfo(source: string, message: string, context?: LogContext): void {
  log("info", source, message, context);
}
