interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryOn = (error) => {
      // Retry on network errors and 5xx status codes
      if (!error || typeof error.message !== 'string') {
        return false;
      }
      const message = error.message.toLowerCase();
      return message.includes('network') ||
             message.includes('timeout') ||
             message.includes('503') ||
             message.includes('502') ||
             message.includes('500');
    },
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Convert error to Error object for retryOn check
      const errorObj = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries || !retryOn(errorObj)) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
