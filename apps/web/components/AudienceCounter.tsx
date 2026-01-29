"use client";

import { useState, useEffect, useRef, memo, useMemo } from "react";
import type { AudiencePresenceState } from "@/hooks/useAudiencePresence";

// ─── Language label map (mirrors audience page convention) ───────────────────

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

// ─── Animated number display ─────────────────────────────────────────────────
// Memo: Prevent re-render of number component when parent updates

/**
 * Smoothly interpolates from the previous number to the new target
 * using requestAnimationFrame. Runs a short animation on each change.
 */
const AnimatedNumber = memo(function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const animFrameRef = useRef<number | null>(null);
  const startRef = useRef({ from: value, to: value, startTime: 0 });

  useEffect(() => {
    // Cancel any in-flight animation
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const from = displayed;
    const to = value;

    // If target hasn't changed, nothing to do
    if (from === to) return;

    const duration = 600; // ms
    startRef.current = { from, to, startTime: performance.now() };

    const tick = (now: number) => {
      const elapsed = now - startRef.current.startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(
        startRef.current.from + (startRef.current.to - startRef.current.from) * eased
      );
      setDisplayed(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className={className}>{displayed}</span>;
});

// ─── Language pill ───────────────────────────────────────────────────────────
// Memo: Individual pills only re-render when their count changes

const LanguagePill = memo(function LanguagePill({ code, count }: { code: string; count: number }) {
  if (code === "unknown") return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700">
      <span className="text-xs font-medium text-gray-300">{getLangLabel(code)}</span>
      <AnimatedNumber
        value={count}
        className="text-xs font-semibold text-indigo-400"
      />
    </div>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────

export interface AudienceCounterProps {
  /** Live presence state from the useAudiencePresence hook. */
  presence: AudiencePresenceState;
  /** When false, hides the component entirely. Useful for gating on session active. */
  visible?: boolean;
}

/**
 * Displays the current audience viewer count with an animated total
 * and a per-language breakdown as small pills.
 *
 * Intended for use on the presenter's live dashboard page.
 */
export const AudienceCounter = memo(function AudienceCounter({ presence, visible = true }: AudienceCounterProps) {
  const { totalCount, byLanguage } = presence;

  // Memo: Only recalculate sorted languages when byLanguage changes
  const sortedLanguages = useMemo(() =>
    Object.entries(byLanguage)
      .filter(([code]) => code !== "unknown")
      .sort((a, b) => b[1] - a[1]),
    [byLanguage]
  );

  const unknownCount = byLanguage["unknown"] ?? 0;

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      {/* Header row: icon + total count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* People icon */}
          <svg
            className="w-4 h-4 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-white">청중</h3>
        </div>

        {/* Animated total with live dot */}
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">라이브</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-900/50">
            <AnimatedNumber
              value={totalCount}
              className="text-sm font-bold text-indigo-400"
            />
            <span className="text-xs text-indigo-300 opacity-60">명</span>
          </div>
        </div>
      </div>

      {/* Language breakdown pills */}
      {sortedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sortedLanguages.map(([code, count]) => (
            <LanguagePill key={code} code={code} count={count} />
          ))}
          {unknownCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700">
              <span className="text-xs font-medium text-gray-500">기타</span>
              <span className="text-xs font-semibold text-gray-400">{unknownCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty hint when no viewers */}
      {totalCount === 0 && (
        <p className="text-xs text-gray-600 mt-1">
          청중이 아직 참여하지 않았습니다
        </p>
      )}
    </div>
  );
});
