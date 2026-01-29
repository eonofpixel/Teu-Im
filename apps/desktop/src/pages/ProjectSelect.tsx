import { useEffect, useState } from "react";
import { getProjects } from "@teu-im/supabase";
import { Project } from "@teu-im/shared";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";

interface ProjectSelectProps {
  onCreateNew: () => void;
  onSettings: () => void;
}

export function ProjectSelect({ onCreateNew, onSettings }: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAppStore((state) => state.user)!;
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects(user.id);
        setProjects(data);
      } catch (err) {
        setError((err as Error).message || "프로젝트 목록 조회 실패");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Auth state listener will handle the reset
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-gray-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">프로젝트 선택</h1>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 0 && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-medium transition-colors min-h-[44px]"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              새 프로젝트
            </button>
          )}
          <button
            onClick={onSettings}
            className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
            title="설정"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-8">
        {loading && (
          <div className="text-center text-gray-400 mt-24">
            <p className="text-xl">프로젝트 목록을 조회 중...</p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto text-center mt-24 animate-fade-in">
            <div className="bg-red-900/20 border border-red-800/40 rounded-2xl px-6 py-5 mb-6">
              <p className="text-red-300 text-lg">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-400 hover:text-indigo-300 text-base font-medium transition-colors px-6 py-3 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center text-gray-500 mt-24 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <p className="text-xl mb-3 text-white font-semibold">
              첫 프로젝트를 만들어보세요
            </p>
            <p className="text-base text-gray-400 mb-8">
              프로젝트를 만들고 실시간 통역을 시작할 수 있습니다
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:shadow-indigo-600/50 min-h-[44px]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              새 프로젝트 만들기
            </button>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="w-full text-left bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-indigo-600/50 rounded-2xl px-7 py-6 transition-all group min-h-[88px] hover:shadow-lg hover:shadow-indigo-900/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white group-hover:text-indigo-400 transition-colors mb-2">
                      {project.name}
                    </h2>
                    <p className="text-base text-gray-400">
                      {project.sourceLang} → {project.targetLang}
                    </p>
                  </div>
                  <svg
                    className="w-7 h-7 text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
