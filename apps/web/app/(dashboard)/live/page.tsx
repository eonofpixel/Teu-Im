"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { Project } from "@teu-im/shared";
import {
  startSoniox,
  stopSoniox,
  pauseSoniox,
  resumeSoniox,
  isSonioxActive,
  getMediaStream,
  type InterpretationResult,
} from "@/lib/soniox";
import { LiveWaveform } from "@/components/LiveWaveform";
import { SessionQRCode } from "@/components/SessionQRCode";
import { useAudiencePresence } from "@/hooks/useAudiencePresence";
import { AudienceCounter } from "@/components/AudienceCounter";

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

// ─── 타입 정의 ─────────────────────────────────────────────

interface LiveInterpretation {
  id: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isFinal: boolean;
  sequence: number;
  createdAt: string;
}

type RecordingStatus = "stopped" | "recording" | "paused";

// ─── 연결 상태 배지 ─────────────────────────────────────

function ConnectionStatusBadge({ connected, recording, paused }: { connected: boolean; recording: boolean; paused: boolean }) {
  if (paused) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-900/50 text-amber-400">
        일시정지
      </span>
    );
  }
  if (recording && connected) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-900/50 text-emerald-400">
        실시간 통역 중
      </span>
    );
  }
  if (recording && !connected) {
    return (
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-900/50 text-amber-400">
        연결 중...
      </span>
    );
  }
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400">
      대기 중
    </span>
  );
}

// ─── 프로젝트 선택 드롭다운 ────────────────────────────────

function ProjectSelector({
  projects,
  selectedProject,
  onChange,
  disabled,
}: {
  projects: Project[];
  selectedProject: Project | null;
  onChange: (project: Project | null) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        프로젝트 선택
      </label>
      <select
        value={selectedProject?.id ?? ""}
        onChange={(e) => {
          const proj = projects.find((p) => p.id === e.target.value) ?? null;
          onChange(proj);
        }}
        disabled={disabled || projects.length === 0}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">— 프로젝트를 선택해주세요 —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({getLanguageName(p.sourceLang)} →{" "}
            {(p.targetLangs?.length ? p.targetLangs : [p.targetLang])
              .map((l) => getLanguageName(l))
              .join(", ")})
          </option>
        ))}
      </select>
      {projects.length === 0 && (
        <p className="text-xs text-gray-500 mt-1.5">
          프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.
        </p>
      )}
    </div>
  );
}

// ─── 원문 / 번역 표시 영역 ────────────────────────────────

