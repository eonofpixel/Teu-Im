"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

interface Session {
  id: string;
  project_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  name?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
  source_lang: string;
  target_lang: string;
}

// ─── 유틸 ──────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const diffMs = end - start;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

// ─── 상태 배지 ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
    idle: "bg-gray-800 text-gray-400 border-gray-700",
    paused: "bg-amber-900/50 text-amber-400 border-amber-800",
    ended: "bg-gray-800 text-gray-500 border-gray-700",
  };
  const labels: Record<string, string> = {
    active: "진행 중",
    idle: "대기",
    paused: "일시정지",
    ended: "종료",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-md border ${styles[status] ?? styles.ended}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── 세션 카드 ─────────────────────────────────────────────

function SessionCard({ session }: { session: Session }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-4 transition-all hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {session.name || formatDate(session.started_at)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDuration(session.started_at, session.ended_at)}
            </p>
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>
    </Link>
  );
}

// ─── 빈 상태 ──────────────────────────────────────────────

function EmptySessions({ projectId }: { projectId: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-1">세션이 없습니다</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        데스크톱 앱에서 새 세션을 시작하세요
      </p>
      <div className="text-xs text-gray-600 font-mono bg-gray-800 rounded-lg px-3 py-2 inline-block">
        프로젝트 ID: {projectId.slice(0, 8)}...
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function ProjectSessionsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient();

    // 프로젝트 정보 조회
    const { data: projectData } = await (supabase as any)
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectData) {
      setProject(projectData);
    }

    // 세션 목록 조회
    const { data: sessionsData } = await (supabase as any)
      .from("sessions")
      .select("*")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });

    if (sessionsData) {
      setSessions(sessionsData);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="h-6 w-32 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-gray-800 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800" />
                <div>
                  <div className="h-4 w-32 bg-gray-800 rounded mb-1" />
                  <div className="h-3 w-20 bg-gray-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/projects" className="hover:text-white transition-colors">
          프로젝트
        </Link>
        <span>/</span>
        <span className="text-white">{project?.name ?? "..."}</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{project?.name}</h1>
          <p className="text-sm text-gray-400 mt-1">
            세션 {sessions.length}개 • 코드: {project?.code}
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/analytics`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          분석
        </Link>
      </div>

      {/* 세션 목록 */}
      {sessions.length === 0 ? (
        <EmptySessions projectId={projectId} />
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <SessionCard session={session} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
