"use client";

import { useState, useRef, useEffect } from "react";
import type { SubtitleFormat, SubtitleLanguage } from "@teu-im/shared";

interface ExportButtonProps {
  sessionId: string;
  /** List of target languages available for this session (e.g. ["ko", "en"]). */
  availableLanguages?: string[];
  className?: string;
}

const FORMAT_OPTIONS: { value: SubtitleFormat; label: string }[] = [
  { value: "srt", label: "SRT" },
  { value: "vtt", label: "WebVTT" },
];

const LANGUAGE_OPTIONS: { value: SubtitleLanguage; label: string }[] = [
  { value: "translated", label: "번역어" },
  { value: "original", label: "원어" },
  { value: "both", label: "이중자막 (원어 + 번역어)" },
];

/**
 * Dropdown export button that lets users download session subtitles
 * in SRT or VTT format with language selection.
 */
export function ExportButton({
  sessionId,
  availableLanguages = [],
  className = "",
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<SubtitleFormat>("srt");
  const [language, setLanguage] = useState<SubtitleLanguage>("translated");
  const [targetLanguage, setTargetLanguage] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    setIsOpen(false);

    try {
      const params = new URLSearchParams({
        format,
        language,
      });
      if (targetLanguage) {
        params.set("targetLanguage", targetLanguage);
      }

      const response = await fetch(
        `/api/sessions/${sessionId}/export?${params.toString()}`
      );

      if (!response.ok) {
        const body = await response.json();
        alert(body.error || "다운로드 실패");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename =
        extractFilename(contentDisposition) ||
        `session_${sessionId}.${format}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export download error:", error);
      alert("다운로드 중 오류가 발생했습니다");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className={[
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          isDownloading
            ? "cursor-not-allowed opacity-50 border-gray-700 bg-gray-800 text-gray-400"
            : "border-gray-600 bg-gray-800 text-gray-200 hover:border-indigo-500 hover:text-indigo-300 hover:bg-gray-700",
        ].join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isDownloading ? (
          <>
            <svg
              className="animate-spin"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M12 2v4" opacity="0.3" />
            </svg>
            다운로드 중...
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            내보내기
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={[
                "transition-transform duration-200",
                isOpen ? "rotate-180" : "",
              ].join(" ")}
            >
              <path d="M2 3.5L5 6.5L8 3.5" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 z-30 mt-1.5 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-lg shadow-black/30">
          {/* Format selection */}
          <div className="p-3 border-b border-gray-800">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              형식
            </p>
            <div className="flex gap-1.5">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormat(opt.value)}
                  className={[
                    "flex-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors text-center",
                    format === opt.value
                      ? "border-indigo-500 bg-indigo-900/30 text-indigo-300"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language selection */}
          <div className="p-3 border-b border-gray-800">
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              자막 언어
            </p>
            <div className="flex flex-col gap-1">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLanguage(opt.value)}
                  className={[
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors",
                    language === opt.value
                      ? "bg-indigo-900/30 text-indigo-300"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      language === opt.value
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-gray-600",
                    ].join(" ")}
                  >
                    {language === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target language filter (shown when multiple languages exist) */}
          {availableLanguages.length > 1 && (
            <div className="p-3 border-b border-gray-800">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                목표 언어 필터
              </p>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">모든 언어</option>
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Download action */}
          <div className="p-3">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            >
              다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract filename from a Content-Disposition header value.
 * Handles both plain and quoted filename values.
 */
function extractFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1].trim() : null;
}
