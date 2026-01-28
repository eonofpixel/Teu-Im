"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

// ─── 타입 정의 ──────────────────────────────────────────────

export interface TimelineInterpretation {
  id: string;
  sequence: number;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  startTimeMs: number | null;
  endTimeMs: number | null;
  createdAt: string;
}

export interface TimelineProps {
  /** 해석 목록 (시간순 정렬됨) */
  interpretations: TimelineInterpretation[];
  /** 세션 오디오 전체 재생 시간 (밀리초) */
  audioDurationMs: number;
  /** 현재 재생 위치 (밀리초). 외부에서 제어할 수 있음 */
  currentPositionMs?: number;
  /** 타임라인 마커를 클릭했을 때 해당 시간 위치로 이동 요청 */
  onSeekToPosition?: (positionMs: number) => void;
  /** 초기 언어 필터 값 */
  initialLanguageFilter?: string | null;
}

// ─── 유틸 함수 ──────────────────────────────────────────────

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function formatDurationShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  es: "스페인어",
  fr: "프랑스어",
  de: "독일어",
  pt: "포르투갈어",
  ru: "러시아어",
  ar: "아랍어",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// ─── 언어 필터 버튼 ────────────────────────────────────────

function LanguageFilter({
  languages,
  activeFilter,
  onChange,
}: {
  languages: string[];
  activeFilter: string | null;
  onChange: (lang: string | null) => void;
}) {
  if (languages.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">언어:</span>
      <button
        onClick={() => onChange(null)}
        className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
          activeFilter === null
            ? "bg-indigo-600 text-white"
            : "bg-gray-800 text-gray-400 hover:text-gray-200"
        }`}
      >
        전체
      </button>
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
            activeFilter === lang
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          {getLanguageName(lang)}
        </button>
      ))}
    </div>
  );
}

// ─── 타임라인 루프 표시 (시각적 타임라인 바) ─────────────────

function TimelineBar({
  interpretations,
  audioDurationMs,
  currentPositionMs,
  onSeekToPosition,
  activeLanguage,
}: {
  interpretations: TimelineInterpretation[];
  audioDurationMs: number;
  currentPositionMs: number;
  onSeekToPosition?: (positionMs: number) => void;
  activeLanguage: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoveredInterp, setHoveredInterp] = useState<TimelineInterpretation | null>(null);

  const withTimes = useMemo(
    () =>
      interpretations.filter(
        (i) => i.startTimeMs !== null && i.endTimeMs !== null
      ),
    [interpretations]
  );

  // 재생 위치 비율 계산
  const playbackRatio = audioDurationMs > 0 ? currentPositionMs / audioDurationMs : 0;

  // 클릭 시 해당 시간 위치로 이동
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !onSeekToPosition || audioDurationMs === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeekToPosition(Math.round(ratio * audioDurationMs));
    },
    [audioDurationMs, onSeekToPosition]
  );

  // 마우스 호버 위치 추적
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || audioDurationMs === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const positionMs = Math.round(ratio * audioDurationMs);
      setHoverPosition(positionMs);

      // 호버 중인 해석 탐색
      const hovered = withTimes.find(
        (i) => positionMs >= (i.startTimeMs ?? 0) && positionMs <= (i.endTimeMs ?? 0)
      );
      setHoveredInterp(hovered ?? null);
    },
    [audioDurationMs, withTimes]
  );

  if (withTimes.length === 0 || audioDurationMs === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-700 p-4 text-center">
        <p className="text-xs text-gray-500">타임스탬프가 있는 해석이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 타임라인 바 */}
      <div
        ref={containerRef}
        className="relative h-16 bg-gray-800 rounded-lg overflow-hidden cursor-crosshair select-none"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoverPosition(null);
          setHoveredInterp(null);
        }}
      >
        {/* 가짜 파형 백그라운드 */}
        <div className="absolute inset-0 flex items-center justify-around px-1.5">
          {Array(80)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-gray-700 rounded-full"
                style={{
                  height: `${12 + Math.abs(Math.sin(i * 0.3 + 1) * 20 + Math.cos(i * 0.6) * 10)}%`,
                }}
              />
            ))}
        </div>

        {/* 해석 마커 블록들 */}
        {withTimes.map((interp) => {
          const leftPercent = ((interp.startTimeMs ?? 0) / audioDurationMs) * 100;
          const widthPercent =
            (((interp.endTimeMs ?? 0) - (interp.startTimeMs ?? 0)) / audioDurationMs) * 100;
          const isActive =
            currentPositionMs >= (interp.startTimeMs ?? 0) &&
            currentPositionMs <= (interp.endTimeMs ?? 0);
          const isHovered = hoveredInterp?.id === interp.id;

          return (
            <div
              key={interp.id}
              className="absolute top-0 bottom-0 transition-colors duration-150"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 0.3)}%`,
              }}
              onMouseEnter={() => setHoveredInterp(interp)}
              onMouseLeave={() => setHoveredInterp(null)}
            >
              <div
                className={`absolute inset-0 border-l-2 transition-all duration-150 ${
                  isActive
                    ? "border-indigo-400 bg-indigo-500/40"
                    : isHovered
                    ? "border-indigo-500 bg-indigo-500/25"
                    : "border-indigo-600 bg-indigo-600/15"
                }`}
              />
            </div>
          );
        })}

        {/* 재생 위치 커서 */}
        {audioDurationMs > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg z-10 pointer-events-none"
            style={{ left: `${playbackRatio * 100}%` }}
          >
            {/* 위쪽 삼각형 마커 */}
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/80" />
          </div>
        )}

        {/* 호버 시간 표시 */}
        {hoverPosition !== null && (
          <div
            className="absolute top-1 text-xs font-mono text-gray-300 bg-gray-900/90 px-1.5 py-0.5 rounded pointer-events-none z-20"
            style={{
              left: `${(hoverPosition / audioDurationMs) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {formatTimestamp(hoverPosition)}
          </div>
        )}
      </div>

      {/* 시간 축 표지 */}
      <div className="flex justify-between">
        <span className="text-xs font-mono text-gray-600">0:00</span>
        <span className="text-xs font-mono text-gray-600">
          {formatDurationShort(audioDurationMs)}
        </span>
      </div>

      {/* 호버 정보 패널 */}
      {hoveredInterp && (
        <div className="p-3 rounded-lg bg-gray-800 border border-gray-700 animate-pulse-once">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">원본</p>
              <p className="text-xs text-gray-300 line-clamp-2">{hoveredInterp.originalText}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">번역 ({getLanguageName(hoveredInterp.targetLanguage)})</p>
              <p className="text-xs text-indigo-300 line-clamp-2">{hoveredInterp.translatedText}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-mono text-gray-500">
                {formatTimestamp(hoveredInterp.startTimeMs ?? 0)}
              </p>
              <p className="text-xs font-mono text-gray-600">
                → {formatTimestamp(hoveredInterp.endTimeMs ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 해석 항목 카드 ─────────────────────────────────────────

function InterpretationCard({
  interpretation,
  isActive,
  onClickSeek,
}: {
  interpretation: TimelineInterpretation;
  isActive: boolean;
  onClickSeek?: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg border p-3.5 transition-all duration-200 ${
        isActive
          ? "border-indigo-500/50 bg-indigo-950/40 shadow-sm shadow-indigo-500/10"
          : "border-gray-800 bg-gray-800/40 hover:border-gray-700"
      }`}
    >
      {/* 왼쪽 시퀀스 라인 */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
          isActive ? "bg-indigo-500" : "bg-gray-700"
        }`}
      />

      <div className="ml-3">
        {/* 헤더: 시퀀스 + 언어 배지 + 시간 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-600 w-6 text-right">
              {String(interpretation.sequence).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-full">
              {getLanguageName(interpretation.targetLanguage)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {interpretation.startTimeMs !== null && (
              <button
                onClick={onClickSeek}
                className="text-xs font-mono text-gray-500 hover:text-indigo-300 transition-colors cursor-pointer"
                title="클릭하면 해당 시간으로 이동"
              >
                {formatTimestamp(interpretation.startTimeMs)}
                {interpretation.endTimeMs !== null && (
                  <span className="text-gray-700">
                    {" "}→ {formatTimestamp(interpretation.endTimeMs)}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 원본 텍스트 */}
        <p className="text-xs text-gray-500 mb-0.5">원본</p>
        <p className="text-sm text-gray-200 leading-relaxed mb-2">{interpretation.originalText}</p>

        {/* 번역 텍스트 */}
        <p className="text-xs text-gray-500 mb-0.5">번역</p>
        <p className="text-sm text-indigo-300 leading-relaxed">{interpretation.translatedText}</p>
      </div>
    </div>
  );
}

// ─── SessionTimeline 메인 컴포넌트 ──────────────────────────

export default function SessionTimeline({
  interpretations,
  audioDurationMs,
  currentPositionMs = 0,
  onSeekToPosition,
  initialLanguageFilter = null,
}: TimelineProps) {
  const [languageFilter, setLanguageFilter] = useState<string | null>(initialLanguageFilter);
  const listRef = useRef<HTMLDivElement>(null);

  // 사용 가능한 언어 목록 추출
  const availableLanguages = useMemo(() => {
    const langs = new Set(
      interpretations
        .map((i) => i.targetLanguage)
        .filter((l) => l && l !== "unknown")
    );
    return Array.from(langs).sort();
  }, [interpretations]);

  // 필터된 해석 목록
  const filteredInterpretations = useMemo(() => {
    if (!languageFilter) return interpretations;
    return interpretations.filter((i) => i.targetLanguage === languageFilter);
  }, [interpretations, languageFilter]);

  // 현재 재생 중인 해석 탐색
  const activeInterpretationId = useMemo(() => {
    for (const interp of filteredInterpretations) {
      if (
        interp.startTimeMs !== null &&
        interp.endTimeMs !== null &&
        currentPositionMs >= interp.startTimeMs &&
        currentPositionMs <= interp.endTimeMs
      ) {
        return interp.id;
      }
    }
    return null;
  }, [filteredInterpretations, currentPositionMs]);

  // 활성 해석이 바뀌면 리스트로 스크롤
  useEffect(() => {
    if (!activeInterpretationId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-interp-id="${activeInterpretationId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeInterpretationId]);

  return (
    <div className="space-y-5">
      {/* 언어 필터 */}
      <LanguageFilter
        languages={availableLanguages}
        activeFilter={languageFilter}
        onChange={setLanguageFilter}
      />

      {/* 타임라인 바 (시각적 타임라인) */}
      <TimelineBar
        interpretations={filteredInterpretations}
        audioDurationMs={audioDurationMs}
        currentPositionMs={currentPositionMs}
        onSeekToPosition={onSeekToPosition}
        activeLanguage={languageFilter}
      />

      {/* 해석 카드 목록 */}
      <div ref={listRef} className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filteredInterpretations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500">
              {languageFilter
                ? `${getLanguageName(languageFilter)} 해석 내용이 없습니다`
                : "해석 내용이 없습니다"}
            </p>
          </div>
        ) : (
          filteredInterpretations.map((interp) => (
            <div key={interp.id} data-interp-id={interp.id}>
              <InterpretationCard
                interpretation={interp}
                isActive={activeInterpretationId === interp.id}
                onClickSeek={
                  onSeekToPosition && interp.startTimeMs !== null
                    ? () => onSeekToPosition(interp.startTimeMs!)
                    : undefined
                }
              />
            </div>
          ))
        )}
      </div>

      {/* 해석 수 요약 */}
      {filteredInterpretations.length > 0 && (
        <p className="text-xs text-gray-600 text-center">
          {filteredInterpretations.length}개 해석
          {languageFilter && interpretations.length !== filteredInterpretations.length && (
            <span className="ml-1">(전체 {interpretations.length}개 중)</span>
          )}
        </p>
      )}
    </div>
  );
}
