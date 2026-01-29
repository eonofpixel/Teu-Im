/**
 * Structured error types for Teu-Im web app.
 * Provides type-safe error handling with consistent error codes and status codes.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_REQUIRED', 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests', 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}
