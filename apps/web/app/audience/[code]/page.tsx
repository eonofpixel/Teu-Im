"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudienceRealtime } from "@/hooks/useAudienceRealtime";
import { useAudiencePresence } from "@/hooks/useAudiencePresence";
import type { Interpretation } from "@teu-im/shared";
import { FullscreenButton } from "./FullscreenButton";

// ─── Client-side token expiry check ──────────────────────────────────────────
// Decodes the payload portion of an audience token (base64url JSON) and checks
// whether it has expired. Does NOT verify the HMAC signature — that happens
// server-side when the token is exchanged via POST /api/audience/token.
// This exists solely so we can skip the network round-trip for obviously
// expired tokens and fall back to the password gate immediately.

function clientVerifyTokenExpiry(
  token: string
): { projectId: string; sessionId: string | null } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const padded = parts[0] + "=".repeat((4 - (parts[0].length % 4)) % 4);
    const raw = atob(padded);
    const payload = JSON.parse(raw) as {
      projectId: string;
      sessionId: string | null;
      expiresAt: string;
    };

    if (!payload.projectId || !payload.expiresAt) return null;
    if (new Date(payload.expiresAt) <= new Date()) return null;

    return { projectId: payload.projectId, sessionId: payload.sessionId };
  } catch {
    return null;
  }
}

const LANG_STORAGE_KEY = "teu-im-audience-lang";
const FONT_SIZE_STORAGE_KEY = "teu-im-audience-font-size";
const SHOW_ORIGINAL_STORAGE_KEY = "teu-im-audience-show-original";

type FontSize = 'small' | 'medium' | 'large';

// ─── Language label map ──────────────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  ar: "العربية",
};

function getLangLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code.toUpperCase();
}

// ─── Connection state type ───────────────────────────────────────────────────

type ConnectionState = "connected" | "reconnecting" | "disconnected" | "waiting";

// ─── Join API response shape ─────────────────────────────────────────────────

interface JoinResponse {
  projectId: string;
  projectName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  sessionId: string | null;
}

// ─── Password Gate ───────────────────────────────────────────────────────────

