import { useAppStore } from "@/stores/appStore";
import { Login } from "@/pages/Login";
import { ProjectSelect } from "@/pages/ProjectSelect";
import { Interpreter } from "@/pages/Interpreter";

type AppView = "login" | "project-select" | "interpreter";

export function App() {
  const user = useAppStore((state) => state.user);
  const currentProject = useAppStore((state) => state.currentProject);

  const getView = (): AppView => {
    if (!user) return "login";
    if (!currentProject) return "project-select";
    return "interpreter";
  };

  const view = getView();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-50 flex flex-col">
      {view === "login" && <Login />}
      {view === "project-select" && <ProjectSelect />}
      {view === "interpreter" && <Interpreter />}
    </div>
  );
}
