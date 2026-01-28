/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter per identifier (IP or user ID).
 * Designed for single-instance Next.js deployments. For multi-instance
 * production, swap the store with Redis or Upstash Rate Limit.
 *
 * Usage:
 *   const limiter = createRateLimiter({ requests: 30, window: 60_000 });
 *   const result = await limiter.check(identifier);
 *   if (!result.allowed) { return 429 response }
 */

interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window. */
  requests: number;
  /** Sliding window duration in milliseconds. */
  window: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface WindowEntry {
  timestamps: number[];
  resetAt: number;
}

/**
 * Create a rate limiter instance with the given configuration.
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const store = new Map<string, WindowEntry>();
  const { requests, window: windowMs } = config;

  // Periodic cleanup of expired entries (every 5 minutes)
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) {
          store.delete(key);
        }
      }
    }, 300_000).unref?.();
  }

  return {
    /**
     * Check whether the given identifier is allowed to make a request.
     * Mutates internal state (increments counter if allowed).
     */
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - windowMs;

      let entry = store.get(identifier);
      if (!entry || entry.resetAt < now) {
        entry = { timestamps: [], resetAt: now + windowMs };
        store.set(identifier, entry);
      }

      // Remove timestamps outside the current window
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

      if (entry.timestamps.length >= requests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.resetAt,
        };
      }

      entry.timestamps.push(now);

      return {
        allowed: true,
        remaining: requests - entry.timestamps.length,
        resetAt: entry.resetAt,
      };
    },

    /**
     * Reset the rate limit for a specific identifier (e.g., after successful auth).
     */
    reset(identifier: string): void {
      store.delete(identifier);
    },
  };
}

// ─── Pre-configured limiters for common API categories ──────────────────────

/** General API routes: 60 requests per minute */
export const generalLimiter = createRateLimiter({
  requests: 60,
  window: 60_000,
});

/** Authentication routes (login/signup): 10 attempts per minute */
export const authLimiter = createRateLimiter({
  requests: 10,
  window: 60_000,
});

/** Soniox temp-key endpoint: 20 requests per minute (one per recording session) */
export const tempKeyLimiter = createRateLimiter({
  requests: 20,
  window: 60_000,
});
