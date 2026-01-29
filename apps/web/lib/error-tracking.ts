/**
 * Error tracking infrastructure for Teu-Im web app.
 * Provides a pluggable system for tracking errors and messages.
 */

import { AppError } from './errors';

export type ErrorContext = {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
};

/**
 * Capture and track an error with optional context.
 * Logs to console in development, sends to external endpoint in production if configured.
 */
export function captureError(error: Error, context?: ErrorContext): void {
  const isAppError = error instanceof AppError;
  const errorPayload = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...(isAppError && {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }),
  };

  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error Tracked]", {
      error: errorPayload,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // In production, send to external service if endpoint is configured
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ERROR_ENDPOINT
  ) {
    fetch(process.env.NEXT_PUBLIC_ERROR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: errorPayload,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      }),
    }).catch(() => {
      // Silently ignore tracking failures - don't disrupt user experience
    });
  }
}

/**
 * Capture and track an informational message with optional context.
 * Useful for tracking non-error events that are important for debugging.
 */
export function captureMessage(message: string, context?: ErrorContext): void {
  // Always log to console in development
  if (process.env.NODE_ENV === "development") {
    console.info("[Message Tracked]", {
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  // In production, send to external service if endpoint is configured
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ERROR_ENDPOINT
  ) {
    fetch(process.env.NEXT_PUBLIC_ERROR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      }),
    }).catch(() => {
      // Silently ignore tracking failures
    });
  }
}
