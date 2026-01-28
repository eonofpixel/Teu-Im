import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="flex h-screen bg-gray-950">
      {/* 사이드바 */}
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-900">
        {/* 로고 */}
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-bold text-white">Teu-Im</h1>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink href="/projects" label="프로젝트" icon="📁" />
          <NavLink href="/settings" label="설정" icon="⚙️" />
        </nav>

        {/* 사용자 정보 & 로그아웃 */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">
              {user.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.email?.split("@")[0]}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {/* 헤더 */}
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-gray-800 bg-gray-950 px-6">
          <div className="flex-1" />
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
