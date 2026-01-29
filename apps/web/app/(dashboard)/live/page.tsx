"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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

// ─── 상태 인디케이터 ────────────────────────────────────
function StatusDot({ status }: { status: 'idle' | 'connecting' | 'active' | 'paused' }) {
  const colors = {
    idle: 'bg-gray-500',
    connecting: 'bg-amber-500 animate-pulse',
    active: 'bg-emerald-500',
    paused: 'bg-amber-500',
  };

  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />;
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

// ─── 상태 텍스트 ─────────────────────────────────────
function getStatusText(connected: boolean, recording: boolean, paused: boolean): string {
  if (paused) return '일시정지';
  if (recording && connected) return '통역 중';
  if (recording && !connected) return '연결 중...';
  return '대기 중';
}

function getStatusType(connected: boolean, recording: boolean, paused: boolean): 'idle' | 'connecting' | 'active' | 'paused' {
  if (paused) return 'paused';
  if (recording && connected) return 'active';
  if (recording && !connected) return 'connecting';
  return 'idle';
}

// ─── 프로젝트 헤더 (단일 프로젝트 또는 선택된 프로젝트) ──────

function ProjectHeader({ project }: { project: Project }) {
  const targetLangs = project.targetLangs?.length
    ? project.targetLangs
    : [project.targetLang];

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-white truncate">{project.name}</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {getLanguageName(project.sourceLang)} → {targetLangs.map((l) => getLanguageName(l)).join(", ")}
        </p>
      </div>
    </div>
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
      <label className="block text-xs font-medium text-gray-500 mb-2">
        프로젝트
      </label>
      <select
        value={selectedProject?.id ?? ""}
        onChange={(e) => {
          const proj = projects.find((p) => p.id === e.target.value) ?? null;
          onChange(proj);
        }}
        disabled={disabled || projects.length === 0}
        className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">프로젝트를 선택해주세요</option>
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
        <p className="text-xs text-gray-600 mt-2">
          프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.
        </p>
      )}
    </div>
  );
}

// ─── 원문 / 번역 표시 영역 (단순화) ────────────────────────

