import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withRetry } from '../lib/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful first attempt', () => {
    it('should return result without retry on success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle synchronous functions that return promises', async () => {
      const fn = vi.fn(async () => ({ data: 'test' }));

      const result = await withRetry(fn);

      expect(result).toEqual({ data: 'test' });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry on transient error', () => {
    it('should retry on network error', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout error', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should retry on 5xx status codes', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 503 Service Unavailable'))
        .mockRejectedValueOnce(new Error('HTTP 502 Bad Gateway'))
        .mockRejectedValueOnce(new Error('HTTP 500 Internal Server Error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should be case insensitive when matching error messages', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('NETWORK ERROR'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('max retries exceeded', () => {
    it('should throw error after max retries', async () => {
      const error = new Error('Network error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 3, baseDelayMs: 10 }))
        .rejects.toThrow('Network error');

      expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('should respect custom maxRetries', async () => {
      const error = new Error('Timeout');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 }))
        .rejects.toThrow('Timeout');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry if maxRetries is 0', async () => {
      const error = new Error('Network error');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 0, baseDelayMs: 10 }))
        .rejects.toThrow('Network error');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff timing', () => {
    it('should apply exponential backoff delays', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await withRetry(fn, { baseDelayMs: 100, maxDelayMs: 10000 });
      const duration = Date.now() - start;

      // baseDelayMs * 2^0 + baseDelayMs * 2^1 + baseDelayMs * 2^2
      // = 100 + 200 + 400 = 700ms
      expect(duration).toBeGreaterThanOrEqual(700);
      expect(duration).toBeLessThan(900); // Allow some timing variance
    });

    it('should respect maxDelayMs cap', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await withRetry(fn, { baseDelayMs: 1000, maxDelayMs: 500 });
      const duration = Date.now() - start;

      // First delay: min(1000 * 2^0, 500) = 500
      // Second delay: min(1000 * 2^1, 500) = 500
      // Total: ~1000ms
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThan(1200);
    });

    it('should use default timing values', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await withRetry(fn); // Uses default baseDelayMs=1000
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThan(1200);
    });
  });

  describe('custom retryOn function', () => {
    it('should use custom retryOn predicate', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('CUSTOM_RETRYABLE_ERROR'))
        .mockResolvedValueOnce('success');

      const customRetryOn = (error: Error) => {
        return error.message.includes('CUSTOM_RETRYABLE');
      };

      const result = await withRetry(fn, { retryOn: customRetryOn, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry when custom retryOn returns false', async () => {
      const error = new Error('SHOULD_NOT_RETRY');
      const fn = vi.fn().mockRejectedValue(error);

      const customRetryOn = (error: Error) => {
        return error.message.includes('RETRYABLE');
      };

      await expect(withRetry(fn, { retryOn: customRetryOn, baseDelayMs: 10 }))
        .rejects.toThrow('SHOULD_NOT_RETRY');

      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should allow retrying on specific HTTP status codes', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429 Too Many Requests'))
        .mockResolvedValueOnce('success');

      const customRetryOn = (error: Error) => {
        return error.message.includes('429') || error.message.includes('503');
      };

      const result = await withRetry(fn, { retryOn: customRetryOn, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx client errors by default', async () => {
      const error = new Error('HTTP 404 Not Found');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { baseDelayMs: 10 }))
        .rejects.toThrow('HTTP 404 Not Found');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle functions that throw non-Error objects', async () => {
      const fn = vi.fn().mockRejectedValue('string error');

      await expect(withRetry(fn, { baseDelayMs: 10 }))
        .rejects.toBe('string error');

      expect(fn).toHaveBeenCalledTimes(1); // No retry since retryOn expects Error
    });

    it('should preserve error stack traces', async () => {
      const originalError = new Error('Original error');
      const fn = vi.fn().mockRejectedValue(originalError);

      try {
        await withRetry(fn, { baseDelayMs: 10 });
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as Error).stack).toBe(originalError.stack);
      }
    });

    it('should handle async errors in retryOn function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));

      // retryOn that throws should propagate the error
      const faultyRetryOn = () => {
        throw new Error('RetryOn error');
      };

      await expect(withRetry(fn, { retryOn: faultyRetryOn, baseDelayMs: 10 }))
        .rejects.toThrow('RetryOn error');
    });
  });
});
