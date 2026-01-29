import { useEffect, useState } from "react";
import { getProjects } from "@teu-im/supabase";
import { Project } from "@teu-im/shared";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";

export function ProjectSelect() {
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
        <button
          onClick={handleLogout}
          className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800/60 rounded-xl min-h-[44px]"
        >
          로그아웃
        </button>
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
          <div className="text-center text-gray-500 mt-24">
            <p className="text-xl mb-3">프로젝트가 없습니다.</p>
            <p className="text-base text-gray-600">웹 대시보드에서 프로젝트를 생성하세요.</p>
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
