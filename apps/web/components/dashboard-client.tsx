"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

// ─── 네비게이션 아이템 정의 ───────────────────────────────

const NAV_ITEMS = [
  { href: "/projects", label: "프로젝트", icon: FolderIcon },
  { href: "/live", label: "실시간 통역", icon: MicIcon, badge: "NEW" },
  { href: "/download", label: "다운로드", icon: DownloadIcon, badge: "NEW" },
  { href: "/analytics", label: "분석", icon: BarChartIcon },
  { href: "/settings", label: "설정", icon: SettingsIcon },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: () => React.ReactElement;
  badge?: string;
};

// ─── SVG 아이콘 컴포넌트 ─────────────────────────────────

function FolderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6.75 6.75 0 006.75-6.75H17.25a5.25 5.25 0 01-10.5 0H5.25a6.75 6.75 0 006.75 6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75V21M12 6.75a.75.75 0 00-.75.75v6a.75.75 0 001.5 0v-6a.75.75 0 00-.75-.75z" />
      <rect x="10.5" y="4" width="3" height="10" rx="1.5" stroke="none" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25a1.125 1.125 0 01-1.125-1.125v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── NavLink 컴포넌트 (사이드바 - 활성 상태 표시) ──────────

function NavLink({ href, label, icon: Icon, badge, pathname }: NavItem & { pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150
        ${isActive
          ? "bg-indigo-600/10 text-indigo-400 shadow-sm shadow-indigo-500/10"
          : "text-gray-400 hover:bg-gray-800 hover:text-white"
        }
      `}
    >
      <span className={isActive ? "text-indigo-400" : "text-gray-500"}>
        <Icon />
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-600/20 text-indigo-300">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── MobileNavLink 컴포넌트 (하단 바 - 아이콘 + 라벨 세로 배치) ──

function MobileNavLink({ href, label, icon: Icon, badge, pathname }: NavItem & { pathname: string }) {
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`
        relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors duration-150
        ${isActive ? "text-indigo-400" : "text-gray-500"}
      `}
    >
      {/* 활성 상태 인디케이터 (상단 라인) */}
      {isActive && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-indigo-400" />
      )}
      <Icon />
      <span className="text-xs font-medium leading-none">{label}</span>
      {/* 배지 (NEW 등) */}
      {badge && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}

// ─── 사이드바 콘텐츠 ─────────────────────────────────────

function SidebarContent({ pathname, userEmail, userName }: {
  pathname: string;
  userEmail: string;
  userName: string;
}) {
  return (
    <>
      {/* 로고 */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Teu-Im</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      {/* 사용자 정보 & 로그아웃 */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white">
            {userEmail?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-400 truncate">{userEmail}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </>
  );
}

// ─── 메인 레이아웃 클라이언트 ─────────────────────────────

export function DashboardClient({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
}) {
  const pathname = usePathname();

  // 현재 페이지 타이틀 추론
  const currentNav = [...NAV_ITEMS].reverse().find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="flex h-screen bg-gray-950">
      {/* ── 사이드바 (md 이상 = 항상 표시, md 미만 숨침) ── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-800 bg-gray-900 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent pathname={pathname} userEmail={userEmail} userName={userName} />
      </aside>

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col overflow-auto min-w-0">
        {/* 헤더 - 모바일: 타이틀만 / 데스크톱: 기본 헤더 유지 */}
        <header className="sticky top-0 z-10 flex h-14 min-h-14 items-center border-b border-gray-800 bg-gray-950 px-4 md:px-6">
          {/* 모바일 헤더: 페이지 타이틀만 표시 */}
          <h2 className="text-base font-semibold text-white md:hidden">
            {currentNav?.label ?? "대시보드"}
          </h2>

          {/* 데스크톱 헤더 우측 영역 */}
          <div className="flex-1" />
        </header>

        {/* 페이지 콘텐츠 - 모바일에서 하단 바 높이만큼 여백 추가 */}
        <main className="flex-1 p-4 lg:p-6 pb-24 md:pb-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* ── 모바일 하단 네비게이션 바 (md 미만에서만 표시) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 [padding-bottom:env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map((item) => (
            <MobileNavLink key={item.href} {...item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </div>
  );
}
