"use client";

import Link from "next/link";

function BarChartIcon() {
  return (
    <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25a1.125 1.125 0 01-1.125-1.125v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">분석</h1>
        <p className="text-sm text-gray-400 mt-1">전체 프로젝트 및 세션 분석 개요</p>
      </div>

      {/* 요약 카드 행 - placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "총 프로젝트", value: "—", icon: "📁" },
          { label: "총 세션", value: "—", icon: "🎙️" },
          { label: "총 통역 시간", value: "—", icon: "⏱️" },
          { label: "지원 언어", value: "—", icon: "🌐" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-800 bg-gray-900 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 빈 상태 - 프로젝트별 분석 유도 */}
      <div className="rounded-xl border border-dashed border-gray-700 p-16 text-center">
        <div className="mx-auto w-24 h-24 rounded-2xl bg-gray-800/80 flex items-center justify-center mb-6">
          <BarChartIcon />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">전체 분석 준비 중</h3>
        <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
          프로젝트별 세상세한 분석은 각 프로젝트 페이지에서 확인할 수 있습니다.
          세션이 축적되면 여기서도 전체 개요를 확인할 수 있게 됩니다.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          프로젝트별 분석 확인
        </Link>
      </div>
    </div>
  );
}
