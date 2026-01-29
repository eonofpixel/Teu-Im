import { useAppStore } from "@/stores/appStore";
import { useAuthInit } from "@/hooks/useAuthInit";
import { Login } from "@/pages/Login";
import { ProjectSelect } from "@/pages/ProjectSelect";
import { Interpreter } from "@/pages/Interpreter";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type AppView = "login" | "project-select" | "interpreter";

export function App() {
  // Initialize auth state and listen for changes
  useAuthInit();

  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);

  const getView = (): AppView => {
    if (!user) return "login";
    if (!currentProject) return "project-select";
    return "interpreter";
  };

  const view = getView();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col">
        {view === "login" && <Login />}
        {view === "project-select" && <ProjectSelect />}
        {view === "interpreter" && <Interpreter />}
      </div>
    </ErrorBoundary>
  );
}
