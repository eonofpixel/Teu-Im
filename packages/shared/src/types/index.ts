// 언어 코드 타입
export type LanguageCode = "ko" | "en" | "ja" | "zh" | "es" | "fr" | "de" | "pt" | "ru" | "ar";

// 프로젝트 상태 타입
export type ProjectStatus = "idle" | "active" | "ended";

// 세션 상태 타입
export type SessionStatus = "active" | "paused" | "completed" | "ended";

// Supported language type
export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

// User 타입
export interface User {
  id: string;
  email: string;
  name?: string;
  sonioxApiKey?: string;
  createdAt: string;
}

// Project 타입
export interface Project {
  id: string;
  userId: string;
  name: string;
  code: string; // 6자리 참여 코드
  password: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode; // primary target language (kept for backward compatibility)
  targetLangs: string[]; // Array of target language codes (multi-language support)
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
}

// Session 타입
export interface Session {
  id: string;
  projectId: string;
  name?: string;
  status: SessionStatus;
  audioFilePath?: string;
  audioDurationMs?: number;
  startedAt: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Interpretation 타입
export interface Interpretation {
  id: string;
  sessionId: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string; // which target language this translation is for
  isFinal: boolean;
  sequence: number;
  startTimeMs?: number;
  endTimeMs?: number;
  createdAt: string;
}

// InterpretationResult for real-time streaming (used in desktop app)
export interface InterpretationResult {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  sequence: number;
  startTimeMs?: number;
  endTimeMs?: number;
}
