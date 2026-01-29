import { useEffect, useState } from "react";
import { getProjects } from "@teu-im/supabase";
import { Project } from "@teu-im/shared";
import { useAppStore } from "@/stores/appStore";

export function ProjectSelect() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAppStore((state) => state.user)!;
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const setUser = useAppStore((state) => state.setUser);

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

  const handleLogout = () => {
    setUser(null);
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">프로젝트 선택</h1>
        <button
          onClick={handleLogout}
          className="text-base text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-gray-800 rounded-lg min-h-[44px]"
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
          <div className="max-w-md mx-auto text-center mt-24">
            <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-6 py-5 mb-6">
              <p className="text-red-300 text-lg">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-400 hover:text-indigo-300 text-base font-medium transition-colors px-6 py-3 hover:bg-gray-800 rounded-lg min-h-[44px]"
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
          <div className="max-w-2xl mx-auto space-y-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-600/50 rounded-2xl px-7 py-6 transition-all group min-h-[88px]"
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
