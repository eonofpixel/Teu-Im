"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import SessionTimeline from "@/components/SessionTimeline";

// ─── 타입 정의 ─────────────────────────────────────────────

interface SessionData {
  id: string;
  projectId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  audioFilePath: string | null;
  audioDurationMs: number | null;
}

interface ProjectData {
  id: string;
  name: string;
  sourceLang: string;
  targetLangs: string[];
}

interface InterpretationData {
  id: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  sequence: number;
  startTimeMs: number | null;
  endTimeMs: number | null;
  createdAt: string;
}

// ─── 유틸: 시간 포맷 ──────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(centiseconds).padStart(2, "0")}`;
}

function formatDateLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── 유틸: 자막 생성 (SRT / VTT) ───────────────────────────

type SubtitleFormat = "srt" | "vtt";
type SubtitleLanguage = "original" | "translated";

function generateSubtitle(
  interpretations: InterpretationData[],
  mode: SubtitleLanguage,
  format: SubtitleFormat
): string {
  const sorted = [...interpretations]
    .filter((i) => i.startTimeMs !== null && i.endTimeMs !== null)
    .sort((a, b) => (a.startTimeMs ?? 0) - (b.startTimeMs ?? 0));

  // 타임스탬프가 있는 항목이 없으면 fallback: sequence 순 + 간격 배정
  const items =
    sorted.length > 0
      ? sorted
      : [...interpretations].sort((a, b) => a.sequence - b.sequence);

  if (format === "vtt") {
    let vtt = "WEBVTT\n\n";
    items.forEach((item, idx) => {
      const startMs = item.startTimeMs ?? idx * 3000;
      const endMs = item.endTimeMs ?? startMs + 2500;
      const text = mode === "original" ? item.originalText : item.translatedText;
      vtt += `${formatTimestamp(startMs).replace(",", ".")} --> ${formatTimestamp(endMs).replace(",", ".")}\n`;
      vtt += `${text}\n\n`;
    });
    return vtt;
  }

  // SRT
  let srt = "";
  items.forEach((item, idx) => {
    const startMs = item.startTimeMs ?? idx * 3000;
    const endMs = item.endTimeMs ?? startMs + 2500;
    const text = mode === "original" ? item.originalText : item.translatedText;
    srt += `${idx + 1}\n`;
    srt += `${formatTimestamp(startMs)} --> ${formatTimestamp(endMs)}\n`;
    srt += `${text}\n\n`;
  });
  return srt;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── 유틸: 언어 코드 → 표시명 ──────────────────────────────

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
  ar: "아랑어",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// ─── 상태 배지 ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-900/50 text-emerald-400",
    paused: "bg-amber-900/50 text-amber-400",
    completed: "bg-indigo-900/50 text-indigo-400",
    ended: "bg-gray-800 text-gray-400",
  };
  const labels: Record<string, string> = {
    active: "진행 중",
    paused: "일시 정지",
    completed: "완료",
    ended: "종료",
  };

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status] ?? styles.ended}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── 로딩 스켱레톤 ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-gray-800 rounded-lg" />
          <div className="h-4 w-40 bg-gray-800 rounded" />
        </div>
        <div className="h-8 w-24 bg-gray-800 rounded-lg" />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
        <div className="h-4 w-48 bg-gray-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 bg-gray-800 rounded" />
              <div className="h-4 w-28 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3">
        <div className="h-4 w-24 bg-gray-800 rounded" />
        <div className="h-16 bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}

// ─── 오디오 플레이어 섹션 (Seek 지원) ──────────────────────

/**
 * AudioPlayerSection은 오디오 재생과 타임라인 인터페이스를 결합합니다.
 *
 * - audioRef를 외부에서 받아 타임라인 클릭 시 currentTime 조작 가능
 * - 재생 중 currentPositionMs를 실시간 갱신하여 SessionTimeline에 전달
 * - 타임라인에서 클릭한 시간으로 오디오 seekTo 처리
 */
