import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateEnum,
  validateUUID,
  validateNonNegativeInteger,
  validatePositiveInteger,
  validateDateString,
  validateLanguageCodes,
  validateCreateProject,
  validateJoinProject,
} from '../lib/validation';

describe('validateString', () => {
  it('should accept valid non-empty strings', () => {
    const result = validateString('Hello World', '테스트');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe('Hello World');
    }
  });

  it('should trim whitespace', () => {
    const result = validateString('  Hello  ', '테스트');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe('Hello');
    }
  });

  it('should reject non-string values', () => {
    const result = validateString(123, '테스트');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('문자열이어야 합니다');
    }
  });

  it('should reject strings shorter than minLength', () => {
    const result = validateString('ab', '테스트', { minLength: 3 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('최소 3자');
    }
  });

  it('should reject strings longer than maxLength', () => {
    const result = validateString('a'.repeat(101), '테스트', { maxLength: 100 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('최대 100자');
    }
  });

  it('should reject empty strings', () => {
    const result = validateString('   ', '테스트');
    expect(result.valid).toBe(false);
  });
});

describe('validateEnum', () => {
  const allowed = ['option1', 'option2', 'option3'] as const;

  it('should accept valid enum values', () => {
    const result = validateEnum('option1', '선택지', allowed);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe('option1');
    }
  });

  it('should reject invalid enum values', () => {
    const result = validateEnum('invalid', '선택지', allowed);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('다음 중 하나여야 합니다');
    }
  });
});

describe('validateUUID', () => {
  it('should accept valid UUIDs', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    const result = validateUUID(validUUID, 'ID');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe(validUUID);
    }
  });

  it('should accept UUID with different version', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const result = validateUUID(validUUID, 'ID');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const result = validateUUID('not-a-uuid', 'ID');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('유효한 UUID가 아닙니다');
    }
  });

  it('should reject non-string values', () => {
    const result = validateUUID(12345, 'ID');
    expect(result.valid).toBe(false);
  });

  it('should reject UUID with invalid characters', () => {
    const result = validateUUID('123e4567-e89b-12d3-a456-42661417400g', 'ID');
    expect(result.valid).toBe(false);
  });
});

describe('validateNonNegativeInteger', () => {
  it('should accept zero', () => {
    const result = validateNonNegativeInteger(0, '숫자');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe(0);
    }
  });

  it('should accept positive integers', () => {
    const result = validateNonNegativeInteger(42, '숫자');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe(42);
    }
  });

  it('should reject negative numbers', () => {
    const result = validateNonNegativeInteger(-1, '숫자');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('0 이상의 정수여야 합니다');
    }
  });

  it('should reject decimal numbers', () => {
    const result = validateNonNegativeInteger(3.14, '숫자');
    expect(result.valid).toBe(false);
  });

  it('should reject non-numeric strings', () => {
    const result = validateNonNegativeInteger('abc', '숫자');
    expect(result.valid).toBe(false);
  });

  it('should accept numeric strings', () => {
    const result = validateNonNegativeInteger('42', '숫자');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe(42);
    }
  });
});

describe('validatePositiveInteger', () => {
  it('should accept positive integers', () => {
    const result = validatePositiveInteger(1, '숫자');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe(1);
    }
  });

  it('should reject zero', () => {
    const result = validatePositiveInteger(0, '숫자');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('1 이상의 정수여야 합니다');
    }
  });

  it('should reject negative numbers', () => {
    const result = validatePositiveInteger(-5, '숫자');
    expect(result.valid).toBe(false);
  });
});

describe('validateDateString', () => {
  it('should accept valid date strings', () => {
    const result = validateDateString('2024-12-31', '날짜');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toBe('2024-12-31');
    }
  });

  it('should reject invalid date format', () => {
    const result = validateDateString('31-12-2024', '날짜');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('YYYY-MM-DD 형식이어야 합니다');
    }
  });

  it('should reject invalid dates', () => {
    const result = validateDateString('2024-13-01', '날짜');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('유효한 날짜가 아닙니다');
    }
  });

  it('should reject non-string values', () => {
    const result = validateDateString(20241231, '날짜');
    expect(result.valid).toBe(false);
  });
});

describe('validateLanguageCodes', () => {
  const allowedLanguages = ['ko', 'en', 'ja', 'zh'];

  it('should accept valid language codes', () => {
    const result = validateLanguageCodes(['ko', 'en'], '언어', allowedLanguages);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data).toEqual(['ko', 'en']);
    }
  });

  it('should reject empty arrays', () => {
    const result = validateLanguageCodes([], '언어', allowedLanguages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('비어있지 않아야 합니다');
    }
  });

  it('should reject non-array values', () => {
    const result = validateLanguageCodes('ko', '언어', allowedLanguages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('배열이어야 합니다');
    }
  });

  it('should reject unsupported language codes', () => {
    const result = validateLanguageCodes(['ko', 'invalid'], '언어', allowedLanguages);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('지원되지 않는 언어 코드');
    }
  });
});

describe('validateCreateProject', () => {
  it('should accept valid project creation data', () => {
    const input = {
      name: 'My Project',
      sourceLanguage: 'ko',
      targetLanguages: ['en', 'ja'],
    };
    const result = validateCreateProject(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('My Project');
      expect(result.data.sourceLanguage).toBe('ko');
      expect(result.data.targetLanguages).toEqual(['en', 'ja']);
    }
  });

  it('should reject missing name', () => {
    const input = {
      sourceLanguage: 'ko',
      targetLanguages: ['en'],
    };
    const result = validateCreateProject(input);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid source language', () => {
    const input = {
      name: 'My Project',
      sourceLanguage: 'invalid',
      targetLanguages: ['en'],
    };
    const result = validateCreateProject(input);
    expect(result.valid).toBe(false);
  });

  it('should reject empty target languages', () => {
    const input = {
      name: 'My Project',
      sourceLanguage: 'ko',
      targetLanguages: [],
    };
    const result = validateCreateProject(input);
    expect(result.valid).toBe(false);
  });

  it('should support legacy targetLanguage field', () => {
    const input = {
      name: 'My Project',
      sourceLanguage: 'ko',
      targetLanguage: 'en',
    };
    const result = validateCreateProject(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.targetLanguages).toEqual(['en']);
    }
  });
});

describe('validateJoinProject', () => {
  it('should accept valid join project data', () => {
    const input = {
      code: 'ABC123',
      password: 'mypassword',
    };
    const result = validateJoinProject(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.code).toBe('ABC123');
      expect(result.data.password).toBe('mypassword');
    }
  });

  it('should reject missing code', () => {
    const input = {
      password: 'mypassword',
    };
    const result = validateJoinProject(input);
    expect(result.valid).toBe(false);
  });

  it('should reject missing password', () => {
    const input = {
      code: 'ABC123',
    };
    const result = validateJoinProject(input);
    expect(result.valid).toBe(false);
  });

  it('should trim whitespace from inputs', () => {
    const input = {
      code: '  ABC123  ',
      password: '  mypassword  ',
    };
    const result = validateJoinProject(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.code).toBe('ABC123');
      expect(result.data.password).toBe('mypassword');
    }
  });
});
