"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { Project } from "@teu-im/shared";

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

type MicStatus = "idle" | "requesting" | "granted" | "denied";
type RecordingStatus = "stopped" | "recording";

// ─── 마이크 상태 배지 ─────────────────────────────────────

function MicStatusBadge({ status }: { status: MicStatus }) {
  const styles: Record<string, string> = {
    idle: "bg-gray-800 text-gray-400",
    requesting: "bg-amber-900/50 text-amber-400",
    granted: "bg-emerald-900/50 text-emerald-400",
    denied: "bg-red-900/50 text-red-400",
  };
  const labels: Record<string, string> = {
    idle: "마이크 준비",
    requesting: "권한 요청 중",
    granted: "마이크 준비 완료",
    denied: "마이크 권한 거부",
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {labels[status]}
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
  const [sessionStatus, setSessionStatus] = useState<"none" | "active">("none");

  // ─── 마이크 및 录음 상태 ───────────────────────────────
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("stopped");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("projects")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (recordingStatus !== "stopped") return;

      setSelectedProject(project);
      setActiveSessionId(null);
      setSessionStatus("none");
      setCurrentOriginalText("");
      setCurrentTranslatedText("");
      setInterpretations([]);
      sequenceRef.current = 1;
      setSaveError(null);
      setSaveSuccess(false);
    },
    [recordingStatus]
  );

  // ─── 마이크 권한 요청 ──────────────────────────────────
  const requestMicPermission = useCallback(async () => {
    setMicStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }
  }, []);

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

  // ─── 모의 실시간 통역 (Placeholder) ─────────────────────
  // Soniox 실제 연동은 별도 구현. 여기서는 모의 원문/번역 텍스트를
  // 주기적으로 생성하여 실시간 UI 동작을 보여줍니다.

  const mockInterpretation = useCallback(() => {
    const sourceLang = selectedProject?.sourceLang ?? "ko";
    const targetLangs = selectedProject?.targetLangs?.length
      ? selectedProject.targetLangs
      : [selectedProject?.targetLang ?? "en"];

    const mockOriginals = [
      "안녕하세요, 오늘의 발표를 시작하겠습니다.",
      "이 프로젝트의 주요 목표는 실시간 통역 기능을 구현하는 것입니다.",
      "우리는 웹과 모바일 플랫폼을 지원합니다.",
      "다음 단계로는 Soniox API와의 실제 연동을 진행할 예정입니다.",
      "질문이 있으시면 언제든지 말씀해 주세요.",
    ];

    const mockTranslations: Record<string, string[]> = {
      en: [
        "Hello, let me begin today's presentation.",
        "The main goal of this project is to implement real-time interpretation functionality.",
        "We support both web and mobile platforms.",
        "The next step will be to integrate with the actual Soniox API.",
        "Please feel free to ask any questions at any time.",
      ],
      ja: [
        "こんにちは、本日のプレゼンテーションを開始いたします。",
        "このプロジェクトの主な目標は、リアルタイム翻訳機能を実装することです。",
        "ウェブとモバイルプラットフォームをサポートしています。",
        "次のステップでは、実際のSoniox APIとの統合を進めます。",
        "いつでもご質問ください。",
      ],
    };

    const targetLang = targetLangs[0];
    const translations =
      mockTranslations[targetLang] ?? mockTranslations["en"];
    const idx = (sequenceRef.current - 1) % mockOriginals.length;

    const original = mockOriginals[idx];
    const translated = translations[idx];

    setCurrentOriginalText(original);
    setCurrentTranslatedText(translated);

    const newInterp: LiveInterpretation = {
      id: `mock-${sequenceRef.current}-${Date.now()}`,
      originalText: original,
      translatedText: translated,
      targetLanguage: targetLang,
      isFinal: true,
      sequence: sequenceRef.current,
      createdAt: new Date().toISOString(),
    };

    setInterpretations((prev) => [...prev, newInterp]);
    sequenceRef.current += 1;
  }, [selectedProject]);

  // ─── 녹음 시작 ──────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!selectedProject || !streamRef.current) return;

    // 세션 생성
    setCreatingSession(true);
    setSaveError(null);
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

    // MediaRecorder 설정
    const supportedMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      ...(supportedMimeType ? { mimeType: supportedMimeType } : {}),
    });

    mediaRecorder.ondataavailable = () => {
      // 실제 Soniox 연동 시 여기서 오디오 청크를 전송합니다
    };

    mediaRecorder.start(1000); // 1초 간격 청크
    mediaRecorderRef.current = mediaRecorder;
    setRecordingStatus("recording");

    // 첫 번째 모의 통역 즉시 실행
    mockInterpretation();

    // 3초 간격으로 모의 통역 실행
    mockIntervalRef.current = setInterval(() => {
      mockInterpretation();
    }, 3000);
  }, [selectedProject, createSession, mockInterpretation]);

  // ─── 녹음 중지 ──────────────────────────────────────────
  const stopRecording = useCallback(() => {
    // 모의 통역 인터벌 중지
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    // MediaRecorder 중지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setRecordingStatus("stopped");
  }, []);

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
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
  const canSave =
    !isRecording &&
    activeSessionId &&
    interpretations.length > 0 &&
    !saving &&
    !saveSuccess;
  const canStart =
    selectedProject &&
    micStatus === "granted" &&
    !isRecording &&
    !creatingSession &&
    sessionStatus !== "active";

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

      {/* 프로젝트 선택 & 마이크 상태 카드 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">세션 설정</h2>
          <MicStatusBadge status={micStatus} />
        </div>

        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onChange={handleProjectChange}
          disabled={isRecording}
        />

        {/* 마이크 권한 요청 버튼 */}
        {(micStatus === "idle" || micStatus === "denied") && (
          <button
            onClick={requestMicPermission}
            className="w-full rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <span className="mr-1.5">🎤</span>
            {micStatus === "denied"
              ? "마이크 권한 다시 요청"
              : "마이크 권한 요청"}
          </button>
        )}

        {/* 권한 요청 중 표시 */}
        {micStatus === "requesting" && (
          <p className="text-xs text-amber-400 text-center animate-pulse">
            마이크 권한을 요청 중입니다...
          </p>
        )}
      </div>

      {/* 录음 제어 버튼 행 */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 시작/중지 토글 버튼 */}
          {!isRecording ? (
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
          ) : (
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              <span className="w-2.5 h-2.5 rounded bg-white" />
              중지
            </button>
          )}

          {/* 세션 저장 버튼 */}
          {activeSessionId && !isRecording && (
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

          {/* 녹음 중 표시 */}
          {isRecording && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="text-xs text-red-400 font-medium">
                녹음 중
              </span>
            </div>
          )}
        </div>

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
