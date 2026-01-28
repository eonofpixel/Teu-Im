"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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

// ─── 유틸: 상대 시간 ─────────────────────────────────────

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

// ─── 상태 배지 ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-900/50 text-emerald-400",
    idle: "bg-gray-800 text-gray-400",
    ended: "bg-gray-800 text-gray-500",
  };
  const labels: Record<string, string> = {
    active: "진행 중",
    idle: "대기",
    ended: "종료",
  };

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles[status] ?? styles.ended}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── 아이콘 컴포넌트 ──────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

// ─── 액션 메뉴 ────────────────────────────────────────────

function ActionMenu({
  projectId,
  onEdit,
  onDelete,
}: {
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-30 w-44 rounded-lg border border-gray-700 bg-gray-800 shadow-xl shadow-black/30 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <PencilIcon />
              수정
            </button>
            <Link
              href={`/projects/${projectId}/sessions`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <LayersIcon />
              세션 보기
            </Link>
            <div className="border-t border-gray-700 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
            >
              <TrashIcon />
              삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 삭제 확인 모달 ───────────────────────────────────────

function DeleteConfirmModal({
  projectName,
  onCancel,
  onConfirm,
}: {
  projectName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h4 className="text-sm font-semibold text-white mb-2">프로젝트 삭제</h4>
        <p className="text-sm text-gray-400 mb-1">
          <span className="text-white font-medium">"{projectName}"</span>
        </p>
        <p className="text-sm text-gray-400 mb-5">
          프로젝트와 관련된 모든 세션 및 해석 내용이 영구적으로 삭제되겠습니다.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            삭제 확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 빈 상태 ──────────────────────────────────────────────

function EmptyProjects() {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center animate-slide-up">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <FolderIcon />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">프로젝트가 없습니다</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        새 프로젝트를 만들어 실시간 통역을 시작하세요
      </p>
      <Link
        href="/projects/new"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
      >
        <PlusIcon />
        새 프로젝트 만들기
      </Link>
    </div>
  );
}

// ─── 프로젝트 카드 ────────────────────────────────────────

function ProjectCard({
  project,
  sessionCount,
  onDelete,
}: {
  project: Project;
  sessionCount: number;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);

  const targetLangs =
    project.targetLangs && project.targetLangs.length > 0
      ? project.targetLangs
      : [project.targetLang];

  return (
    <div className="group relative rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700 hover:shadow-lg hover:shadow-indigo-500/5">
      {/* 카드 콘텐츠 */}
      <div className="flex items-start justify-between pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-semibold text-white">{project.name}</h3>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1.5">
            {getLanguageName(project.sourceLang)}
            <span className="text-gray-700 mx-1.5">→</span>
            {targetLangs.map((l) => getLanguageName(l)).join(", ")}
          </p>
        </div>

        {/* 액션 메뉴 - 호버 시 표시 */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <ActionMenu
            projectId={project.id}
            onEdit={() => setEditOpen(true)}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* 통계 행 */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          세션 {sessionCount}개
        </div>
        <span className="text-gray-800">•</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          마지막 활동 {getRelativeTime(project.createdAt)}
        </div>
        <span className="text-gray-800">•</span>
        <div className="text-xs text-gray-500">
          코드: {project.code}
        </div>
      </div>

      {/* 클릭 가능한 오버레이 - 세션 목록으로 이동 */}
      <Link
        href={`/projects/${project.id}/sessions`}
        className="absolute inset-0 rounded-xl"
        aria-label={`${project.name} 세션 보기`}
      />

      {/* 수정 모달은 별도로 구현할 수 있음 - 현재 placeholder */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setEditOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h4 className="text-sm font-semibold text-white mb-4">프로젝트 수정</h4>
            <p className="text-sm text-gray-500 mb-4">수정 기능은 소재 중입니다.</p>
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
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

      // 각 프로젝트의 세션 수 조회
      const counts: Record<string, number> = {};
      for (const p of mapped) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessions } = await (supabase as any)
          .from("sessions")
          .select("id")
          .eq("project_id", p.id);
        counts[p.id] = sessions?.length ?? 0;
      }
      setSessionCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const supabase = createBrowserClient();

    // 세션 삭제
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("sessions")
      .delete()
      .eq("project_id", deleteTarget.id);

    // 프로젝트 삭제
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("projects")
      .delete()
      .eq("id", deleteTarget.id);

    setDeleteTarget(null);
    // 목록 갱신
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-3">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-7 w-20 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-800 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
            <div className="h-5 w-48 bg-gray-800 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-800 rounded" />
            <div className="h-4 w-40 bg-gray-800 rounded mt-4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <DeleteConfirmModal
          projectName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">프로젝트</h1>
          <p className="text-sm text-gray-400 mt-1">통역 프로젝트를 관리하세요</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <PlusIcon />
          새 프로젝트
        </Link>
      </div>

      {/* 프로젝트 목록 */}
      {projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <ProjectCard
                project={project}
                sessionCount={sessionCounts[project.id] ?? 0}
                onDelete={() => setDeleteTarget(project)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