function AudioPlayerSection({
  audioUrl,
  audioDurationMs,
  interpretations,
  onDelete,
  onDownload,
  audioRef,
  currentPositionMs,
  onPositionChange,
  onSeekToPosition,
}: {
  audioUrl: string | null;
  audioDurationMs: number | null;
  interpretations: InterpretationData[];
  onDelete: () => void;
  onDownload: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentPositionMs: number;
  onPositionChange: (ms: number) => void;
  onSeekToPosition: (ms: number) => void;
}) {
  // 타임라인 컴포넌트에 전달할 형태로 변환
  const timelineInterpretations = interpretations.map((i) => ({
    id: i.id,
    sequence: i.sequence,
    originalText: i.originalText,
    translatedText: i.translatedText,
    targetLanguage: i.targetLanguage,
    isFinal: i.isFinal,
    startTimeMs: i.startTimeMs,
    endTimeMs: i.endTimeMs,
    createdAt: i.createdAt,
  }));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">녹음 파일 & 타임라인</h3>
        {audioDurationMs && (
          <span className="text-xs text-gray-500">{formatDuration(audioDurationMs)}</span>
        )}
      </div>

      {audioUrl ? (
        <>
          {/* SessionTimeline: 시각적 타임라인 + 해석 목록 + 언어 필터 */}
          <SessionTimeline
            interpretations={timelineInterpretations}
            audioDurationMs={audioDurationMs ?? 0}
            currentPositionMs={currentPositionMs}
            onSeekToPosition={onSeekToPosition}
          />

          {/* 오디오 플레이어 */}
          <audio
            ref={audioRef}
            controls
            src={audioUrl}
            className="w-full rounded-lg mt-4"
            style={{ accentColor: "#4f46e5" }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              onPositionChange(Math.round(el.currentTime * 1000));
            }}
          />

          <div className="flex gap-2 mt-4">
            <button
              onClick={onDownload}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              다운로드
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/20"
            >
              삭제
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
          <p className="text-gray-500 text-sm">녹음 파일이 없습니다</p>
        </div>
      )}
    </div>
  );
}

// ─── 디스플레이 모드 셀렉터 ────────────────────────────────

type DisplayMode = "normal" | "presentation" | "highContrast";