function PasswordGate({ code, onValidated, initialError }: { code: string; onValidated: (data: JoinResponse) => void; initialError?: string | null }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password: password.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        setError("코드 또는 비밀번호가 올바르지 않습니다");
        setIsSubmitting(false);
        return;
      }

      const json = await res.json() as JoinResponse;
      onValidated(json);
    } catch (err) {
      clearTimeout(timeoutId);

      if ((err as Error).name === 'AbortError') {
        setError("연결 시간이 초과되었습니다");
      } else {
        setError("연결에 문제가 있습니다");
      }
      setIsSubmitting(false);
    }
  }, [code, password, onValidated]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-8 safe-area-inset"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Project code - large and prominent with neo-brutal box */}
        <div className="text-center mb-12 sm:mb-16">
          <div
            className="text-sm font-bold uppercase tracking-widest mb-4"
            style={{ color: '#6b7280' }}
          >
            행사 코드
          </div>
          <div
            className="inline-block px-8 py-6 rounded-3xl mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%)',
              border: '3px solid rgba(0, 212, 255, 0.3)',
              boxShadow: '0 12px 48px rgba(0, 212, 255, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              className="text-6xl sm:text-5xl font-black tracking-tight"
              style={{
                color: '#ffffff',
                textShadow: '0 2px 24px rgba(0, 212, 255, 0.4)',
                letterSpacing: '0.05em',
              }}
            >
              {code.toUpperCase()}
            </div>
          </div>
          <div className="text-sm" style={{ color: '#6b7280' }}>
            비밀번호를 입력하여 참여하세요
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder="비밀번호"
            className="w-full px-6 py-5 sm:py-4 rounded-2xl text-white text-xl sm:text-lg placeholder-gray-600 focus:outline-none transition-all touch-manipulation font-medium"
            autoComplete="off"
            disabled={isSubmitting}
            style={{
              minHeight: '56px',
              background: 'rgba(30, 30, 40, 0.6)',
              border: '2px solid rgba(107, 114, 128, 0.2)',
            }}
          />

          {error && (
            <div
              className="px-5 py-4 rounded-2xl"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <p className="text-base sm:text-sm leading-relaxed font-medium" style={{ color: '#f87171' }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            aria-label="입장하기"
            className="w-full py-5 rounded-2xl font-bold text-lg sm:text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] touch-manipulation focus:outline-none uppercase tracking-wider"
            style={{
              background: isSubmitting || !password.trim()
                ? 'rgba(107, 114, 128, 0.3)'
                : 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)',
              color: isSubmitting || !password.trim() ? '#6b7280' : '#000',
              minHeight: '56px',
              border: '2px solid rgba(0, 212, 255, 0.5)',
              boxShadow: isSubmitting || !password.trim()
                ? 'none'
                : '0 8px 24px rgba(0, 212, 255, 0.3)',
            }}
          >
            {isSubmitting ? "확인 중..." : "입장하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Connection Status Indicator (Neo-Brutal Style) ──────────────────────────

function ConnectionStatusIndicator({ status, sessionStatus }: { status: ConnectionState; sessionStatus: string }) {
  // Session ended takes priority
  if (sessionStatus === "ended") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider"
        style={{
          background: 'rgba(30, 30, 40, 0.8)',
          border: '2px solid rgba(107, 114, 128, 0.3)',
        }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: '#6b7280' }} />
        <span style={{ color: '#9ca3af' }}>종료</span>
      </div>
    );
  }

  // Session paused - show paused indicator
  if (sessionStatus === "paused") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider"
        style={{
          background: 'rgba(251, 191, 36, 0.15)',
          border: '2px solid rgba(251, 191, 36, 0.4)',
        }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
        <span style={{ color: '#fbbf24' }}>일시정지</span>
      </div>
    );
  }

  const configs = {
    connected: {
      color: '#00d4ff',
      bg: 'rgba(0, 212, 255, 0.15)',
      border: 'rgba(0, 212, 255, 0.4)',
      pulse: true,
      label: "연결됨"
    },
    reconnecting: {
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.15)',
      border: 'rgba(251, 191, 36, 0.4)',
      pulse: true,
      label: "재연결"
    },
    disconnected: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.4)',
      pulse: false,
      label: "끊김"
    },
    waiting: {
      color: '#6b7280',
      bg: 'rgba(107, 114, 128, 0.15)',
      border: 'rgba(107, 114, 128, 0.3)',
      pulse: false,
      label: "대기"
    },
  } as const;

  const cfg = configs[status];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider"
      style={{
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
      }}
    >
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        {cfg.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60"
            style={{ background: cfg.color }}
          />
        )}
        <span
          className="relative z-10 w-2 h-2 rounded-full"
          style={{
            background: cfg.color,
            boxShadow: `0 0 8px ${cfg.color}`,
          }}
        />
      </div>
      <span className="hidden sm:inline" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

// ─── Neo-Brutal Language Selector (Touch-Friendly) ───────────────────────────
// Memo: Prevents re-render when new interpretations arrive

