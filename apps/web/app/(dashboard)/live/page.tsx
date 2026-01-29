import Link from "next/link";

export default function LivePage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-3xl border border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-gray-900/30 p-12 text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-4">
          실시간 방송은 데스크톱 앱에서만 가능합니다
        </h1>

        {/* Description */}
        <p className="text-base text-gray-400 mb-8 leading-relaxed">
          음성 녹음 및 실시간 통역 기능은 데스크톱 앱에서 제공됩니다.
          <br />
          데스크톱 앱을 다운로드하여 라이브 방송을 시작하세요.
        </p>

        {/* CTA Button */}
        <Link
          href="/download"
          className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg hover:shadow-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          데스크톱 앱 다운로드
        </Link>

        {/* Secondary Link */}
        <div className="mt-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            프로젝트 목록으로 돌아가기
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 p-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">
            음성 녹음
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            마이크를 통한 실시간 음성 녹음 및 전송 기능
          </p>
        </div>

        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 p-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg
              className="w-5 h-5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">
            실시간 통역
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            음성을 실시간으로 인식하고 다국어로 번역
          </p>
        </div>
      </div>
    </div>
  );
}