function DisplayModeSelector({
  mode,
  onChange,
}: {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  const modes: { id: DisplayMode; label: string; previewBg: string; previewText: string }[] = [
    { id: "normal", label: "일반", previewBg: "bg-gray-800", previewText: "text-gray-200" },
    { id: "presentation", label: "프레젠테이션", previewBg: "bg-black", previewText: "text-white" },
    { id: "highContrast", label: "고대비", previewBg: "bg-black", previewText: "text-yellow-400" },
  ];

  return (
    <div className="flex gap-2">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            mode === m.id
              ? "ring-2 ring-indigo-500 bg-gray-800"
              : "border border-gray-700 opacity-60 hover:opacity-100 hover:bg-gray-800"
          }`}
        >
          {/* 미리보기 샘플 */}
          <span className={`inline-block w-3 h-3 rounded-sm ${m.previewBg} border border-gray-600`} />
          <span className="text-gray-200">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── 해석 목록 섹션 ────────────────────────────────────────

function InterpretationsSection({
  interpretations,
  sourceLang,
}: {
  interpretations: InterpretationData[];
  sourceLang: string;
}) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("normal");

  // 타겟 언어별로 그룹화
  const grouped = interpretations.reduce<Record<string, InterpretationData[]>>(
    (acc, item) => {
      const key = item.targetLanguage || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const displayStyles: Record<DisplayMode, { container: string; original: string; translated: string }> = {
    normal: {
      container: "bg-gray-800/50 border border-gray-800",
      original: "text-gray-200",
      translated: "text-indigo-300",
    },
    presentation: {
      container: "bg-black border border-gray-900",
      original: "text-gray-300",
      translated: "text-white font-medium",
    },
    highContrast: {
      container: "bg-black border border-gray-900",
      original: "text-gray-400",
      translated: "text-yellow-400 font-medium",
    },
  };

  const styles = displayStyles[displayMode];

  if (interpretations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">해석 내용</h3>
        <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
          <p className="text-gray-500 text-sm">해석 내용이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">
          해석 내용
          <span className="text-gray-500 font-normal ml-2">({interpretations.length}건)</span>
        </h3>
        <DisplayModeSelector mode={displayMode} onChange={setDisplayMode} />
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([lang, items]) => (
          <div key={lang}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2.5 py-0.5 rounded-full">
                {getLanguageName(sourceLang)} → {getLanguageName(lang)}
              </span>
              <span className="text-xs text-gray-600">({items.length}건)</span>
            </div>

            <div className="space-y-2">
              {items
                .sort((a, b) => a.sequence - b.sequence)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className={`rounded-lg p-3 transition-all duration-200 hover:border-gray-700 ${styles.container}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      {/* 시퀀스 번호 */}
                      <span className="text-xs font-mono text-gray-600 w-6 shrink-0 pt-0.5">
                        {String(item.sequence).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">원본</p>
                        <p className={`text-sm leading-relaxed ${styles.original}`}>{item.originalText}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700 ml-9">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">번역</p>
                        <p className={`text-sm leading-relaxed ${styles.translated}`}>{item.translatedText}</p>
                      </div>
                    </div>
                    {(item.startTimeMs !== null || item.endTimeMs !== null) && (
                      <div className="mt-2 ml-9 flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-600">
                          {item.startTimeMs !== null ? formatTimestamp(item.startTimeMs) : "00:00:00,00"}
                          {" → "}
                          {item.endTimeMs !== null ? formatTimestamp(item.endTimeMs) : "—"}
                        </span>
                        {item.isFinal && (
                          <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            최종
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 내보내기 섹션 ─────────────────────────────────────────

function ExportSection({
  interpretations,
  targetLangs,
  sourceLang,
  sessionName,
}: {
  interpretations: InterpretationData[];
  targetLangs: string[];
  sourceLang: string;
  sessionName: string;
}) {
  const [previewLang, setPreviewLang] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<SubtitleLanguage>("translated");
  const [previewFormat, setPreviewFormat] = useState<SubtitleFormat>("srt");

  // 타겟 언어별로 해석 그룹화
  const grouped = interpretations.reduce<Record<string, InterpretationData[]>>(
    (acc, item) => {
      const key = item.targetLanguage || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const exportableLangs = targetLangs.filter((lang) => grouped[lang]?.length > 0);

  if (exportableLangs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">내보내기</h3>
        <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500">내보내기할 해석 내용이 없습니다</p>
        </div>
      </div>
    );
  }

  const handleExport = (lang: string, mode: SubtitleLanguage, format: SubtitleFormat) => {
    const langData = grouped[lang] || [];
    const content = generateSubtitle(langData, mode, format);
    const langName = getLanguageName(lang);
    const modeLabel = mode === "original" ? "원본" : "번역";
    downloadFile(content, `${sessionName}_${langName}_${modeLabel}.${format}`);
  };

  const previewContent = previewLang
    ? generateSubtitle(grouped[previewLang] || [], previewMode, previewFormat)
    : "";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">내보내기</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        해석 내용을 SRT 또는 VTT 자막 파일로 내보내세요
      </p>

      <div className="space-y-3">
        {exportableLangs.map((lang) => (
          <div
            key={lang}
            className="rounded-lg border border-gray-800 bg-gray-800/50 transition-colors hover:border-gray-700"
          >
            <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
              <div>
                <p className="text-sm text-white">
                  {getLanguageName(sourceLang)} → {getLanguageName(lang)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {grouped[lang].length}개 항목
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setPreviewLang(previewLang === lang ? null : lang);
                    setPreviewMode("translated");
                    setPreviewFormat("srt");
                  }}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  미리보기
                </button>
                <button
                  onClick={() => handleExport(lang, "original", "srt")}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  원본 SRT
                </button>
                <button
                  onClick={() => handleExport(lang, "translated", "srt")}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  번역 SRT
                </button>
                <button
                  onClick={() => handleExport(lang, "original", "vtt")}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  원본 VTT
                </button>
                <button
                  onClick={() => handleExport(lang, "translated", "vtt")}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
                >
                  번역 VTT
                </button>
              </div>
            </div>

            {/* 자막 미리보기 */}
            {previewLang === lang && (
              <div className="border-t border-gray-700">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
                  {/* 언어 토글 */}
                  <button
                    onClick={() => setPreviewMode("original")}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      previewMode === "original"
                        ? "bg-gray-700 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    원본
                  </button>
                  <button
                    onClick={() => setPreviewMode("translated")}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      previewMode === "translated"
                        ? "bg-gray-700 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    번역
                  </button>
                  <span className="text-gray-700 text-xs">|</span>
                  {/* 형식 토글 */}
                  <button
                    onClick={() => setPreviewFormat("srt")}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      previewFormat === "srt"
                        ? "bg-gray-700 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    SRT
                  </button>
                  <button
                    onClick={() => setPreviewFormat("vtt")}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      previewFormat === "vtt"
                        ? "bg-gray-700 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    VTT
                  </button>
                </div>
                <pre className="px-4 pb-3 text-xs text-gray-400 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {previewContent.slice(0, 600)}{previewContent.length > 600 ? "\n..." : ""}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function SessionDetailPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [interpretations, setInterpretations] = useState<InterpretationData[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteAudioConfirm, setDeleteAudioConfirm] = useState(false);

  // ─── 오디오 Seek 관리 ──────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPositionMs, setCurrentPositionMs] = useState(0);

  const handleSeekToPosition = useCallback((positionMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = positionMs / 1000;
      // 일시 정지 중이면 자동 재생 시작
      if (audioRef.current.paused) {
        audioRef.current.play();
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) {
        router.push("/login");
        return;
      }

      // 세션 조회
      const { data: sessionRaw, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      const sessionData = sessionRaw as {
        id: string;
        project_id: string;
        status: string;
        started_at: string;
        ended_at: string | null;
        audio_file_path: string | null;
        audio_duration_ms: number | null;
      } | null;

      if (sessionError || !sessionData) {
        setError("세션을 찾을 수 없습니다");
        setLoading(false);
        return;
      }

      // 프로젝트 소유권 확인 및 프로젝트 정보 조회
      const { data: projectRaw, error: projectError } = await supabase
        .from("projects")
        .select("id, name, source_lang, target_lang, target_langs")
        .eq("id", sessionData.project_id)
        .eq("user_id", authSession.user.id)
        .single();

      const projectData = projectRaw as {
        id: string;
        name: string;
        source_lang: string;
        target_lang: string;
        target_langs?: string[];
      } | null;

      if (projectError || !projectData) {
        setError("프로젝트에 대한 접근 권한이 없습니다");
        setLoading(false);
        return;
      }

      setSession({
        id: sessionData.id,
        projectId: sessionData.project_id,
        status: sessionData.status,
        startedAt: sessionData.started_at,
        endedAt: sessionData.ended_at,
        audioFilePath: sessionData.audio_file_path,
        audioDurationMs: sessionData.audio_duration_ms,
      });

      const targetLangs: string[] =
        projectData.target_langs && Array.isArray(projectData.target_langs)
          ? projectData.target_langs
          : [projectData.target_lang];

      setProject({
        id: projectData.id,
        name: projectData.name,
        sourceLang: projectData.source_lang,
        targetLangs,
      });

      // 해석 조회 (최종 해석만)
      const { data: interpsRaw, error: interpError } = await supabase
        .from("interpretations")
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_final", true)
        .order("sequence", { ascending: true });

      const interps = interpsRaw as {
        id: string;
        original_text: string;
        translated_text: string;
        target_language: string | null;
        is_final: boolean;
        sequence: number;
        start_time_ms: number | null;
        end_time_ms: number | null;
        created_at: string;
      }[] | null;

      if (!interpError && interps) {
        setInterpretations(
          interps.map((row) => ({
            id: row.id,
            originalText: row.original_text,
            translatedText: row.translated_text,
            targetLanguage: row.target_language || "unknown",
            isFinal: row.is_final,
            sequence: row.sequence,
            startTimeMs: row.start_time_ms,
            endTimeMs: row.end_time_ms,
            createdAt: row.created_at,
          }))
        );
      }

      // 오디오 파일이 있으면 서명 URL 생성
      if (sessionData.audio_file_path) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("session-audio")
          .createSignedUrl(sessionData.audio_file_path, 3600);

        if (!signedError && signedData) {
          setAudioUrl(signedData.signedUrl);
        }
      }

      setLoading(false);
    } catch (err) {
      setError("데이터를 로드하는 중 오류가 발생했습니다");
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteAudio = async () => {
    if (!deleteAudioConfirm || !session?.audioFilePath) return;

    const supabase = createBrowserClient();

    await supabase.storage.from("session-audio").remove([session.audioFilePath]);

    await (supabase.from("sessions") as any)
      .update({ audio_file_path: null, audio_duration_ms: null })
      .eq("id", session.id);

    setAudioUrl(null);
    setSession((prev) =>
      prev ? { ...prev, audioFilePath: null, audioDurationMs: null } : prev
    );
    setDeleteAudioConfirm(false);
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${session?.id ?? "session"}_audio.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ─── 로딩 상태 ─────────────────────────────────────────
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ─── 에러 상태 ─────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/projects")}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            프로젝트 목록으로 돌아가기 →
          </button>
        </div>
      </div>
    );
  }

  if (!session || !project) return null;

  const sessionName = `세션_${session.startedAt.slice(0, 10)}`;

  // ─── 오디오 삭제 확인 모달 ───────────────────────────────
  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteAudioConfirm(false)} />
      <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h4 className="text-sm font-semibold text-white mb-2">녹음 파일 삭제</h4>
        <p className="text-sm text-gray-400 mb-4">
          이 행동은 되돌릴 수 없습니다. 녹음 파일이 영구적으로 삭제되겠습니다.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setDeleteAudioConfirm(false)}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            취소
          </button>
          <button
            onClick={handleDeleteAudio}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            삭제 확인
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* 삭제 확인 모달 */}
      {deleteAudioConfirm && <DeleteConfirmModal />}

      {/* 페이지 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{sessionName}</h1>
            <StatusBadge status={session.status} />
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-gray-500">{project.name}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-500">{formatDateLocal(session.startedAt)}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/projects/${project.id}/sessions`)}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800"
        >
          ← 뒤로
        </button>
      </div>

      {/* 세션 정보 카드 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">세션 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">상태</p>
            <StatusBadge status={session.status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">언어 방향</p>
            <p className="text-sm text-white">
              {getLanguageName(project.sourceLang)}
              <span className="text-gray-600 mx-1.5">→</span>
              {project.targetLangs.map((l) => getLanguageName(l)).join(", ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">재생 시간</p>
            <p className="text-sm text-white">
              {session.audioDurationMs
                ? formatDuration(session.audioDurationMs)
                : session.endedAt
                  ? formatDuration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime())
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">종료 시각</p>
            <p className="text-sm text-white">
              {session.endedAt ? formatDateLocal(session.endedAt) : "진행 중"}
            </p>
          </div>
        </div>
      </div>

      {/* 오디오 플레이어 + 타임라인 (Seek 지원) */}
      <AudioPlayerSection
        audioUrl={audioUrl}
        audioDurationMs={session.audioDurationMs}
        interpretations={interpretations}
        onDelete={() => setDeleteAudioConfirm(true)}
        onDownload={handleDownloadAudio}
        audioRef={audioRef}
        currentPositionMs={currentPositionMs}
        onPositionChange={setCurrentPositionMs}
        onSeekToPosition={handleSeekToPosition}
      />

      {/* 해석 목록 + 디스플레이 모드 */}
      <InterpretationsSection
        interpretations={interpretations}
        sourceLang={project.sourceLang}
      />

      {/* 내보내기 + 미리보기 */}
      <ExportSection
        interpretations={interpretations}
        targetLangs={project.targetLangs}
        sourceLang={project.sourceLang}
        sessionName={sessionName}
      />
    </div>
  );
}
