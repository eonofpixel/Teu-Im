/**
 * Language configuration for Teu-Im
 *
 * Defines all supported languages for translation/interpretation
 * with their ISO codes, English names, and native names.
 */

/**
 * Language definition type
 */
export interface Language {
  /** ISO 639-1 language code */
  code: string;
  /** English name of the language */
  name: string;
  /** Native name of the language */
  nativeName: string;
  /** Text direction (ltr = left-to-right, rtl = right-to-left) */
  direction: 'ltr' | 'rtl';
  /** Flag emoji for visual identification */
  flag: string;
}

/**
 * All supported languages in Teu-Im
 *
 * Languages selected based on global usage and translation demand:
 * - Korean (primary target market)
 * - English (global lingua franca)
 * - Chinese (Simplified & Traditional)
 * - Japanese
 * - Spanish
 * - French
 * - German
 * - Portuguese
 * - Vietnamese
 * - Thai
 */
export const SUPPORTED_LANGUAGES = [
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    flag: '🇰🇷',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    flag: '🇺🇸',
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    flag: '🇨🇳',
  },
  {
    code: 'zh-TW',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    direction: 'ltr',
    flag: '🇹🇼',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    flag: '🇯🇵',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    flag: '🇪🇸',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    flag: '🇫🇷',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    flag: '🇩🇪',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    flag: '🇧🇷',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    direction: 'ltr',
    flag: '🇻🇳',
  },
  {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    direction: 'ltr',
    flag: '🇹🇭',
  },
] as const;

/**
 * Type for supported language codes
 */
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Map of language codes to Language objects for O(1) lookup
 */
const languageMap = new Map<string, Language>(
  SUPPORTED_LANGUAGES.map((lang) => [lang.code, lang as Language])
);

/**
 * Get a language by its code
 *
 * @param code - ISO 639-1 language code
 * @returns Language object or undefined if not found
 *
 * @example
 * ```ts
 * const korean = getLanguage('ko');
 * // { code: 'ko', name: 'Korean', nativeName: '한국어', ... }
 * ```
 */
export function getLanguage(code: string): Language | undefined {
  return languageMap.get(code);
}

/**
 * Get the English name of a language
 *
 * @param code - ISO 639-1 language code
 * @returns English name of the language or the code if not found
 *
 * @example
 * ```ts
 * getLanguageName('ko') // "Korean"
 * getLanguageName('unknown') // "unknown"
 * ```
 */
export function getLanguageName(code: string): string {
  return languageMap.get(code)?.name ?? code;
}

/**
 * Get the native name of a language
 *
 * @param code - ISO 639-1 language code
 * @returns Native name of the language or the code if not found
 *
 * @example
 * ```ts
 * getLanguageNativeName('ko') // "한국어"
 * getLanguageNativeName('ja') // "日本語"
 * ```
 */
export function getLanguageNativeName(code: string): string {
  return languageMap.get(code)?.nativeName ?? code;
}

/**
 * Get the flag emoji for a language
 *
 * @param code - ISO 639-1 language code
 * @returns Flag emoji or empty string if not found
 *
 * @example
 * ```ts
 * getLanguageFlag('ko') // "🇰🇷"
 * ```
 */
export function getLanguageFlag(code: string): string {
  return languageMap.get(code)?.flag ?? '';
}

/**
 * Get the text direction for a language
 *
 * @param code - ISO 639-1 language code
 * @returns 'ltr' or 'rtl', defaults to 'ltr' if not found
 *
 * @example
 * ```ts
 * getLanguageDirection('en') // "ltr"
 * getLanguageDirection('ar') // "rtl" (if supported)
 * ```
 */
export function getLanguageDirection(code: string): 'ltr' | 'rtl' {
  return languageMap.get(code)?.direction ?? 'ltr';
}

/**
 * Check if a language code is supported
 *
 * @param code - Language code to check
 * @returns true if the language is supported
 *
 * @example
 * ```ts
 * isLanguageSupported('ko') // true
 * isLanguageSupported('xx') // false
 * ```
 */
export function isLanguageSupported(code: string): code is LanguageCode {
  return languageMap.has(code);
}

/**
 * Get languages formatted for select/dropdown options
 *
 * @param displayType - How to display the language ('name', 'native', 'both')
 * @returns Array of { value, label } objects
 *
 * @example
 * ```ts
 * const options = getLanguageOptions('both');
 * // [{ value: 'ko', label: '한국어 (Korean)' }, ...]
 * ```
 */
export function getLanguageOptions(
  displayType: 'name' | 'native' | 'both' = 'both'
): Array<{ value: string; label: string }> {
  return SUPPORTED_LANGUAGES.map((lang) => {
    let label: string;
    switch (displayType) {
      case 'name':
        label = lang.name;
        break;
      case 'native':
        label = lang.nativeName;
        break;
      case 'both':
      default:
        label = `${lang.nativeName} (${lang.name})`;
    }

    return {
      value: lang.code,
      label: `${lang.flag} ${label}`,
    };
  });
}

/**
 * Get a language pair display string
 *
 * @param sourceCode - Source language code
 * @param targetCode - Target language code
 * @param useNative - Whether to use native names
 * @returns Formatted language pair string
 *
 * @example
 * ```ts
 * getLanguagePairDisplay('ko', 'en') // "Korean → English"
 * getLanguagePairDisplay('ko', 'en', true) // "한국어 → English"
 * ```
 */
export function getLanguagePairDisplay(
  sourceCode: string,
  targetCode: string,
  useNative = false
): string {
  const source = useNative ? getLanguageNativeName(sourceCode) : getLanguageName(sourceCode);
  const target = useNative ? getLanguageNativeName(targetCode) : getLanguageName(targetCode);
  return `${source} → ${target}`;
}

/**
 * Default language pair (Korean to English)
 */
export const DEFAULT_SOURCE_LANGUAGE: LanguageCode = 'ko';
export const DEFAULT_TARGET_LANGUAGE: LanguageCode = 'en';

/**
 * Common language pairs for quick selection
 */
export const COMMON_LANGUAGE_PAIRS: Array<{ source: LanguageCode; target: LanguageCode }> = [
  { source: 'ko', target: 'en' },
  { source: 'en', target: 'ko' },
  { source: 'ko', target: 'ja' },
  { source: 'ja', target: 'ko' },
  { source: 'ko', target: 'zh-CN' },
  { source: 'zh-CN', target: 'ko' },
  { source: 'en', target: 'es' },
  { source: 'en', target: 'zh-CN' },
];
