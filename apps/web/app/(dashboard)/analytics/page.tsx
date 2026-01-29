"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

// ─── 타입 정의 ──────────────────────────────────────────────

interface ProjectRow {
  id: string;
  name: string;
  source_lang: string;
  target_lang: string;
  target_langs?: string[];
  created_at: string;
  status: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  started_at: string;
  ended_at: string | null;
  audio_duration_ms: number | null;
  status: string;
}

interface InterpretationRow {
  id: string;
  session_id: string;
  target_language: string | null;
  original_text: string;
  translated_text: string;
  created_at: string;
}

interface OverallStats {
  totalProjects: number;
  totalSessions: number;
  totalDurationMs: number;
  supportedLanguages: string[];
  totalInterpretations: number;
}

interface RecentActivity {
  sessionId: string;
  projectId: string;
  projectName: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  interpretationCount: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  sourceLang: string;
  targetLangs: string[];
  sessionCount: number;
  totalDurationMs: number;
  lastActivityAt: string;
  status: string;
}

// ─── 유틸 함수 ──────────────────────────────────────────────

function formatDurationHours(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "방금 전";
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}월 전`;
}

function formatDateLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  ar: "아랑어",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// ─── 아이콘 컴포넌트 ───────────────────────────────────────

function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5.26c.026-.836.214-1.623.547-2.338m.518-1.045A6.959 6.959 0 0112 5c2.46 0 4.637 1.219 5.975 3.117m0 0c.333.715.521 1.502.547 2.338h2.205M3.055 11a8.96 8.96 0 011.522-2.338M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25a1.125 1.125 0 01-1.125-1.125v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function DocumentTextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h12m-12-8h12m-12 12h12a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

// ─── 상태 배지 ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-900/50 text-emerald-400",
    paused: "bg-amber-900/50 text-amber-400",
    completed: "bg-indigo-900/50 text-indigo-400",
    ended: "bg-gray-800 text-gray-500",
    idle: "bg-gray-800 text-gray-400",
  };
  const labels: Record<string, string> = {
    active: "진행 중",
    paused: "일시 정지",
    completed: "완료",
    ended: "종료",
    idle: "대기",
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.ended}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── 로딩 스켱레톤 ─────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="h-7 w-16 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-800 rounded mt-2 animate-pulse" />
      </div>

      {/* 스탯 카드 스켱레톤 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 bg-gray-800 rounded-lg" />
              <div className="h-3 w-20 bg-gray-800 rounded" />
            </div>
            <div className="h-7 w-16 bg-gray-800 rounded" />
            <div className="h-3 w-24 bg-gray-800 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* 최근 활동 스켱레톤 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-5 w-24 bg-gray-800 rounded animate-pulse" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-40 bg-gray-800 rounded" />
                <div className="h-4 w-16 bg-gray-800 rounded" />
              </div>
              <div className="h-3 w-32 bg-gray-800 rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-28 bg-gray-800 rounded animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4 animate-pulse">
              <div className="h-4 w-36 bg-gray-800 rounded" />
              <div className="h-3 w-28 bg-gray-800 rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 빈 상태 ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">분석</h1>
        <p className="text-sm text-gray-400 mt-1">전체 프로젝트 및 세션 분석 개요</p>
      </div>

      {/* 빈 스탯 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "총 프로젝트", value: "0", icon: <FolderIcon />, accent: "indigo" },
          { label: "총 세션", value: "0", icon: <SessionsIcon />, accent: "emerald" },
          { label: "총 통역 시간", value: "0m", icon: <ClockIcon />, accent: "amber" },
          { label: "지원 언어", value: "0", icon: <GlobeIcon />, accent: "violet" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.accent}-900/30 text-${stat.accent}-400`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-500">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 유도 */}
      <div className="rounded-xl border border-dashed border-gray-700 p-16 text-center">
        <div className="mx-auto w-24 h-24 rounded-2xl bg-gray-800/80 flex items-center justify-center mb-6">
          <BarChartIcon />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">분석 데이터가 없습니다</h3>
        <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
          프로젝트를 생성하고 세션을 시작하면 여기서 전체 개요를 확인할 수 있습니다.
        </p>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          첫 프로젝트 만들기
        </Link>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([]);

  const fetchData = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      if (!isRetry) {
        setError(null);
      }

      const supabase = createBrowserClient();

      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("요청 시간이 초과되었습니다")), 15000)
      );

      const sessionPromise = supabase.auth.getSession();
      const { data: { session: authSession } } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as Awaited<typeof sessionPromise>;

      if (!authSession) {
        setLoading(false);
        return;
      }

      // 프로젝트 조회
      const { data: projectsRaw } = await (supabase as any)
        .from("projects")
        .select("id, name, source_lang, target_lang, target_langs, created_at, status")
        .eq("user_id", authSession.user.id)
        .order("created_at", { ascending: false });

      const projects: ProjectRow[] = projectsRaw || [];

      if (projects.length === 0) {
        setStats({
          totalProjects: 0,
          totalSessions: 0,
          totalDurationMs: 0,
          supportedLanguages: [],
          totalInterpretations: 0,
        });
        setLoading(false);
        return;
      }

      const projectIds = projects.map((p) => p.id);

      // 세션 조회
      const { data: sessionsRaw } = await (supabase as any)
        .from("sessions")
        .select("id, project_id, started_at, ended_at, audio_duration_ms, status")
        .in("project_id", projectIds)
        .order("started_at", { ascending: false });

      const sessions: SessionRow[] = sessionsRaw || [];

      // 세션별 해석 수 조회 (최종 해석만)
      const sessionIds = sessions.map((s) => s.id);
      let interpretations: InterpretationRow[] = [];

      if (sessionIds.length > 0) {
        const { data: interpsRaw } = await (supabase as any)
          .from("interpretations")
          .select("id, session_id, target_language, original_text, translated_text, created_at")
          .in("session_id", sessionIds)
          .eq("is_final", true)
          .order("created_at", { ascending: false });

        interpretations = interpsRaw || [];
      }

      // ─── 전체 통계 계산 ─────────────────────────────────

      let totalDurationMs = 0;
      for (const session of sessions) {
        if (session.ended_at && session.started_at) {
          totalDurationMs +=
            new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
        } else if (session.audio_duration_ms) {
          totalDurationMs += session.audio_duration_ms;
        }
      }

      // 지원 언어 수집
      const langSet = new Set<string>();
      for (const p of projects) {
        langSet.add(p.source_lang);
        if (p.target_langs && Array.isArray(p.target_langs)) {
          p.target_langs.forEach((l) => langSet.add(l));
        } else if (p.target_lang) {
          langSet.add(p.target_lang);
        }
      }

      setStats({
        totalProjects: projects.length,
        totalSessions: sessions.length,
        totalDurationMs,
        supportedLanguages: Array.from(langSet),
        totalInterpretations: interpretations.length,
      });

      // ─── 프로젝트별 요약 ────────────────────────────────

      const projectSessionMap = new Map<string, SessionRow[]>();
      for (const s of sessions) {
        if (!projectSessionMap.has(s.project_id)) {
          projectSessionMap.set(s.project_id, []);
        }
        projectSessionMap.get(s.project_id)!.push(s);
      }

      const summaries: ProjectSummary[] = projects.map((p) => {
        const pSessions = projectSessionMap.get(p.id) || [];
        let dur = 0;
        let lastActivity = p.created_at;

        for (const s of pSessions) {
          if (s.ended_at && s.started_at) {
            dur += new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          } else if (s.audio_duration_ms) {
            dur += s.audio_duration_ms;
          }
          if (s.started_at > lastActivity) lastActivity = s.started_at;
        }

        return {
          id: p.id,
          name: p.name,
          sourceLang: p.source_lang,
          targetLangs: p.target_langs && Array.isArray(p.target_langs) ? p.target_langs : [p.target_lang],
          sessionCount: pSessions.length,
          totalDurationMs: dur,
          lastActivityAt: lastActivity,
          status: p.status,
        };
      });

      setProjectSummaries(summaries);

      // ─── 최근 활동 (세션 기준, 최근 10개) ────────────────

      const interpCountBySession = new Map<string, number>();
      for (const interp of interpretations) {
        interpCountBySession.set(
          interp.session_id,
          (interpCountBySession.get(interp.session_id) || 0) + 1
        );
      }

      const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));

      const activity: RecentActivity[] = sessions.slice(0, 10).map((s) => ({
        sessionId: s.id,
        projectId: s.project_id,
        projectName: projectNameMap.get(s.project_id) || "—",
        status: s.status,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        interpretationCount: interpCountBySession.get(s.id) || 0,
      }));

      setRecentActivity(activity);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "데이터를 로드하는 중 오류가 발생했습니다";
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── 로딩 상태 ─────────────────────────────────────────
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ─── 에러 상태 ─────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">분석</h1>
        </div>
        <div className="rounded-xl border border-red-800/50 bg-red-900/10 p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-3">데이터를 불러올 수 없습니다</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRetry}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  재시도 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  다시 시도
                </>
              )}
            </button>
            <button
              onClick={() => window.location.href = "/projects"}
              className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-950"
            >
              프로젝트로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 빈 상태 ───────────────────────────────────────────
  if (!stats || stats.totalProjects === 0) {
    return <EmptyState />;
  }

  // ─── 정상 렌더 ─────────────────────────────────────────
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">분석</h1>
        <p className="text-sm text-gray-400 mt-1">전체 프로젝트 및 세션 분석 개요</p>
      </div>

      {/* 요약 스탯 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-900/30 text-indigo-400">
              <FolderIcon />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-indigo-400">{stats.totalProjects}</p>
            <p className="text-xs text-gray-500 mt-1">총 프로젝트</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900/30 text-emerald-400">
              <SessionsIcon />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-emerald-400">{stats.totalSessions}</p>
            <p className="text-xs text-gray-500 mt-1">총 세션</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-900/30 text-amber-400">
              <ClockIcon />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-amber-400">{formatDurationHours(stats.totalDurationMs)}</p>
            <p className="text-xs text-gray-500 mt-1">총 통역 시간</p>
            <p className="text-xs text-gray-600 mt-0.5">{stats.totalInterpretations}건 해석</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-900/30 text-violet-400">
              <GlobeIcon />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-violet-400">{stats.supportedLanguages.length}</p>
            <p className="text-xs text-gray-500 mt-1">지원 언어</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {stats.supportedLanguages.slice(0, 3).map(getLanguageName).join(", ")}
              {stats.supportedLanguages.length > 3 && ` +${stats.supportedLanguages.length - 3}`}
            </p>
          </div>
        </div>
      </div>

      {/* 2열 레이아웃: 최근 활동 + 프로젝트별 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 최근 활동 목록 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">최근 활동</h2>
            <span className="text-xs text-gray-500">최근 {Math.min(recentActivity.length, 10)}개 세션</span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-500">세션 활동이 없습니다</p>
              <Link
                href="/projects"
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block transition-colors"
              >
                프로젝트로 이동 →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item, idx) => (
                <div
                  key={item.sessionId}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all duration-200 hover:border-gray-700"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-white font-medium">{item.projectName}</p>
                        <StatusBadge status={item.status} />
                        {item.interpretationCount > 0 && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <DocumentTextIcon />
                            {item.interpretationCount}건
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        시작: {formatDateLocal(item.startedAt)}
                        {item.endedAt && (
                          <span className="ml-2">종료: {formatDateLocal(item.endedAt)}</span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/sessions/${item.sessionId}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap ml-3"
                    >
                      세션 상세 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 프로젝트별 분석 링크 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">프로젝트별 분석</h2>
          </div>

          <div className="space-y-2">
            {projectSummaries.map((p, idx) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}/analytics`}
                className="block rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all duration-200 hover:border-indigo-500/50 hover:shadow-sm hover:shadow-indigo-500/10"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white font-medium truncate mr-2">{p.name}</p>
                  <svg className="w-3.5 h-3.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getLanguageName(p.sourceLang)} → {p.targetLangs.map(getLanguageName).join(", ")}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-600">세션 {p.sessionCount}개</span>
                  {p.totalDurationMs > 0 && (
                    <span className="text-xs text-gray-600">{formatDurationHours(p.totalDurationMs)}</span>
                  )}
                  <span className="text-xs text-gray-600">{getRelativeTime(p.lastActivityAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
