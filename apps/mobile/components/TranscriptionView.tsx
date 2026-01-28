"use client";

import { useEffect, useRef } from "react";
import type { Interpretation } from "@teu-im/shared";

interface TranscriptionViewProps {
  interpretations: Interpretation[];
}

/** 타임스탬프를 "오후 2:34" 형식으로 변환 */
function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "오후" : "오전";
    const h = hours % 12 || 12;
    return `${ampm} ${h}:${minutes}`;
  } catch {
    return "";
  }
}

export default function TranscriptionView({
  interpretations,
}: TranscriptionViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // 새 항목 추가 시 자동 스크롤
  useEffect(() => {
    if (
      interpretations.length > prevLengthRef.current &&
      bottomRef.current
    ) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevLengthRef.current = interpretations.length;
  }, [interpretations.length]);

  // ─── 빈 상태 ───
  if (interpretations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 animate-scale-in"
          style={{
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border)",
          }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: "var(--color-text-disabled)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 6.627-4.03 12-9 12a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-6.627 4.03-12 9-12s9 5.373 9 12z"
            />
          </svg>
        </div>
        <h3 className="font-medium text-sm" style={{ color: "var(--color-text-muted)" }}>
          아직 통역 내용이 없습니다
        </h3>
        <p className="text-xs mt-2 max-w-xs leading-relaxed" style={{ color: "var(--color-text-disabled)" }}>
          행사가 시작되면 실시간 통역 내용이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 px-3 py-3 pb-safe scroll-smooth-mobile">
      {interpretations.map((item) => (
        <div
          key={item.id}
          className="animate-slide-up rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            background: item.isFinal
              ? "var(--color-bg-secondary)"
              : "rgba(24, 27, 34, 0.5)",
            border: item.isFinal
              ? "1px solid var(--color-border)"
              : "1px dashed var(--color-border)",
          }}
        >
          {/* 헤더 행: 언어 태그 + 타임스탬프 */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <div className="flex items-center gap-2">
              {/* 언어 배지 */}
              {item.targetLanguage && (
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    background: "var(--color-accent-glow)",
                    color: "var(--color-accent)",
                  }}
                >
                  {item.targetLanguage}
                </span>
              )}
              {/* 시퀀스 번호 */}
              <span
                className="text-xs font-mono"
                style={{ color: "var(--color-text-disabled)" }}
              >
                #{item.sequence}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 타임스탬프 */}
              <span
                className="text-xs"
                style={{ color: "var(--color-text-disabled)" }}
              >
                {formatTime(item.createdAt)}
              </span>
              {/* 실시간 표시 */}
              {!item.isFinal && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-warning)" }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: "var(--color-warning)" }}
                  />
                  실시간
                </span>
              )}
            </div>
          </div>

          {/* 본문 영역 */}
          <div className="px-4 pb-3.5">
            {/* 원문 */}
            <div className="mb-2.5">
              <span
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-text-disabled)" }}
              >
                원문
              </span>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: item.isFinal
                    ? "var(--color-text-muted)"
                    : "var(--color-text-disabled)",
                  fontStyle: item.isFinal ? "normal" : "italic",
                }}
              >
                {item.originalText}
              </p>
            </div>

            {/* 구분선 — 다이아몬드 포인트 */}
            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              <div
                className="w-1.5 h-1.5 rotate-45"
                style={{ background: "var(--color-border)" }}
              />
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            </div>

            {/* 번역문 — 강조 */}
            <div>
              <span
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-accent)" }}
              >
                번역
              </span>
              <p
                className="text-lg font-medium leading-relaxed"
                style={{
                  color: item.isFinal
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                }}
              >
                {item.translatedText}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* 자동 스크롤 앵커 */}
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}