const LanguageSelector = memo(function LanguageSelector({
  languages,
  selected,
  onSelect,
}: {
  languages: string[];
  selected: string | null;
  onSelect: (lang: string | null) => void;
}) {
  const handleSelectAll = useCallback(() => onSelect(null), [onSelect]);

  if (languages.length <= 1) return null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
      <button
        onClick={handleSelectAll}
        aria-label="전체 언어 선택"
        aria-pressed={selected === null}
        className="px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl text-base sm:text-sm font-bold whitespace-nowrap transition-all active:scale-95 touch-manipulation focus:outline-none uppercase tracking-wider"
        style={{
          background: selected === null
            ? 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)'
            : 'rgba(30, 30, 40, 0.6)',
          color: selected === null ? '#000' : '#6b7280',
          border: selected === null
            ? '2px solid rgba(0, 212, 255, 0.5)'
            : '2px solid rgba(107, 114, 128, 0.2)',
          minHeight: '44px',
          boxShadow: selected === null ? '0 4px 12px rgba(0, 212, 255, 0.3)' : 'none',
        }}
      >
        전체
      </button>

      {languages.map((lang) => (
        <LanguageButton
          key={lang}
          lang={lang}
          selected={selected === lang}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

// Memo: Individual language buttons to prevent re-render of unselected buttons
const LanguageButton = memo(function LanguageButton({
  lang,
  selected,
  onSelect,
}: {
  lang: string;
  selected: boolean;
  onSelect: (lang: string | null) => void;
}) {
  const handleClick = useCallback(() => onSelect(lang), [lang, onSelect]);

  return (
    <button
      onClick={handleClick}
      aria-label={`${getLangLabel(lang)} 선택`}
      aria-pressed={selected}
      className="px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl text-base sm:text-sm font-bold whitespace-nowrap transition-all active:scale-95 touch-manipulation focus:outline-none uppercase tracking-wider"
      style={{
        background: selected
          ? 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)'
          : 'rgba(30, 30, 40, 0.6)',
        color: selected ? '#000' : '#6b7280',
        border: selected
          ? '2px solid rgba(0, 212, 255, 0.5)'
          : '2px solid rgba(107, 114, 128, 0.2)',
        minHeight: '44px',
        boxShadow: selected ? '0 4px 12px rgba(0, 212, 255, 0.3)' : 'none',
      }}
    >
      {getLangLabel(lang)}
    </button>
  );
});

// ─── Font Size Control (Neo-Brutal Style) ────────────────────────────────────
// Memo: Prevents re-render when new interpretations arrive

const FontSizeControl = memo(function FontSizeControl({
  fontSize,
  onSizeChange,
}: {
  fontSize: FontSize;
  onSizeChange: (size: FontSize) => void;
}) {
  const handleCycle = useCallback(() => {
    const sizes: FontSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onSizeChange(sizes[nextIndex]);
  }, [fontSize, onSizeChange]);

  const sizeLabels = {
    small: 'A',
    medium: 'A+',
    large: 'A++',
  };

  return (
    <button
      onClick={handleCycle}
      aria-label={`글자 크기 변경 (현재: ${sizeLabels[fontSize]})`}
      className="flex items-center justify-center px-4 py-2.5 rounded-xl text-base sm:text-sm font-bold transition-all active:scale-95 touch-manipulation focus:outline-none"
      style={{
        background: 'rgba(30, 30, 40, 0.6)',
        color: '#00d4ff',
        border: '2px solid rgba(107, 114, 128, 0.2)',
        minHeight: '44px',
        minWidth: '60px',
      }}
    >
      {sizeLabels[fontSize]}
    </button>
  );
});

// ─── Show Original Toggle Button ─────────────────────────────────────────────

const ShowOriginalToggle = memo(function ShowOriginalToggle({
  showOriginal,
  onToggle,
}: {
  showOriginal: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={showOriginal ? "원문 숨기기" : "원문 보기"}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 touch-manipulation focus:outline-none"
      style={{
        background: showOriginal ? 'rgba(0, 212, 255, 0.15)' : 'rgba(30, 30, 40, 0.6)',
        color: showOriginal ? '#00d4ff' : '#6b7280',
        border: showOriginal ? '2px solid rgba(0, 212, 255, 0.3)' : '2px solid rgba(107, 114, 128, 0.2)',
        minHeight: '44px',
      }}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {showOriginal ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        )}
      </svg>
      <span className="hidden sm:inline">{showOriginal ? '원문' : '원문'}</span>
    </button>
  );
});

// ─── Interpretation Card (Chat-Style Message Bubble) ─────────────────────────
// Memo: Critical for performance - prevents re-render of existing items when new ones arrive

const InterpretationCard = memo(function InterpretationCard({
  item,
  isLatest,
  fontSize = 'small',
  showOriginal = true,
}: {
  item: Interpretation;
  isLatest: boolean;
  fontSize?: FontSize;
  showOriginal?: boolean;
}) {
  const timeDisplay = useCallback(() => {
    try {
      const d = new Date(item.createdAt);
      const h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    } catch { return ""; }
  }, [item.createdAt]);

  // Font size mappings
  const fontSizes = {
    small: {
      original: 'text-base',
      translated: 'text-2xl sm:text-3xl',
    },
    medium: {
      original: 'text-lg',
      translated: 'text-3xl sm:text-4xl',
    },
    large: {
      original: 'text-xl',
      translated: 'text-4xl sm:text-5xl',
    },
  };

  const currentSize = fontSizes[fontSize];

  return (
    <article
      className="mb-3 animate-slide-up select-none"
      style={{ animationDelay: isLatest ? '0ms' : '0ms' }}
    >
      {/* Compact card */}
      <div
        className="relative rounded-2xl overflow-hidden px-4 py-3"
        style={{
          background: 'rgba(20, 20, 28, 0.7)',
          borderLeft: item.isFinal
            ? '3px solid #00d4ff'
            : '3px solid #fbbf24',
        }}
      >
        {/* Translation (large, primary) */}
        <p
          className={`${currentSize.translated} leading-snug font-semibold`}
          style={{
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {item.translatedText}
        </p>

        {/* Original text (smaller, secondary) - only show if enabled */}
        {showOriginal && item.originalText && (
          <p
            className={`${currentSize.original} leading-relaxed mt-1.5`}
            style={{
              color: '#6b7280',
              fontWeight: 400,
            }}
          >
            {item.originalText}
          </p>
        )}

        {/* Real-time indicator for non-final */}
        {!item.isFinal && (
          <div className="flex items-center gap-1 mt-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#fbbf24' }}
            />
            <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
              입력 중...
            </span>
          </div>
        )}
      </div>
    </article>
  );
});

// ─── New Message Notification (Neo-Brutal Style) ─────────────────────────────

function NewMessageNotification({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-bounce-in"
      role="button"
      aria-live="polite"
      aria-label={`새 통역 ${count}개 도착`}
      onClick={onClick}
      style={{
        cursor: 'pointer',
      }}
    >
      <button
        className="px-6 py-3 rounded-full font-bold text-base active:scale-95 transition-transform touch-manipulation shadow-glow"
        style={{
          background: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)',
          color: '#000',
          minHeight: '44px',
          boxShadow: '0 8px 24px rgba(0, 212, 255, 0.3)',
          border: '2px solid rgba(0, 212, 255, 0.5)',
        }}
      >
        새 통역 {count > 1 ? `${count}개 ` : ''}도착
      </button>
    </div>
  );
}

// ─── Scroll to Latest Button ─────────────────────────────────────────────────

function ScrollToLatestButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="최신 통역으로 이동"
      className={`fixed z-40 rounded-full transition-all duration-300 touch-manipulation focus:outline-none ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      style={{
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        right: '24px',
        width: '56px',
        height: '56px',
        background: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)',
        color: '#000',
        boxShadow: '0 8px 24px rgba(0, 212, 255, 0.3)',
        border: '2px solid rgba(0, 212, 255, 0.5)',
      }}
    >
      <svg
        className="w-6 h-6 mx-auto"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  );
}

// ─── Session Ended Overlay (Mobile-Optimized) ────────────────────────────────

function SessionEndedOverlay() {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 safe-area-inset"
      style={{
        background: 'rgba(5, 5, 8, 0.97)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Icon with neo-brutal style */}
        <div
          className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-8 sm:mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%)',
            border: '3px solid rgba(107, 114, 128, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <svg
            className="w-12 h-12 sm:w-9 sm:h-9"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: '#6b7280' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Message */}
        <h2
          className="text-2xl sm:text-xl font-bold mb-3 sm:mb-2"
          style={{ color: '#ffffff' }}
        >
          세션이 종료되었습니다
        </h2>
        <p
          className="text-base sm:text-sm leading-relaxed mb-10 sm:mb-8 px-4"
          style={{ color: '#6b7280' }}
        >
          이 행사의 실시간 통역 세션은 종료되었습니다.<br />
          행사 주최자가 새로운 세션을 시작할 수 있습니다.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => router.back()}
            aria-label="뒤로 가기"
            className="w-full py-4 rounded-2xl font-bold text-base sm:text-sm transition-all duration-200 active:scale-[0.97] touch-manipulation focus:outline-none uppercase tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)',
              color: '#000',
              boxShadow: '0 8px 24px rgba(0, 212, 255, 0.3)',
              border: '2px solid rgba(0, 212, 255, 0.5)',
              minHeight: '52px',
            }}
          >
            뒤로 가기
          </button>
          <button
            onClick={() => window.location.reload()}
            aria-label="페이지 새로고침"
            className="w-full py-4 rounded-2xl font-bold text-base sm:text-sm transition-all duration-200 active:scale-[0.97] touch-manipulation focus:outline-none uppercase tracking-wider"
            style={{
              background: 'rgba(30, 30, 40, 0.6)',
              color: '#6b7280',
              border: '2px solid rgba(107, 114, 128, 0.2)',
              minHeight: '52px',
            }}
          >
            새로고침
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Live Interpretation View ────────────────────────────────────────────────

function LiveView({ projectData }: { projectData: JoinResponse }) {
  const [historicalInterpretations, setHistoricalInterpretations] = useState<Interpretation[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LANG_STORAGE_KEY) ?? null;
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window === "undefined") return 'small';
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    return (stored === 'small' || stored === 'medium' || stored === 'large') ? stored : 'small';
  });
  const [showOriginal, setShowOriginal] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SHOW_ORIGINAL_STORAGE_KEY);
    return stored !== 'false'; // default to true
  });
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);

  // Real-time session status tracking
  const [sessionStatus, setSessionStatus] = useState<string>(projectData.status);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(projectData.sessionId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sessionId = currentSessionId;
  const isSessionEnded = sessionStatus === "ended";
  const isSessionPaused = sessionStatus === "paused";

  // ─── Realtime hook ────────────────────────────────────────────────────────
  const { interpretations: realtimeInterpretations, connectionStatus, error: realtimeError } =
    useAudienceRealtime({
      sessionId,
      targetLanguage: selectedLanguage,
      sessionEnded: isSessionEnded,
    });

  // ─── Presence tracking: broadcast this viewer's language ──────────────────
  useAudiencePresence({
    sessionId,
    selectedLanguage,
    passive: false,
  });

  // ─── Real-time session status subscription ────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to session changes (status updates)
    const sessionChannel = sessionId
      ? supabase
          .channel(`session-status:${sessionId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "sessions",
              filter: `id=eq.${sessionId}`,
            },
            (payload) => {
              const newStatus = (payload.new as { status: string }).status;
              setSessionStatus(newStatus);
            }
          )
          .subscribe()
      : null;

    // Subscribe to new sessions for this project (when a new session starts)
    const projectChannel = supabase
      .channel(`project-sessions:${projectData.projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessions",
          filter: `project_id=eq.${projectData.projectId}`,
        },
        (payload) => {
          const newSession = payload.new as { id: string; status: string };
          // Auto-switch to new active session
          if (newSession.status === "active" || newSession.status === "live") {
            setCurrentSessionId(newSession.id);
            setSessionStatus(newSession.status);
          }
        }
      )
      .subscribe();

    return () => {
      sessionChannel?.unsubscribe();
      projectChannel.unsubscribe();
    };
  }, [sessionId, projectData.projectId]);

  // ─── Persist language selection ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedLanguage) {
      localStorage.setItem(LANG_STORAGE_KEY, selectedLanguage);
    } else {
      localStorage.removeItem(LANG_STORAGE_KEY);
    }
  }, [selectedLanguage]);

  // ─── Persist font size selection ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  // ─── Persist show original selection ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SHOW_ORIGINAL_STORAGE_KEY, String(showOriginal));
  }, [showOriginal]);

  // ─── Load historical data (for mid-session joins) ─────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();

    const loadHistorical = async () => {
      try {
        const { data, error: dbError } = await supabase
          .from("interpretations")
          .select("id, session_id, original_text, translated_text, target_language, is_final, sequence, start_time_ms, end_time_ms, created_at")
          .eq("session_id", sessionId)
          .order("sequence", { ascending: true });

        if (dbError) {
          setHistoryError("기존 통역 내역을 로드할 수 없습니다.");
          return;
        }

        if (data) {
          const mapped: Interpretation[] = (data as Array<Record<string, unknown>>).map((row) => ({
            id: row.id as string,
            sessionId: row.session_id as string,
            originalText: row.original_text as string,
            translatedText: row.translated_text as string,
            targetLanguage: (row.target_language as string) ?? "",
            isFinal: row.is_final as boolean,
            sequence: row.sequence as number,
            startTimeMs: row.start_time_ms as number | undefined,
            endTimeMs: row.end_time_ms as number | undefined,
            createdAt: row.created_at as string,
          }));
          setHistoricalInterpretations(mapped);

          // Derive available languages from historical data
          const langs = new Set(mapped.map((i) => i.targetLanguage).filter(Boolean));
          setAvailableLanguages(Array.from(langs).sort());
        }
      } catch {
        setHistoryError("예상치 못한 오류가 발생했습니다.");
      }
    };

    loadHistorical();
  }, [sessionId]);

  // ─── Merge historical + realtime, derive languages ───────────────────────
  const interpretations: Interpretation[] = (() => {
    // Realtime hook already deduplicates internally; merge historical as seed
    const map = new Map<string, Interpretation>();
    for (const item of historicalInterpretations) map.set(item.id, item);
    for (const item of realtimeInterpretations) map.set(item.id, item);
    const merged = Array.from(map.values());
    merged.sort((a, b) => a.sequence - b.sequence);
    return merged;
  })();

  // Update available languages when realtime data brings new ones
  useEffect(() => {
    const langs = new Set(interpretations.map((i) => i.targetLanguage).filter(Boolean));
    setAvailableLanguages((prev) => {
      const next = Array.from(langs).sort();
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev;
      return next;
    });
  }, [interpretations]);

  // ─── Derived: filtered interpretations ───────────────────────────────────
  const filtered = selectedLanguage
    ? interpretations.filter((i) => i.targetLanguage === selectedLanguage)
    : interpretations;

  // ─── Track scroll position to detect if user is at bottom ─────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const threshold = 100; // pixels from bottom
      const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

      setIsAtBottom(atBottom);

      // Dismiss notification when user scrolls to bottom
      if (atBottom) {
        setShowNewMessageNotification(false);
        setUnreadCount(0);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Auto-scroll when new items arrive (only if at bottom) ────────────────
  useEffect(() => {
    const newCount = filtered.length;
    const hasNewMessages = newCount > prevCountRef.current;

    if (hasNewMessages) {
      if (isAtBottom && bottomRef.current) {
        // User is at bottom - auto scroll
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        // User has scrolled up - show notification
        const newMessagesCount = newCount - prevCountRef.current;
        setUnreadCount(prev => prev + newMessagesCount);
        setShowNewMessageNotification(true);

        // Haptic feedback on mobile
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
          setShowNewMessageNotification(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }

    prevCountRef.current = newCount;
  }, [filtered.length, isAtBottom]);

  // ─── Map hook connectionStatus to UI ConnectionState ─────────────────────
  const connectionState: ConnectionState = (() => {
    if (isSessionEnded || connectionStatus === "ended") return "disconnected";
    if (!sessionId) return "waiting";
    if (connectionStatus === "connecting") return "reconnecting";
    if (connectionStatus === "connected") return "connected";
    if (connectionStatus === "error") return "reconnecting";
    return "disconnected";
  })();

  // ─── Error message (combine history + realtime errors) ────────────────────
  const displayError = historyError ?? (realtimeError?.message ?? null);

  // ─── Scroll to bottom handler ──────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessageNotification(false);
    setUnreadCount(0);
  }, []);

  // ─── Empty state (Chat-Style Waiting) ────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      {/* Animated message bubble placeholder */}
      <div className="relative mb-8">
        {/* Pulsing background glow */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)' }}
        />

        {/* Icon container with geometric style */}
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 28, 0.95) 0%, rgba(15, 15, 22, 0.98) 100%)',
            border: '3px solid rgba(0, 212, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.2)',
          }}
        >
          <svg
            className="w-10 h-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: '#00d4ff' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 6.627-4.03 12-9 12a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-6.627 4.03-12 9-12s9 5.373 9 12z"
            />
          </svg>
        </div>
      </div>

      {/* Animated dots */}
      <h3 className="text-xl font-bold mb-2" style={{ color: '#ffffff' }}>
        통역 대기 중
      </h3>
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00d4ff', animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00d4ff', animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00d4ff', animationDelay: '300ms' }} />
      </div>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#6b7280' }}>
        행사가 시작되면 실시간 통역이 표시됩니다
      </p>
    </div>
  );

  return (
    <div
      className="h-screen flex flex-col safe-area-inset overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
      }}
    >
      {/* Session ended overlay */}
      {(isSessionEnded || connectionStatus === "ended") && <SessionEndedOverlay />}

      {/* Chat-style header with gradient */}
      <header
        className="shrink-0 px-5 sm:px-4 py-4 sm:py-3.5"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 15, 22, 0.95) 0%, rgba(10, 10, 15, 0.9) 100%)',
          borderBottom: '2px solid rgba(0, 212, 255, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl sm:text-lg font-bold truncate"
              style={{
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              {projectData.projectName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <FullscreenButton />
            <ConnectionStatusIndicator status={sessionId ? connectionState : "waiting"} sessionStatus={sessionStatus} />
          </div>
        </div>

        {/* Language selector and controls */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {availableLanguages.length > 0 && (
              <LanguageSelector
                languages={availableLanguages}
                selected={selectedLanguage}
                onSelect={setSelectedLanguage}
              />
            )}
          </div>
          <ShowOriginalToggle showOriginal={showOriginal} onToggle={() => setShowOriginal(!showOriginal)} />
          <FontSizeControl fontSize={fontSize} onSizeChange={setFontSize} />
        </div>
      </header>

      {/* Error banner */}
      {displayError && (
        <div
          className="shrink-0 mx-5 sm:mx-4 mt-3 px-5 py-4 sm:px-4 sm:py-3 rounded-2xl"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <p className="text-base sm:text-sm leading-relaxed font-medium" style={{ color: '#f87171' }}>
            {displayError}
          </p>
        </div>
      )}

      {/* Main content area - chat messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 overscroll-behavior-contain">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="px-5 sm:px-4 py-6 sm:py-5 pb-safe">
            {filtered.map((item, idx) => (
              <InterpretationCard key={item.id} item={item} isLatest={idx === filtered.length - 1} fontSize={fontSize} showOriginal={showOriginal} />
            ))}
            <div ref={bottomRef} className="h-8 sm:h-4" />
          </div>
        )}
      </div>

      {/* New message notification */}
      {showNewMessageNotification && unreadCount > 0 && (
        <NewMessageNotification count={unreadCount} onClick={scrollToBottom} />
      )}

      {/* Scroll to latest button - show when not at bottom but no new notifications */}
      {!showNewMessageNotification && (
        <ScrollToLatestButton onClick={scrollToBottom} show={!isAtBottom && filtered.length > 0} />
      )}
    </div>
  );
}

// ─── Token exchange response shape ───────────────────────────────────────────

interface TokenExchangeResponse {
  projectId: string;
  projectName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  sessionId: string | null;
}

// ─── Root Page ───────────────────────────────────────────────────────────────

export default function AudiencePage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const passwordFromUrl = searchParams.get("p");
  const tokenFromUrl = searchParams.get("t");

  const [projectData, setProjectData] = useState<JoinResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSlowLoadingIndicator, setShowSlowLoadingIndicator] = useState(false);

  // ─── Token-based access: exchange token for project data ──────────────────
  useEffect(() => {
    if (!tokenFromUrl) return;

    // Quick client-side expiry check — if already expired, skip straight to
    // password gate without a network request.
    const precheck = clientVerifyTokenExpiry(tokenFromUrl);
    if (!precheck) {
      setValidationError("토큰이 만료되었습니다. 비밀번호로 다시 접속해주세요.");
      return;
    }

    const exchangeToken = async () => {
      setIsValidating(true);
      setValidationError(null);
      setShowSlowLoadingIndicator(false);

      // Show slow loading indicator after 5 seconds
      const slowLoadingTimer = setTimeout(() => {
        setShowSlowLoadingIndicator(true);
      }, 5000);

      // Create abort controller for 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // POST the token to /api/join with a special header so the server
        // can distinguish token-auth from password-auth.
        const res = await fetch("/api/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-audience-token": tokenFromUrl,
          },
          body: JSON.stringify({ code, token: tokenFromUrl }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearTimeout(slowLoadingTimer);

        if (!res.ok) {
          setValidationError("토큰이 유효하지 않거나 만료되었습니다. 비밀번호로 다시 접속해주세요.");
          setIsValidating(false);
          return;
        }

        const json = await res.json() as JoinResponse;
        setProjectData(json);
      } catch (err) {
        clearTimeout(timeoutId);
        clearTimeout(slowLoadingTimer);

        if ((err as Error).name === 'AbortError') {
          setValidationError("연결 시간이 초과되었습니다. 다시 시도해주세요.");
        } else {
          setValidationError("연결에 문제가 있습니다. 비밀번호로 다시 접속해주세요.");
        }
        setIsValidating(false);
      }
    };

    exchangeToken();
  }, [code, tokenFromUrl]);

  // ─── Password-based access: validate code + password ──────────────────────
  useEffect(() => {
    // Skip if token path is active (token takes priority)
    if (tokenFromUrl) return;
    if (!passwordFromUrl) return;

    const validate = async () => {
      setIsValidating(true);
      setValidationError(null);
      setShowSlowLoadingIndicator(false);

      // Show slow loading indicator after 5 seconds
      const slowLoadingTimer = setTimeout(() => {
        setShowSlowLoadingIndicator(true);
      }, 5000);

      // Create abort controller for 10-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, password: passwordFromUrl }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        clearTimeout(slowLoadingTimer);

        if (!res.ok) {
          setValidationError("코드 또는 비밀번호가 올바르지 않습니다. 아래에서 비밀번호를 다시 입력하세요.");
          setIsValidating(false);
          return;
        }

        const json = await res.json() as JoinResponse;
        setProjectData(json);
      } catch (err) {
        clearTimeout(timeoutId);
        clearTimeout(slowLoadingTimer);

        if ((err as Error).name === 'AbortError') {
          setValidationError("연결 시간이 초과되었습니다. 다시 시도해주세요.");
        } else {
          setValidationError("연결에 문제가 있습니다. 아래에서 비밀번호를 다시 입력하세요.");
        }
        setIsValidating(false);
      }
    };

    validate();
  }, [code, passwordFromUrl, tokenFromUrl]);

  // Already validated — show live view
  if (projectData) {
    return <LiveView projectData={projectData} />;
  }

  // Auto-validating from URL password or token
  if (isValidating) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 safe-area-inset"
        style={{
          background: 'linear-gradient(180deg, #0a0a0f 0%, #050508 100%)',
        }}
      >
        <div className="text-center">
          <div className="relative mb-6 sm:mb-4 mx-auto w-16 h-16 sm:w-12 sm:h-12">
            {/* Spinning loader with neo-brutal style */}
            <svg
              className="w-full h-full animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              style={{ color: '#00d4ff' }}
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
          <p
            className="text-base sm:text-sm font-bold"
            style={{ color: '#ffffff' }}
          >
            확인 중...
          </p>
          {showSlowLoadingIndicator && (
            <p
              className="text-sm sm:text-xs mt-3 max-w-xs mx-auto"
              style={{ color: '#6b7280' }}
            >
              네트워크가 느릴 수 있습니다.<br />잠시만 기다려주세요.
            </p>
          )}
        </div>
      </div>
    );
  }

  // No password or token in URL, or validation failed — show password gate
  // Pass any validation error (e.g. expired token message) so the gate can display it
  return <PasswordGate code={code} onValidated={setProjectData} initialError={validationError} />;
}
