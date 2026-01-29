import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../lib/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should allow requests within limit', () => {
    const limiter = createRateLimiter({ requests: 3, window: 60_000 });

    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check('user1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check('user1');
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should reject requests exceeding limit', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });

    limiter.check('user1');
    limiter.check('user1');

    const result3 = limiter.check('user1');
    expect(result3.allowed).toBe(false);
    expect(result3.remaining).toBe(0);
  });

  it('should track separate identifiers independently', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });

    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);

    const result2 = limiter.check('user2');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    limiter.check('user1');
    const result3 = limiter.check('user1');
    expect(result3.allowed).toBe(false);

    const result4 = limiter.check('user2');
    expect(result4.allowed).toBe(true);
    expect(result4.remaining).toBe(0);
  });

  it('should allow requests after window expires', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });

    limiter.check('user1');
    limiter.check('user1');

    // Exceed limit
    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    const result2 = limiter.check('user1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('should implement sliding window correctly', () => {
    const limiter = createRateLimiter({ requests: 3, window: 60_000 });

    // Make 3 requests at time 0
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');

    // Should be blocked
    expect(limiter.check('user1').allowed).toBe(false);

    // Advance time by 30 seconds (half window)
    vi.advanceTimersByTime(30_000);

    // Still blocked (requests still in window)
    expect(limiter.check('user1').allowed).toBe(false);

    // Advance another 31 seconds (total 61s, past window)
    vi.advanceTimersByTime(31_000);

    // Should be allowed (old requests expired)
    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
  });

  it('should reset rate limit for specific identifier', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });

    limiter.check('user1');
    limiter.check('user1');

    // Exceed limit
    expect(limiter.check('user1').allowed).toBe(false);

    // Reset the rate limit
    limiter.reset('user1');

    // Should be allowed again
    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should provide correct resetAt timestamp', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });
    const startTime = Date.now();

    const result = limiter.check('user1');

    expect(result.resetAt).toBe(startTime + 60_000);
  });

  it('should handle rapid successive requests', () => {
    const limiter = createRateLimiter({ requests: 5, window: 1000 });

    // Make 5 rapid requests
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
    }

    // 6th request should be blocked
    const result = limiter.check('user1');
    expect(result.allowed).toBe(false);
  });

  it('should correctly filter expired timestamps', () => {
    const limiter = createRateLimiter({ requests: 3, window: 10_000 });

    // Request at time 0
    limiter.check('user1');

    // Advance 5 seconds
    vi.advanceTimersByTime(5_000);
    limiter.check('user1');

    // Advance 11 more seconds (total 16s, both previous requests expired)
    vi.advanceTimersByTime(11_000);

    // Should have room for 3 requests (all previous expired)
    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check('user1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('should handle edge case of zero requests limit', () => {
    const limiter = createRateLimiter({ requests: 0, window: 60_000 });

    const result = limiter.check('user1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should not reset other identifiers when resetting one', () => {
    const limiter = createRateLimiter({ requests: 2, window: 60_000 });

    limiter.check('user1');
    limiter.check('user2');

    limiter.reset('user1');

    // user1 should be reset
    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);

    // user2 should still have its state
    const result2 = limiter.check('user2');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);
  });
});