function TranscriptionPanel({
  label,
  lang,
  text,
  placeholder,
  accentColor,
}: {
  label: string;
  lang: string;
  text: string;
  placeholder: string;
  accentColor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${accentColor}`}>
          {getLanguageName(lang)}
        </span>
      </div>
      <div className="min-h-[120px] rounded-lg border border-gray-800 bg-gray-800/50 p-4 overflow-y-auto max-h-[240px]">
        {text ? (
          <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

// ─── 해석 기록 항목 ────────────────────────────────────────

function InterpretationItem({
  item,
  sourceLang,
}: {
  item: LiveInterpretation;
  sourceLang: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-gray-600">
          #{String(item.sequence).padStart(2, "0")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {getLanguageName(sourceLang)} →{" "}
            {getLanguageName(item.targetLanguage)}
          </span>
          {item.isFinal && (
            <span className="text-xs text-emerald-500 flex items-center gap-0.5">
              <svg
                className="w-2.5 h-2.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              최종
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-1">원문: {item.originalText}</p>
      <p className="text-sm text-indigo-300">{item.translatedText}</p>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function LivePage() {
  // ─── 프로젝트 목록 상태 ─────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // ─── 세션 상태 ──────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<"none" | "active" | "paused">("none");

  // ─── 녹음 및 Soniox 상태 ───────────────────────────────
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("stopped");
  const [sonioxConnected, setSonioxConnected] = useState(false);
  const [sonioxError, setSonioxError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // ─── 실시간 원문 / 번역 ─────────────────────────────────
  const [currentOriginalText, setCurrentOriginalText] = useState("");
  const [currentTranslatedText, setCurrentTranslatedText] = useState("");

  // ─── 해석 기록 ──────────────────────────────────────────
  const [interpretations, setInterpretations] =
    useState<LiveInterpretation[]>([]);
  const sequenceRef = useRef(1);
  const interpretationsPanelRef = useRef<HTMLDivElement>(null);

  // ─── 세션 생성 로딩 ─────────────────────────────────────
  const [creatingSession, setCreatingSession] = useState(false);

  // ─── 청중 공유 섹션 확장 상태 ──────────────────────────
  const [audienceShareOpen, setAudienceShareOpen] = useState(false);

  // ─── 청중 존재감 추적 (presenter는 수동 관찰 모드) ──────────
  const audiencePresence = useAudiencePresence({
    sessionId: activeSessionId,
    selectedLanguage: null,
    passive: true,
  });

  // ─── 세션 저장 ──────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ─── 프로젝트 목록 조회 ─────────────────────────────────
  const fetchProjects = useCallback(async () => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setProjectsLoading(false);
      return;
    }

    const { data } = await (supabase as any)
      .from("projects")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const mapped: Project[] = data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        code: row.code,
        password: row.password,
        sourceLang: row.source_lang as Project["sourceLang"],
        targetLang: row.target_lang as Project["targetLang"],
        targetLangs: (row.target_langs as string[]) || [row.target_lang],
        status: row.status as Project["status"],
        createdAt: row.created_at,
      }));
      setProjects(mapped);
    }

    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ─── 프로젝트 변경 시 상태 초기화 ──────────────────────
  const handleProjectChange = useCallback(
    (project: Project | null) => {
      if (recordingStatus === "recording" || recordingStatus === "paused") return;

      setSelectedProject(project);
      setActiveSessionId(null);
      setSessionStatus("none");
      setCurrentOriginalText("");
      setCurrentTranslatedText("");
      setInterpretations([]);
      sequenceRef.current = 1;
      setSaveError(null);
      setSaveSuccess(false);
      setSonioxError(null);
    },
    [recordingStatus]
  );

  // ─── 세션 생성 (API호출) ────────────────────────────────
  const createSession = useCallback(async (): Promise<string | null> => {
    if (!selectedProject) return null;

    const res = await fetch(`/api/projects/${selectedProject.id}/sessions`, {
      method: "POST",
    });

    if (res.ok) {
      const data = await res.json();
      return data.session?.id ?? null;
    }

    // 기존 활성 세션이 있는 경우 재사용
    if (res.status === 409) {
      const data = await res.json();
      return data.sessionId ?? null;
    }

    return null;
  }, [selectedProject]);

  // ─── 세션 종료 ──────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (!activeSessionId) return;

    await fetch(`/api/sessions/${activeSessionId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });

    setSessionStatus("none");
    setActiveSessionId(null);
  }, [activeSessionId]);

  // ─── Soniox 결과 핸들러 ─────────────────────────────────

  const handlePartialResult = useCallback((result: InterpretationResult) => {
    setCurrentOriginalText(result.originalText);
    setCurrentTranslatedText(result.translatedText);
  }, []);

  const handleFinalResult = useCallback((result: InterpretationResult) => {
    setCurrentOriginalText(result.originalText);
    setCurrentTranslatedText(result.translatedText);

    const newInterp: LiveInterpretation = {
      id: `soniox-${result.sequence}-${Date.now()}`,
      originalText: result.originalText,
      translatedText: result.translatedText,
      targetLanguage: result.targetLanguage,
      isFinal: true,
      sequence: result.sequence,
      createdAt: new Date().toISOString(),
    };

    setInterpretations((prev) => [...prev, newInterp]);
    sequenceRef.current = result.sequence;
  }, []);

  const handleSonioxError = useCallback((error: Error) => {
    console.error("Soniox error:", error);
    setSonioxError(error.message);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setSonioxConnected(connected);
    if (connected) {
      // 연결되면 미디어 스트림 가져오기
      setAudioStream(getMediaStream());
    } else {
      // 연결 해제되면 스트림 정리
      setAudioStream(null);
      if (recordingStatus === "recording" || recordingStatus === "paused") {
        setRecordingStatus("stopped");
        setSessionStatus("none");
      }
    }
  }, [recordingStatus]);

  // ─── 녹음 시작 (Soniox 연동) ───────────────────────────────
  const startRecording = useCallback(async () => {
    if (!selectedProject) return;

    // 세션 생성
    setCreatingSession(true);
    setSaveError(null);
    setSonioxError(null);
    const sessionId = await createSession();
    setCreatingSession(false);
    if (!sessionId) {
      setSaveError("세션을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setActiveSessionId(sessionId);
    setSessionStatus("active");
    setSaveError(null);
    setSaveSuccess(false);
    setCurrentOriginalText("");
    setCurrentTranslatedText("");
    setInterpretations([]);
    sequenceRef.current = 1;

    // Soniox 스트리밍 시작
    const targetLangs = selectedProject.targetLangs?.length
      ? selectedProject.targetLangs
      : [selectedProject.targetLang];
    const targetLang = targetLangs[0];

    try {
      await startSoniox({
        projectId: selectedProject.id,
        sessionId,
        sourceLanguage: selectedProject.sourceLang,
        targetLanguage: targetLang,
        onPartialResult: handlePartialResult,
        onFinalResult: handleFinalResult,
        onError: handleSonioxError,
        onConnectionChange: handleConnectionChange,
      });
      setRecordingStatus("recording");
    } catch (error) {
      console.error("Soniox 시작 실패:", error);
      setSonioxError(
        error instanceof Error
          ? error.message
          : "실시간 통역을 시작할 수 없습니다"
      );
      // 세션 정리
      await endSession();
    }
  }, [
    selectedProject,
    createSession,
    endSession,
    handlePartialResult,
    handleFinalResult,
    handleSonioxError,
    handleConnectionChange,
  ]);

  // ─── 녹음 중지 (Soniox 중지) ───────────────────────────────
  const stopRecording = useCallback(async () => {
    try {
      await stopSoniox();
    } catch (error) {
      console.error("Soniox 중지 오류:", error);
    }
    setRecordingStatus("stopped");
    setAudioStream(null);
  }, []);

  // ─── 녹음 일시정지 ─────────────────────────────────────
  const pauseRecording = useCallback(async () => {
    if (recordingStatus !== "recording") return;

    try {
      await pauseSoniox();
      setRecordingStatus("paused");
      setSessionStatus("paused");
    } catch (error) {
      console.error("Soniox 일시정지 오류:", error);
      setSonioxError(
        error instanceof Error
          ? error.message
          : "일시정지에 실패했습니다"
      );
    }
  }, [recordingStatus]);

  // ─── 녹음 재개 ──────────────────────────────────────────
  const resumeRecording = useCallback(async () => {
    if (recordingStatus !== "paused") return;

    try {
      await resumeSoniox();
      setRecordingStatus("recording");
      setSessionStatus("active");
    } catch (error) {
      console.error("Soniox 재개 오류:", error);
      setSonioxError(
        error instanceof Error
          ? error.message
          : "재개에 실패했습니다"
      );
    }
  }, [recordingStatus]);

  // ─── 세션 저장 ──────────────────────────────────────────
  const saveSession = useCallback(async () => {
    if (!activeSessionId || !selectedProject || interpretations.length === 0)
      return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const supabase = createBrowserClient();

      // 해석 기록 저장
      const interpsToSave = interpretations.map((item) => ({
        session_id: activeSessionId,
        original_text: item.originalText,
        translated_text: item.translatedText,
        target_language: item.targetLanguage,
        is_final: item.isFinal,
        sequence: item.sequence,
      }));

      const { error: interpError } = await (supabase as any)
        .from("interpretations")
        .insert(interpsToSave);

      if (interpError) {
        setSaveError(
          "해석 기록 저장에 실패했습니다: " + interpError.message
        );
        setSaving(false);
        return;
      }

      // 세션 종료
      await endSession();

      setSaveSuccess(true);
    } catch {
      setSaveError("세션 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [activeSessionId, selectedProject, interpretations, endSession]);

  // ─── 컴포넌트 마운트 해제 시 정리 ─────────────────────
  useEffect(() => {
    return () => {
      if (isSonioxActive()) {
        stopSoniox();
      }
    };
  }, []);

  // ─── 해석 기록 자동 스크롤 ──────────────────────────────
  useEffect(() => {
    if (interpretationsPanelRef.current) {
      interpretationsPanelRef.current.scrollTop =
        interpretationsPanelRef.current.scrollHeight;
    }
  }, [interpretations]);

  // ─── 버튼 활성화 조건 ─────────────────────────────────
  const isRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const isActiveOrPaused = isRecording || isPaused;
  const canSave =
    !isActiveOrPaused &&
    activeSessionId &&
    interpretations.length > 0 &&
    !saving &&
    !saveSuccess;
  const canStart =
    selectedProject &&
    !isActiveOrPaused &&
    !creatingSession &&
    sessionStatus !== "active";

  // ─── 키보드 단축키 ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스 중이면 단축키 비활성화
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (recordingStatus === "recording") {
          pauseRecording();
        } else if (recordingStatus === "paused") {
          resumeRecording();
        } else if (recordingStatus === "stopped" && canStart) {
          startRecording();
        }
      }

      if (e.key === "Escape" || e.code === "Escape") {
        e.preventDefault();
        if (recordingStatus === "recording" || recordingStatus === "paused") {
          stopRecording().then(() => {
            endSession();
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [recordingStatus, canStart, startRecording, pauseRecording, resumeRecording, stopRecording, endSession]);

  // ─── 로딩 스케leton ──────────────────────────────────
  if (projectsLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-7 w-16 bg-gray-800 rounded animate-pulse" />
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const sourceLang = selectedProject?.sourceLang ?? "ko";
  const targetLangs = selectedProject?.targetLangs?.length
    ? selectedProject.targetLangs
    : [selectedProject?.targetLang ?? "en"];
  const displayTargetLang = targetLangs[0];

  return (
    <div className="max-w-3xl space-y-4">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-white">실시간 통역</h1>
        <p className="text-sm text-gray-400 mt-1">
          웹에서 직접 통역 세션을 진행하세요
        </p>
      </div>

      {/* 프로젝트 선택 & 연결 상태 카드 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">세션 설정</h2>
          <ConnectionStatusBadge connected={sonioxConnected} recording={isRecording} paused={isPaused} />
        </div>

        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onChange={handleProjectChange}
          disabled={isActiveOrPaused}
        />

        {/* Soniox 오류 표시 */}
        {sonioxError && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
            {sonioxError}
          </p>
        )}

        {/* 사용 안내 */}
        {!isActiveOrPaused && selectedProject && (
          <p className="text-xs text-gray-500">
            녹음을 시작하면 마이크 권한을 요청합니다. Soniox API 키가 설정에서 등록되어 있어야 합니다.
          </p>
        )}
      </div>

      {/* 청중 공유 */}
      {selectedProject && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          {/* 토글 헤더 */}
          <button
            type="button"
            onClick={() => setAudienceShareOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-800/50"
            aria-expanded={audienceShareOpen}
          >
            <div className="flex items-center gap-2.5">
              {/* Share icon */}
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
                  d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-2-2l-6-6m0 0L8 12m4-6v12"
                />
              </svg>
              <h2 className="text-sm font-semibold text-white">청중 공유</h2>
            </div>
            {/* ChevronDown icon — rotated when open */}
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${audienceShareOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* 서브타이틀 (항상 표시) */}
          <p className="text-xs text-gray-500 px-6 pb-3">
            QR 코드 또는 코드를 공유하여 청중이 실시간 통역을 볼 수 있습니다
          </p>

          {/* 접기/펼치기 콘텐츠 — desktop 기본 전개, mobile 기본 접힘 */}
          {/* Mobile: audienceShareOpen 상태로 제어 / Desktop: 항상 열림 (sm:block) */}
          <div className={`${audienceShareOpen ? "block" : "hidden"} sm:block`}>
            <div className="px-4 pb-4">
              <SessionQRCode
                projectCode={selectedProject.code}
                password={selectedProject.password}
              />
            </div>
          </div>
        </div>
      )}

      {/* 청중 카운터 — 세션 활성 중에만 표시 */}
      <AudienceCounter
        presence={audiencePresence}
        visible={sessionStatus === "active" || sessionStatus === "paused"}
      />

      {/* 오디오 웨이브폼 */}
      <LiveWaveform
        stream={audioStream}
        isRecording={isRecording}
        className="rounded-xl border border-gray-800 bg-gray-900 p-4"
      />

      {/* 녹음 제어 버튼 행 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 시작 버튼 (stopped 상태) */}
          {recordingStatus === "stopped" && (
            <button
              onClick={startRecording}
              disabled={!canStart}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creatingSession ? (
                <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
              )}
              {creatingSession ? "세션 생성 중..." : "녹음 시작"}
            </button>
          )}

          {/* 재개 버튼 (paused 상태) */}
          {recordingStatus === "paused" && (
            <button
              onClick={resumeRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.8 6.2a.8.8 0 011.13-.13l4.2 3.8a.8.8 0 010 1.26l-4.2 3.8A.8.8 0 016.8 13.8V6.2z"
                  clipRule="evenodd"
                />
              </svg>
              재개
            </button>
          )}

          {/* 일시정지 버튼 (recording 상태) */}
          {recordingStatus === "recording" && (
            <button
              onClick={pauseRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-500"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              일시정지
            </button>
          )}

          {/* 중지 버튼 (recording 또는 paused 상태) */}
          {(recordingStatus === "recording" || recordingStatus === "paused") && (
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <span className="w-2.5 h-2.5 rounded bg-white" />
              중지
            </button>
          )}

          {/* 세션 저장 버튼 */}
          {activeSessionId && !isActiveOrPaused && (
            <button
              onClick={saveSession}
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2m-3-2h6"
                  />
                </svg>
              )}
              {saving ? "저장 중..." : "세션 저장"}
            </button>
          )}

          {/* 녹음 중 / 일시정지 표시 */}
          {isRecording && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="text-xs text-red-400 font-medium">
                녹음 중
              </span>
            </div>
          )}
          {isPaused && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-400 font-medium">
                일시정지
              </span>
            </div>
          )}
        </div>

        {/* 키보드 단축키 힌트 */}
        <p className="text-xs text-gray-600 mt-3">
          Space: 시작/중지, Esc: 종료
        </p>

        {/* 에러 메시지 */}
        {saveError && (
          <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2 mt-3">
            {saveError}
          </p>
        )}

        {/* 저장 성공 메시지 */}
        {saveSuccess && (
          <p className="text-sm text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2 mt-3">
            세션이 저장되었습니다! 프로젝트 세션 목록에서 확인할 수 있습니다.
          </p>
        )}
      </div>

      {/* 원문 표시 영역 */}
      <TranscriptionPanel
        label="원문"
        lang={sourceLang}
        text={currentOriginalText}
        placeholder="녹음을 시작하면 실시간 원문이 표시되겠습니다..."
        accentColor="bg-indigo-900/40 text-indigo-400"
      />

      {/* 번역 표시 영역 */}
      <TranscriptionPanel
        label="번역"
        lang={displayTargetLang}
        text={currentTranslatedText}
        placeholder="실시간 번역 결과가 여기에 표시되겠습니다..."
        accentColor="bg-emerald-900/40 text-emerald-400"
      />

      {/* 해석 기록 목록 */}
      {interpretations.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            해석 기록
            <span className="text-gray-500 font-normal ml-2">
              ({interpretations.length}건)
            </span>
          </h3>
          <div
            ref={interpretationsPanelRef}
            className="space-y-2 max-h-[300px] overflow-y-auto pr-1"
          >
            {interpretations.map((item) => (
              <InterpretationItem
                key={item.id}
                item={item}
                sourceLang={sourceLang}
              />
            ))}
          </div>
        </div>
      )}

      {/* 다중 언어 지원 시 타겟 언어 표시 */}
      {targetLangs.length > 1 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs text-gray-500 mb-2">타겟 언어</p>
          <div className="flex flex-wrap gap-2">
            {targetLangs.map((lang) => (
              <span
                key={lang}
                className="text-xs px-2.5 py-1 rounded-full bg-indigo-900/40 text-indigo-400"
              >
                {getLanguageName(lang)}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            현재 첫 번째 타겟 언어({getLanguageName(targetLangs[0])})로 번역됩니다.
            다중 언어 동시 통역은 Soniox API 실제 연동 시 지원됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
