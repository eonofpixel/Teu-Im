import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError, ERRORS } from '@/lib/api-response';

describe('apiSuccess', () => {
  it('should create successful response with default status 200', () => {
    const data = { message: 'Success' };
    const response = apiSuccess(data);

    expect(response.status).toBe(200);
  });

  it('should include data in JSON response body', async () => {
    const data = { id: '123', name: 'Test Project' };
    const response = apiSuccess(data);

    const body = await response.json();
    expect(body).toEqual(data);
  });

  it('should set no-store cache control by default', () => {
    const response = apiSuccess({ test: true });
    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toBe('no-store');
  });

  it('should set public cache with TTL when cacheTtl is provided', () => {
    const response = apiSuccess({ test: true }, { cacheTtl: 60 });
    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('s-maxage=60');
    expect(cacheControl).toContain('stale-while-revalidate=30');
  });

  it('should include CORS headers for cross-origin requests', () => {
    const response = apiSuccess({ test: true });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });

  it('should accept custom status codes', () => {
    const response = apiSuccess({ created: true }, { status: 201 });

    expect(response.status).toBe(201);
  });

  it('should include rate limit headers when provided', () => {
    const response = apiSuccess(
      { test: true },
      { rateLimitHeaders: { remaining: 5, resetAt: 1234567890 } }
    );

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('5');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
  });
});

describe('apiError', () => {
  it('should create error response with default status 500', () => {
    const response = apiError('오류가 발생했습니다');

    expect(response.status).toBe(500);
  });

  it('should include error message in response body', async () => {
    const message = '인증이 필요합니다';
    const response = apiError(message, { status: 401 });

    const body = await response.json();
    expect(body.error).toBe(message);
  });

  it('should accept custom status codes', () => {
    const response = apiError('찾을 수 없습니다', { status: 404 });

    expect(response.status).toBe(404);
  });

  it('should set no-store cache control header', () => {
    const response = apiError('오류');
    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toBe('no-store');
  });

  it('should include CORS headers', () => {
    const response = apiError('오류');

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('should include rate limit headers when provided', () => {
    const response = apiError('Rate limited', {
      status: 429,
      rateLimitHeaders: { remaining: 0, resetAt: 9999999999 },
    });

    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('9999999999');
  });

  it('should exclude error details in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = apiError('오류', {
      details: { internalError: 'Database connection failed' },
    });

    const body = await response.json();
    expect(body.details).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should include error details in non-production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const details = { code: 'ERR_DB', table: 'projects' };
    const response = apiError('오류', { details });

    const body = await response.json();
    expect(body.details).toEqual(details);

    process.env.NODE_ENV = originalEnv;
  });
});

describe('ERRORS constants', () => {
  it('should provide Korean error messages', () => {
    expect(ERRORS.UNAUTHORIZED).toBe('인증이 필요합니다');
    expect(ERRORS.FORBIDDEN).toBe('권한이 없습니다');
    expect(ERRORS.NOT_FOUND).toBe('요청된 리소스를 찾을 수 없습니다');
    expect(ERRORS.VALIDATION).toBe('요청 데이터가 유효하지 않습니다');
    expect(ERRORS.RATE_LIMITED).toBe('요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요');
    expect(ERRORS.INTERNAL).toBe('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요');
    expect(ERRORS.DUPLICATE).toBe('중복된 리소스입니다');
    expect(ERRORS.CONFLICT).toBe('현재 상태와 충돌합니다');
  });

  it('should have all expected error message keys', () => {
    const expectedKeys = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'VALIDATION',
      'RATE_LIMITED',
      'INTERNAL',
      'DUPLICATE',
      'CONFLICT'
    ];

    expectedKeys.forEach(key => {
      expect(ERRORS).toHaveProperty(key);
      expect(typeof ERRORS[key as keyof typeof ERRORS]).toBe('string');
    });
  });
});
