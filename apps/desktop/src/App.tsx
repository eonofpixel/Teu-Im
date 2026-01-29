import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useAuthInit } from "@/hooks/useAuthInit";
import { Login } from "@/pages/Login";
import { ProjectSelect } from "@/pages/ProjectSelect";
import { ProjectCreate } from "@/pages/ProjectCreate";
import { Interpreter } from "@/pages/Interpreter";
import { Settings } from "@/pages/Settings";
import { ErrorBoundary } from "@/components/ErrorBoundary";

type AppView = "login" | "project-select" | "project-create" | "interpreter" | "settings";

export function App() {
  // Initialize auth state and listen for changes
  useAuthInit();

  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);
  const [view, setView] = useState<AppView | null>(null);

  const getView = (): AppView => {
    if (!user) return "login";
    if (view === "project-create") return "project-create";
    if (view === "settings") return "settings";
    if (!currentProject) return "project-select";
    return "interpreter";
  };

  const currentView = getView();

  const handleShowProjectCreate = () => {
    setView("project-create");
  };

  const handleCancelProjectCreate = () => {
    setView("project-select");
  };

  const handleProjectCreateSuccess = () => {
    setView("project-select");
  };

  const handleShowSettings = () => {
    setView("settings");
  };

  const handleCancelSettings = () => {
    setView("project-select");
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col">
        {currentView === "login" && <Login />}
        {currentView === "project-select" && (
          <ProjectSelect
            onCreateNew={handleShowProjectCreate}
            onSettings={handleShowSettings}
          />
        )}
        {currentView === "project-create" && (
          <ProjectCreate
            onCancel={handleCancelProjectCreate}
            onSuccess={handleProjectCreateSuccess}
          />
        )}
        {currentView === "settings" && (
          <Settings onBack={handleCancelSettings} />
        )}
        {currentView === "interpreter" && <Interpreter />}
      </div>
    </ErrorBoundary>
  );
}