function TranscriptionPanel({
  label,
  lang,
  text,
  placeholder,
}: {
  label: string;
  lang: string;
  text: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium text-gray-500">{label}</h3>
        <span className="text-xs text-gray-600">
          {getLanguageName(lang)}
        </span>
      </div>
      <div className="min-h-[100px] rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5 overflow-y-auto max-h-[200px]">
        {text ? (
          <p className="text-base leading-relaxed text-white whitespace-pre-wrap">
            {text}
          </p>
        ) : (
          <p className="text-sm text-gray-600">{placeholder}</p>
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
  // ─── URL params ─────────────────────────────────────────
  const searchParams = useSearchParams();
  const preselectedProjectId = searchParams.get('projectId');

  // ─── 프로젝트 목록 상태 ─────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // ─── API 키 상태 ────────────────────────────────────────
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

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

      // Auto-select project if provided in URL
      if (preselectedProjectId) {
        const preselected = mapped.find(p => p.id === preselectedProjectId);
        if (preselected) {
          setSelectedProject(preselected);
        }
      }
    }

    setProjectsLoading(false);
  }, [preselectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ─── API 키 확인 ────────────────────────────────────────
  useEffect(() => {
    const checkApiKey = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await (supabase as any)
        .from("users")
        .select("soniox_api_key")
        .eq("id", user.id)
        .single();

      setHasApiKey(!!data?.soniox_api_key);
    };
    checkApiKey();
  }, []);

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

    try {
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
        return data.sessionId ?? data.details?.sessionId ?? null;
      }

      // 에러 응답 파싱
      const errorData = await res.json().catch(() => ({}));
      const errorMessage = errorData.error || `API 오류 (${res.status})`;
      console.error("세션 생성 실패:", res.status, errorData);
      setSaveError(errorMessage);
      return null;
    } catch (error) {
      console.error("세션 생성 네트워크 오류:", error);
      setSaveError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인하세요.");
      return null;
    }
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
    setSonioxError(null);
    const sessionId = await createSession();
    setCreatingSession(false);
    if (!sessionId) {
      // Error already set by createSession
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

  // ─── 프로젝트 자동 선택 (단일 프로젝트일 경우) ─────────────
  useEffect(() => {
    if (!projectsLoading && projects.length === 1 && !selectedProject && !preselectedProjectId) {
      setSelectedProject(projects[0]);
    }
  }, [projectsLoading, projects, selectedProject, preselectedProjectId]);

  // ─── 로딩 스케leton ──────────────────────────────────
  if (projectsLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="h-8 w-32 bg-gray-800 rounded-xl animate-pulse" />
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 space-y-4">
          <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
          <div className="h-12 w-full bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const sourceLang = selectedProject?.sourceLang ?? "ko";
  const targetLangs = selectedProject?.targetLangs?.length
    ? selectedProject.targetLangs
    : [selectedProject?.targetLang ?? "en"];
  const displayTargetLang = targetLangs[0];

  // ─── 상태 파생 ────────────────────────────────────────
  const statusType = getStatusType(sonioxConnected, isRecording, isPaused);
  const statusText = getStatusText(sonioxConnected, isRecording, isPaused);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* API 키 경고 배너 (최상단) */}
      {hasApiKey === false && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-200">Soniox API 키가 필요합니다</h3>
              <p className="text-sm text-amber-200/70 mt-1 mb-3">
                실시간 통역을 시작하려면 먼저 설정에서 API 키를 등록해야 합니다.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                설정으로 이동
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 헤더 (자동 선택 또는 URL 프리셋) */}
      {selectedProject && (projects.length === 1 || preselectedProjectId) && (
        <div className="flex items-center justify-between">
          <ProjectHeader project={selectedProject} />
          {preselectedProjectId && (
            <Link
              href="/projects"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              프로젝트 목록
            </Link>
          )}
        </div>
      )}

      {/* 프로젝트 선택 드롭다운 (다중 프로젝트 & URL 프리셋 없음) */}
      {!selectedProject && projects.length > 1 && !preselectedProjectId && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <ProjectSelector
            projects={projects}
            selectedProject={selectedProject}
            onChange={handleProjectChange}
            disabled={isActiveOrPaused}
          />
        </div>
      )}

      {/* 프로젝트 없음 안내 */}
      {projects.length === 0 && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">프로젝트가 없습니다</h3>
          <p className="text-sm text-gray-500 mb-4">
            먼저 프로젝트를 생성해주세요
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            프로젝트 만들기
          </Link>
        </div>
      )}


      {/* 메인 통역 제어 영역 */}
      {selectedProject && (
        <div className="rounded-3xl border border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-gray-900/30 p-8">
          {/* 상태 표시 */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <StatusDot status={statusType} />
            <span className="text-sm font-medium text-gray-400">{statusText}</span>
          </div>

          {/* Soniox 오류 표시 */}
          {sonioxError && (
            <div className="mb-6 rounded-xl bg-red-900/20 border border-red-500/20 p-4">
              <p className="text-sm text-red-400 text-center">
                {sonioxError}
              </p>
            </div>
          )}

          {/* 저장 성공/에러 메시지 */}
          {saveSuccess && (
            <div className="mb-6 rounded-xl bg-emerald-900/20 border border-emerald-500/20 p-4">
              <p className="text-sm text-emerald-400 text-center">
                세션이 저장되었습니다!
              </p>
            </div>
          )}
          {saveError && (
            <div className="mb-6 rounded-xl bg-red-900/20 border border-red-500/20 p-4">
              <p className="text-sm text-red-400 text-center">
                {saveError}
              </p>
            </div>
          )}

          {/* 큰 원형 녹음 버튼 (Hero Element) */}
          <div className="flex flex-col items-center gap-6 mb-6">
            {recordingStatus === "stopped" && (
              <button
                onClick={startRecording}
                disabled={!canStart || creatingSession}
                className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-indigo-500/50 disabled:shadow-none flex items-center justify-center"
              >
                {creatingSession ? (
                  <div className="w-6 h-6 rounded-full border-3 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-10 h-10 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}

            {recordingStatus === "recording" && (
              <button
                onClick={pauseRecording}
                className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-amber-500 hover:to-amber-600 transition-all duration-300 shadow-lg shadow-emerald-500/50 hover:shadow-amber-500/50 flex items-center justify-center animate-pulse"
              >
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {recordingStatus === "paused" && (
              <button
                onClick={resumeRecording}
                className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 hover:from-emerald-500 hover:to-emerald-600 transition-all duration-300 shadow-lg shadow-amber-500/50 hover:shadow-emerald-500/50 flex items-center justify-center"
              >
                <svg className="w-10 h-10 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {/* 버튼 라벨 */}
            <p className="text-sm font-medium text-gray-500">
              {creatingSession && "세션 생성 중..."}
              {!creatingSession && recordingStatus === "stopped" && "눌러서 통역 시작"}
              {recordingStatus === "recording" && "눌러서 일시정지"}
              {recordingStatus === "paused" && "눌러서 재개"}
            </p>
          </div>

          {/* 부가 액션 버튼 */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* 중지 버튼 */}
            {(recordingStatus === "recording" || recordingStatus === "paused") && (
              <button
                onClick={stopRecording}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <span className="w-2 h-2 rounded bg-current" />
                중지
              </button>
            )}

            {/* 세션 저장 버튼 */}
            {activeSessionId && !isActiveOrPaused && interpretations.length > 0 && (
              <button
                onClick={saveSession}
                disabled={!canSave}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? "저장 중..." : "세션 저장"}
              </button>
            )}
          </div>

          {/* 키보드 힌트 */}
          <p className="text-xs text-gray-600 text-center mt-6">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Space</kbd> 시작/일시정지 • <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> 중지
          </p>
        </div>
      )}

      {/* 오디오 웨이브폼 (녹음 중에만 표시) */}
      {isRecording && audioStream && (
        <LiveWaveform
          stream={audioStream}
          isRecording={isRecording}
          className="rounded-2xl border border-gray-800/50 bg-gray-900/30 p-6"
        />
      )}

      {/* 청중 카운터 (세션 활성 중에만 표시) */}
      {(sessionStatus === "active" || sessionStatus === "paused") && (
        <AudienceCounter
          presence={audiencePresence}
          visible={true}
        />
      )}

      {/* 실시간 텍스트 표시 (녹음 중이거나 텍스트가 있을 때만) */}
      {(isRecording || currentOriginalText || currentTranslatedText) && (
        <div className="space-y-4">
          <TranscriptionPanel
            label="원문"
            lang={sourceLang}
            text={currentOriginalText}
            placeholder="음성 인식 대기 중..."
          />

          <TranscriptionPanel
            label="번역"
            lang={displayTargetLang}
            text={currentTranslatedText}
            placeholder="번역 대기 중..."
          />
        </div>
      )}

      {/* 청중 공유 섹션 (접기/펼치기) */}
      {selectedProject && (
        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setAudienceShareOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-800/30"
            aria-expanded={audienceShareOpen}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <div>
                <h2 className="text-sm font-semibold text-white">청중과 공유</h2>
                <p className="text-xs text-gray-600 mt-0.5">QR 코드로 실시간 통역 제공</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${audienceShareOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {audienceShareOpen && (
            <div className="px-6 pb-6 pt-2">
              <SessionQRCode
                projectCode={selectedProject.code}
                password={selectedProject.password}
              />
            </div>
          )}
        </div>
      )}

      {/* 해석 기록 목록 (접기/펼치기) */}
      {interpretations.length > 0 && (
        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">
            해석 기록 <span className="text-gray-600 font-normal">({interpretations.length})</span>
          </h3>
          <div
            ref={interpretationsPanelRef}
            className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
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

      {/* 다중 언어 안내 */}
      {targetLangs.length > 1 && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-indigo-200 mb-2">
                현재 <strong>{getLanguageName(targetLangs[0])}</strong>로 번역 중입니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {targetLangs.map((lang) => (
                  <span
                    key={lang}
                    className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300"
                  >
                    {getLanguageName(lang)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
