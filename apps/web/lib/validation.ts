/**
 * Input validation utilities for API route boundaries.
 *
 * All validators return { valid: true, data } on success
 * or { valid: false, error } on failure, making them
 * easy to use in route handlers without exceptions.
 */

// ─── Generic result type ─────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

// ─── Primitive validators ────────────────────────────────────────────────────

/** Non-empty string, trimmed, with optional max length. */
export function validateString(
  value: unknown,
  fieldName: string,
  { maxLength = 500, minLength = 1 }: { maxLength?: number; minLength?: number } = {}
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName}는 문자열이어야 합니다` };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName}은(는) 최대 ${maxLength}자 이하여야 합니다`,
    };
  }

  return { valid: true, data: trimmed };
}

/** Validate value is one of the allowed enum values. */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowed: readonly T[]
): ValidationResult<T> {
  if (!allowed.includes(value as T)) {
    return {
      valid: false,
      error: `${fieldName}은(는) 다음 중 하나여야 합니다: ${allowed.join(", ")}`,
    };
  }
  return { valid: true, data: value as T };
}

/** Validate a string is a valid UUID format. */
export function validateUUID(
  value: unknown,
  fieldName: string
): ValidationResult<string> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value !== "string" || !uuidRegex.test(value)) {
    return { valid: false, error: `${fieldName}은(는) 유효한 UUID가 아닙니다` };
  }
  return { valid: true, data: value };
}

/** Validate value is a non-negative integer. */
export function validateNonNegativeInteger(
  value: unknown,
  fieldName: string
): ValidationResult<number> {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    return {
      valid: false,
      error: `${fieldName}은(는) 0 이상의 정수여야 합니다`,
    };
  }
  return { valid: true, data: num };
}

/** Validate value is a positive integer. */
export function validatePositiveInteger(
  value: unknown,
  fieldName: string
): ValidationResult<number> {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    return {
      valid: false,
      error: `${fieldName}은(는) 1 이상의 정수여야 합니다`,
    };
  }
  return { valid: true, data: num };
}

/** Validate a date string matches YYYY-MM-DD and is a real date. */
export function validateDateString(
  value: unknown,
  fieldName: string
): ValidationResult<string> {
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName}는 문자열이어야 합니다` };
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(value)) {
    return {
      valid: false,
      error: `${fieldName}는 YYYY-MM-DD 형식이어야 합니다`,
    };
  }

  const date = new Date(value + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName}는 유효한 날짜가 아닙니다` };
  }

  return { valid: true, data: value };
}

/** Validate that a string array contains only allowed language codes. */
export function validateLanguageCodes(
  value: unknown,
  fieldName: string,
  allowed: readonly string[]
): ValidationResult<string[]> {
  if (!Array.isArray(value)) {
    return { valid: false, error: `${fieldName}는 배열이어야 합니다` };
  }

  if (value.length === 0) {
    return { valid: false, error: `${fieldName}은(는) 비어있지 않아야 합니다` };
  }

  for (const code of value) {
    if (typeof code !== "string" || !allowed.includes(code)) {
      return {
        valid: false,
        error: `${fieldName}에 지원되지 않는 언어 코드가 포함되어 있습니다: ${code}`,
      };
    }
  }

  return { valid: true, data: value as string[] };
}

// ─── Composite validators for specific API payloads ─────────────────────────

const SUPPORTED_LANGUAGES = [
  "ko", "en", "ja", "zh", "es", "fr", "de", "it", "pt", "ru",
  "ar", "hi", "th", "vi", "id", "ms", "ca", "da", "el", "he",
  "hu", "lt", "nl", "no", "pl", "ro", "sv", "tr", "uk",
] as const;

export interface CreateProjectInput {
  name: string;
  sourceLanguage: string;
  targetLanguages: string[];
}

export function validateCreateProject(
  body: Record<string, unknown>
): ValidationResult<CreateProjectInput> {
  const nameResult = validateString(body.name, "프로젝트 이름", { maxLength: 100 });
  if (!nameResult.valid) return nameResult;

  const sourceResult = validateEnum(
    body.sourceLanguage,
    "원본 언어",
    SUPPORTED_LANGUAGES
  );
  if (!sourceResult.valid) return sourceResult;

  // Support both targetLanguages (array) and targetLanguage (legacy single)
  const rawTargets = body.targetLanguages ?? (body.targetLanguage ? [body.targetLanguage] : []);
  const targetsResult = validateLanguageCodes(
    rawTargets,
    "번역 언어",
    SUPPORTED_LANGUAGES
  );
  if (!targetsResult.valid) return targetsResult;

  return {
    valid: true,
    data: {
      name: nameResult.data,
      sourceLanguage: sourceResult.data,
      targetLanguages: targetsResult.data,
    },
  };
}

export interface JoinProjectInput {
  code: string;
  password: string;
}

export function validateJoinProject(
  body: Record<string, unknown>
): ValidationResult<JoinProjectInput> {
  const codeResult = validateString(body.code, "참여 코드", {
    minLength: 1,
    maxLength: 20,
  });
  if (!codeResult.valid) return codeResult;

  const passwordResult = validateString(body.password, "비밀번호", {
    minLength: 1,
    maxLength: 50,
  });
  if (!passwordResult.valid) return passwordResult;

  return {
    valid: true,
    data: { code: codeResult.data, password: passwordResult.data },
  };
}
