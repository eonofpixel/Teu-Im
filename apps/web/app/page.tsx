import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="relative min-h-screen bg-gray-900 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] rounded-full bg-indigo-600 opacity-10 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[700px] h-[700px] rounded-full bg-indigo-500 opacity-8 blur-3xl" />
        <div className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full bg-indigo-700 opacity-6 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg
              width="18"
              height="18"
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
          <span className="text-lg font-bold text-white tracking-tight">
            Teu-Im
          </span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          로그인
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-800/50 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-300 text-sm font-medium">
            AI 실시간 통역 기술로 구축됨
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tighter max-w-2xl mx-auto mb-5">
          <span className="block">통역을</span>
          <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
            더 간단하게
          </span>
        </h1>

        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          실시간 AI 통역 기술로 언어의 장벽을 제거하세요.
          회의, 면접, 여행 어디서든 즉각적인 통역 지원을 받습니다.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-900/30"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            웹에서 바로 시작
          </Link>
          <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3.5 text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-800 hover:text-white">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            앱 다운로드
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">
            왜 Teu-Im인가
          </h2>
          <p className="text-gray-500 text-sm">
            강력한 기능들로 통역 경험을 혁신하세요
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Feature 1 */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 hover:border-indigo-800/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-400"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              실시간 통역
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              AI 기술로 실시간으로 음성과 텍스트를
              즉각 변환하여 다국어 소통을 원활하게 합니다.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 hover:border-indigo-800/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-400"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              다자 회의 지원
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              여러 참석자의 발화를 동시에 기록하고
              각 언어로 통역하여 다자 회의를 수월하게 진행합니다.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-6 hover:border-indigo-800/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-800/50 flex items-center justify-center mb-4">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-indigo-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              세션 기록 및 복원
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              모든 통역 세션을 자동으로 저장하고
              언제든지 다시 조회하며 요약까지 제공합니다.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-4 pb-24 text-center">
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10">
          <h2 className="text-xl font-bold text-white mb-2">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            무료로 가입하고 AI 통역의 강력함을 경험해보세요
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-3 text-sm font-semibold text-white transition-all hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-900/30"
          >
            무료 회원가입
          </Link>
        </div>
      </section>
    </div>
  );
}
