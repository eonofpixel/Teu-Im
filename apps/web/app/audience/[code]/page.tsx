"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAudienceRealtime } from "@/hooks/useAudienceRealtime";
import { useAudiencePresence } from "@/hooks/useAudiencePresence";
import type { Interpretation } from "@teu-im/shared";

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

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password: password.trim() }),
      });

      if (!res.ok) {
        setError("코드 또는 비밀번호가 올바르지 않습니다.");
        setIsSubmitting(false);
        return;
      }

      const json = await res.json() as { data: JoinResponse };
      onValidated(json.data);
    } catch {
      setError("연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  }, [code, password, onValidated]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5">
      {/* Decorative ambient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo mark */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white tracking-tight">Teu-Im</h1>
          <p className="text-xs text-gray-500 mt-1.5 tracking-wide uppercase">실시간 통역</p>
        </div>

        {/* Code badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-800 bg-gray-900">
            <span className="text-xs text-gray-500 uppercase tracking-wider">행사 코드</span>
            <span className="text-sm font-mono font-semibold text-indigo-400">{code.toUpperCase()}</span>
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              참여 비밀번호
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-950 border border-red-900/50">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5-2.747 2.847-5.577 3.724-.279.09-.58.165-.89.226C20.531 20.726 22 16.594 22 12.423c0-5.391-4.582-9.744-10.228-9.744-5.646 0-10.228 4.353-10.228 9.744 0 4.171 1.469 8.303 5.721 8.274.31-.061.611-.136.89-.226-2.83-.877-4.711-2.224-5.577-3.724" />
              </svg>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
            style={{
              background: isSubmitting
                ? "#4f46e5"
                : "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: isSubmitting ? "none" : "0 4px 20px rgba(99, 102, 241, 0.3)",
            }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                검증 중...
              </span>
            ) : (
              "참여하기"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          행사 주최자로부터 코드와 비밀번호를 받아야 합니다
        </p>
      </div>
    </div>
  );
}

// ─── Connection Status Bar ───────────────────────────────────────────────────

function ConnectionStatusBar({ status, projectStatus }: { status: ConnectionState; projectStatus: string }) {
  if (projectStatus === "ended") {
    return (
      <div className="shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-600" />
          <span className="text-xs text-gray-500">행사가 종료되었습니다</span>
        </div>
      </div>
    );
  }

  const configs = {
    connected: { dot: "bg-emerald-400", pulse: true, label: "실시간 연결됨", badge: "라이브" },
    reconnecting: { dot: "bg-amber-400", pulse: true, label: "재연결 중...", badge: null },
    disconnected: { dot: "bg-red-400", pulse: false, label: "연결 끊김", badge: null },
    waiting: { dot: "bg-gray-600", pulse: false, label: "세션 시작 대기 중", badge: null },
  } as const;

  const cfg = configs[status];

  return (
    <div className="shrink-0 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center w-3 h-3">
          {cfg.pulse && (
            <span className={`absolute inset-0 rounded-full animate-ping ${cfg.dot} opacity-30`} />
          )}
          <span className={`relative z-10 w-2 h-2 rounded-full ${cfg.dot}`} />
        </div>
        <span className="text-xs text-gray-400">{cfg.label}</span>
        {cfg.badge && (
          <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-900/50">
            {cfg.badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Floating Language Selector ──────────────────────────────────────────────

function FloatingLanguageSelector({
  languages,
  selected,
  onSelect,
}: {
  languages: string[];
  selected: string | null;
  onSelect: (lang: string | null) => void;
}) {
  if (languages.length <= 1) return null;

  return (
    <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4">
      <div
        className="flex gap-1.5 px-2 py-1.5 rounded-2xl shadow-lg shadow-black/40"
        style={{ background: "rgba(17, 17, 27, 0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* All languages pill */}
        <button
          onClick={() => onSelect(null)}
          className="px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
          style={{
            background: selected === null ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
            color: selected === null ? "#fff" : "rgba(160,160,175,0.8)",
            boxShadow: selected === null ? "0 2px 10px rgba(99,102,241,0.3)" : "none",
          }}
        >
          전체
        </button>

        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => onSelect(lang)}
            className="px-3 py-1 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
            style={{
              background: selected === lang ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
              color: selected === lang ? "#fff" : "rgba(160,160,175,0.8)",
              boxShadow: selected === lang ? "0 2px 10px rgba(99,102,241,0.3)" : "none",
            }}
          >
            {getLangLabel(lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Interpretation Card ─────────────────────────────────────────────────────

function InterpretationCard({ item, index }: { item: Interpretation; index: number }) {
  return (
    <article
      className="animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
    >
      <div
        className="rounded-xl overflow-hidden transition-all duration-300"
        style={{
          background: item.isFinal ? "rgba(30, 32, 42, 0.9)" : "rgba(25, 27, 35, 0.6)",
          border: item.isFinal ? "1px solid rgba(255,255,255,0.08)" : "1px dashed rgba(255,255,255,0.12)",
        }}
      >
        {/* Meta row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            {item.targetLanguage && (
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-900/50">
                {item.targetLanguage}
              </span>
            )}
            <span className="text-xs font-mono text-gray-600">#{item.sequence}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">
              {(() => {
                try {
                  const d = new Date(item.createdAt);
                  const h = d.getHours();
                  const m = d.getMinutes().toString().padStart(2, "0");
                  const ampm = h >= 12 ? "오후" : "오전";
                  return `${ampm} ${h % 12 || 12}:${m}`;
                } catch { return ""; }
              })()}
            </span>
            {!item.isFinal && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                실시간
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          {/* Source text — small, muted */}
          <p
            className="text-xs leading-relaxed mb-3"
            style={{
              color: item.isFinal ? "rgba(160,160,175,0.7)" : "rgba(160,160,175,0.45)",
              fontStyle: item.isFinal ? "normal" : "italic",
            }}
          >
            {item.originalText}
          </p>

          {/* Divider with diamond */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gray-800" />
            <div className="w-1.5 h-1.5 rotate-45 bg-gray-800" />
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Translation — large, prominent */}
          <p
            className="text-xl font-medium leading-relaxed tracking-tight"
            style={{
              color: item.isFinal ? "#f1f1f5" : "rgba(200,200,215,0.8)",
            }}
          >
            {item.translatedText}
          </p>
        </div>
      </div>
    </article>
  );
}

// ─── Session Ended Overlay ────────────────────────────────────────────────────

function SessionEndedOverlay() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 bg-opacity-95 px-6">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gray-900 border border-gray-800">
          <svg className="w-9 h-9 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-white mb-2">세션이 종료되었습니다</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">
          이 행사의 실시간 통역 세션은 종료되었습니다.<br />
          행사 주최자가 새로운 세션을 시작할 수 있습니다.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => router.back()}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)",
            }}
          >
            뒤로 가기
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "rgba(30, 32, 42, 0.9)",
              color: "rgba(160,160,175,0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
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
  const [historyError, setHistoryError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const sessionId = projectData.sessionId;
  const isSessionEnded = projectData.status === "ended";

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

  // ─── Persist language selection ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedLanguage) {
      localStorage.setItem(LANG_STORAGE_KEY, selectedLanguage);
    } else {
      localStorage.removeItem(LANG_STORAGE_KEY);
    }
  }, [selectedLanguage]);

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

  // ─── Auto-scroll when new items arrive ────────────────────────────────────
  useEffect(() => {
    if (filtered.length > prevCountRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = filtered.length;
  }, [filtered.length]);

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

  // ─── Empty state ──────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-gray-900 border border-gray-800">
        <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 6.627-4.03 12-9 12a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-6.627 4.03-12 9-12s9 5.373 9 12z" />
        </svg>
      </div>
      <h3 className="font-medium text-sm text-gray-400">아직 통역 내용이 없습니다</h3>
      <p className="text-xs mt-2 max-w-xs leading-relaxed text-gray-600">
        행사가 시작되면 실시간 통역 내용이 여기에 표시됩니다.
      </p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Session ended overlay */}
      {(isSessionEnded || connectionStatus === "ended") && <SessionEndedOverlay />}

      {/* Header */}
      <header className="shrink-0 px-4 pt-safe-top pb-3 pt-3 bg-gray-950 border-b border-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-white truncate">{projectData.projectName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-gray-600">
                {projectData.sourceLanguage.toUpperCase()} → {projectData.targetLanguage.toUpperCase()}
              </span>
              {availableLanguages.length > 1 && (
                <span className="text-xs text-gray-500">({availableLanguages.length}개 언어)</span>
              )}
            </div>
          </div>

          {/* Teu-Im badge */}
          <span className="text-xs font-bold text-indigo-400 opacity-60 tracking-wider">TEU-IM</span>
        </div>
      </header>

      {/* Connection status */}
      <ConnectionStatusBar status={sessionId ? connectionState : "waiting"} projectStatus={projectData.status} />

      {/* Error banner */}
      {displayError && (
        <div className="shrink-0 mx-3 mt-2 px-3 py-2 rounded-lg flex items-center gap-2 bg-amber-950 border border-amber-900/50">
          <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c.866 1.5 2.747 2.847 5.577 3.724.279.09.58.165.89.226C9.469 20.726 8 16.594 8 12.423c0-5.391 4.582-9.744 10.228-9.744 1.41 0 2.744.306 3.938.858M12 9a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-xs text-amber-300">{displayError}</p>
        </div>
      )}

      {/* Interpretation scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 px-3 py-3 pb-24">
            {filtered.map((item, idx) => (
              <InterpretationCard key={item.id} item={item} index={idx} />
            ))}
            <div ref={bottomRef} className="h-2" />
          </div>
        )}

        {/* Floating language selector — anchored to scroll container bottom */}
        <FloatingLanguageSelector
          languages={availableLanguages}
          selected={selectedLanguage}
          onSelect={setSelectedLanguage}
        />
      </div>
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
        });

        if (!res.ok) {
          setValidationError("토큰이 유효하지 않거나 만료되었습니다. 비밀번호로 다시 접속해주세요.");
          setIsValidating(false);
          return;
        }

        const json = await res.json() as { data: JoinResponse };
        setProjectData(json.data);
      } catch {
        setValidationError("연결에 문제가 있습니다. 비밀번호로 다시 접속해주세요.");
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

      try {
        const res = await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, password: passwordFromUrl }),
        });

        if (!res.ok) {
          setValidationError("코드 또는 비밀번호가 올바르지 않습니다. 아래에서 비밀번호를 다시 입력하세요.");
          setIsValidating(false);
          return;
        }

        const json = await res.json() as { data: JoinResponse };
        setProjectData(json.data);
      } catch {
        setValidationError("연결에 문제가 있습니다. 아래에서 비밀번호를 다시 입력하세요.");
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
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
        <div className="relative z-10 text-center">
          <div className="relative mb-6 mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-30" />
            <svg className="w-12 h-12 animate-spin text-indigo-500 relative" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">검증 중...</p>
        </div>
      </div>
    );
  }

  // No password or token in URL, or validation failed — show password gate
  // Pass any validation error (e.g. expired token message) so the gate can display it
  return <PasswordGate code={code} onValidated={setProjectData} initialError={validationError} />;
}
