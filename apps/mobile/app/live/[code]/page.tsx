"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useRealtimeSession } from "@/hooks/useRealtimeSession";
import TranscriptionView from "@/components/TranscriptionView";
import ConnectionStatus from "@/components/ConnectionStatus";
import type { Project, Session } from "@teu-im/shared";

// ─── Language label helpers ──────────────────────────────────────────────────

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

// ─── Language Selector ───────────────────────────────────────────────────────

interface LanguageSelectorProps {
  languages: string[];
  selected: string | null;
  onSelect: (lang: string | null) => void;
}

function LanguageSelector({ languages, selected, onSelect }: LanguageSelectorProps) {
  if (languages.length <= 1) return null; // Single language — no selector needed

  return (
    <div
      className="shrink-0 px-3 py-2 flex gap-2 overflow-x-auto"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* "전체" pill */}
      <button
        onClick={() => onSelect(null)}
        className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95"
        style={{
          background: selected === null ? "var(--color-accent)" : "var(--color-bg-tertiary)",
          color: selected === null ? "#fff" : "var(--color-text-muted)",
          border: selected === null ? "none" : "1px solid var(--color-border)",
        }}
      >
        전체
      </button>

      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onSelect(lang)}
          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95"
          style={{
            background: selected === lang ? "var(--color-accent)" : "var(--color-bg-tertiary)",
            color: selected === lang ? "#fff" : "var(--color-text-muted)",
            border: selected === lang ? "none" : "1px solid var(--color-border)",
          }}
        >
          {getLangLabel(lang)}
        </button>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LivePage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // ─── Project & session initialization ──────────────────────────────────

  useEffect(() => {
    const initProject = async () => {
      try {
        const supabase = getSupabaseClient();
        const upperCode = code.toUpperCase();

        const projectResult = await supabase
          .from("projects")
          .select("id, name, code, status, source_lang, target_lang, target_langs, created_at")
          .eq("code", upperCode)
          .single();

        const projectData = projectResult.data as {
          id: string;
          name: string;
          code: string;
          status: string;
          source_lang: string;
          target_lang: string;
          target_langs: string[] | null;
          created_at: string;
        } | null;
        const projectError = projectResult.error;

        if (projectError || !projectData) {
          setInitError("프로젝트를 찾을 수 없습니다. 홈으로 돌아가고 다시 시도하세요.");
          return;
        }

        setProject({
          id: projectData.id,
          userId: "",
          name: projectData.name,
          code: projectData.code,
          password: "",
          sourceLang: projectData.source_lang as Project["sourceLang"],
          targetLang: projectData.target_lang as Project["targetLang"],
          targetLangs: projectData.target_langs ?? [],
          status: projectData.status as Project["status"],
          createdAt: projectData.created_at,
        });

        const sessionResult = await supabase
          .from("sessions")
          .select("id, project_id, status, started_at, ended_at")
          .eq("project_id", projectData.id)
          .eq("status", "active")
          .order("started_at", { ascending: false })
          .limit(1)
          .single();

        const sessionData = sessionResult.data as {
          id: string;
          project_id: string;
          status: string;
          started_at: string;
          ended_at: string | null;
        } | null;
        const sessionError = sessionResult.error;

        if (sessionData && !sessionError) {
          setSession({
            id: sessionData.id,
            projectId: sessionData.project_id,
            status: sessionData.status as Session["status"],
            startedAt: sessionData.started_at,
            endedAt: sessionData.ended_at ?? undefined,
          });
        }
      } catch (err) {
        console.error("프로젝트 초기화 오류:", err);
        setInitError("프로젝트 정보를 가져오는 데 오류가 발생했습니다.");
      } finally {
        setIsInitializing(false);
      }
    };

    initProject();
  }, [code]);

  // ─── Realtime hook ─────────────────────────────────────────────────────

  const {
    interpretations,
    availableLanguages,
    selectedLanguage,
    setSelectedLanguage,
    connectionStatus,
    isLoading,
    error: realtimeError,
    bottomRef,
  } = useRealtimeSession(session?.id ?? null);

  const handleLeave = () => {
    router.push("/");
  };

  // ─── Loading state ─────────────────────────────────────────────────────

  if (isInitializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 safe-area-bottom">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-30" />
          <svg
            className="w-10 h-10 animate-spin text-indigo-500 relative"
            fill="none"
            viewBox="0 0 24 24"
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
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
        <p className="text-sm animate-fade-in" style={{ color: "var(--color-text-muted)" }}>
          행사 정보 로드 중...
        </p>
      </div>
    );
  }

  // ─── Init error ────────────────────────────────────────────────────────

  if (initError || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center safe-area-bottom">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 animate-scale-in"
          style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: "var(--color-error)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9.303 3.376c-.866 1.5-2.747 2.847-5.577 3.724-.279.09-.58.165-.89.226C20.531 20.726 22 16.594 22 12.423c0-5.391-4.582-9.744-10.228-9.744-5.646 0-10.228 4.353-10.228 9.744 0 4.171 1.469 8.303 5.721 8.274.31-.061.611-.136.89-.226-2.83-.877-4.711-2.224-5.577-3.724"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>
          연결 실패
        </h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--color-text-muted)" }}>
          {initError ?? "프로젝트를 찾을 수 없습니다."}
        </p>
        <button
          onClick={handleLeave}
          className="px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // ─── Main live view ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header
        className="shrink-0 px-4 py-3.5"
        style={{
          background: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
              {project.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono" style={{ color: "var(--color-text-disabled)" }}>
                {project.code}
              </span>
              {/* Language badge — show multi-lang indicator if applicable */}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-accent-glow)",
                  color: "var(--color-accent)",
                }}
              >
                {project.sourceLang.toUpperCase()}
                {availableLanguages.length > 1
                  ? ` → ${availableLanguages.length}개 언어`
                  : ` → ${project.targetLang.toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* Leave button */}
          <button
            onClick={handleLeave}
            className="ml-3 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              color: "var(--color-text-muted)",
              background: "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-tertiary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            aria-label="나가기"
          >
            <svg
              className="w-4.5 h-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Connection status indicator */}
      <div className="shrink-0 px-3 py-2" style={{ background: "var(--color-bg-primary)" }}>
        <ConnectionStatus
          status={session ? connectionStatus : "waiting"}
          projectStatus={project.status}
        />
      </div>

      {/* Realtime error banner */}
      {realtimeError && (
        <div
          className="shrink-0 mx-3 mt-1 px-3 py-2 rounded-lg flex items-center gap-2 animate-slide-up"
          style={{
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
          }}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ color: "var(--color-warning)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c.866 1.5 2.747 2.847 5.577 3.724.279.09.58.165.89.226C9.469 20.726 8 16.594 8 12.423c0-5.391 4.582-9.744 10.228-9.744 1.41 0 2.744.306 3.938.858M12 9a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-xs" style={{ color: "var(--color-warning)" }}>
            {realtimeError}
          </p>
        </div>
      )}

      {/* Language selector — visible only for multi-language sessions */}
      <LanguageSelector
        languages={availableLanguages}
        selected={selectedLanguage}
        onSelect={setSelectedLanguage}
      />

      {/* Realtime transcription scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <TranscriptionView interpretations={interpretations} />
        {/* Auto-scroll sentinel */}
        <div ref={bottomRef} />
      </div>

      {/* Bottom safe area padding */}
      <div className="safe-area-bottom" />
    </div>
  );
}
