import { NextResponse } from "next/server";

/**
 * Standardised API response helpers.
 *
 * Every response goes through these constructors to guarantee:
 *   1. Consistent JSON envelope (error messages in Korean)
 *   2. Proper cache-control headers
 *   3. Rate-limit headers when applicable
 *   4. CORS headers for desktop app compatibility
 */

// CORS headers for desktop app (Tauri)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-audience-token',
};

interface ApiErrorOptions {
  status?: number;
  /** Additional structured data to include (already sanitized by caller). */
  details?: Record<string, unknown>;
  /** Rate-limit headers to attach. */
  rateLimitHeaders?: RateLimitHeaders;
}

interface RateLimitHeaders {
  remaining: number;
  resetAt: number;
}

/**
 * Return a JSON error response with a Korean message.
 * Sensitive error details are never forwarded in production.
 */
export function apiError(
  message: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const { status = 500, details, rateLimitHeaders } = options;

  const body: Record<string, unknown> = { error: message };
  if (details && process.env.NODE_ENV !== "production") {
    body.details = details;
  }

  const headers = new Headers();
  headers.set("Cache-Control", "no-store");

  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (rateLimitHeaders) {
    headers.set("X-RateLimit-Remaining", String(rateLimitHeaders.remaining));
    headers.set("X-RateLimit-Reset", String(rateLimitHeaders.resetAt));
  }

  return NextResponse.json(body, { status, headers });
}

/**
 * Return a successful JSON response with optional caching.
 *
 * @param data     - Response payload
 * @param options  - Status code and cache TTL in seconds (0 = no-store)
 */
export function apiSuccess(
  data: unknown,
  {
    status = 200,
    cacheTtl = 0,
    rateLimitHeaders,
  }: {
    status?: number;
    /** Cache TTL in seconds. 0 means no caching (default). */
    cacheTtl?: number;
    rateLimitHeaders?: RateLimitHeaders;
  } = {}
): NextResponse {
  const headers = new Headers();

  if (cacheTtl > 0) {
    headers.set(
      "Cache-Control",
      `public, s-maxage=${cacheTtl}, stale-while-revalidate=${Math.floor(cacheTtl * 0.5)}`
    );
  } else {
    headers.set("Cache-Control", "no-store");
  }

  // Add CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (rateLimitHeaders) {
    headers.set("X-RateLimit-Remaining", String(rateLimitHeaders.remaining));
    headers.set("X-RateLimit-Reset", String(rateLimitHeaders.resetAt));
  }

  return NextResponse.json(data, { status, headers });
}

// ─── Standardised Korean error messages ─────────────────────────────────────

export const ERRORS = {
  UNAUTHORIZED: "인증이 필요합니다",
  FORBIDDEN: "권한이 없습니다",
  NOT_FOUND: "요청된 리소스를 찾을 수 없습니다",
  VALIDATION: "요청 데이터가 유효하지 않습니다",
  RATE_LIMITED: "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요",
  INTERNAL: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
  DUPLICATE: "중복된 리소스입니다",
  CONFLICT: "현재 상태와 충돌합니다",
} as const;
