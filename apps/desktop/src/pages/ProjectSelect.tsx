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
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-white">프로젝트 선택</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          로그아웃
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-6">
        {loading && (
          <div className="text-center text-gray-400 mt-16">
            프로젝트 목록을 조회 중...
          </div>
        )}

        {error && (
          <div className="text-center mt-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-indigo-400 hover:text-indigo-300 text-sm underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <p>프로젝트가 없습니다.</p>
            <p className="text-sm mt-1">웹 대시보드에서 프로젝트를 생성하세요.</p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div className="max-w-xl mx-auto space-y-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 rounded-xl px-5 py-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {project.sourceLang} → {project.targetLang}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 transition-colors"
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
