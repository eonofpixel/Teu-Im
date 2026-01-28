"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "./StatCard";
import UsageChart from "./UsageChart";
import LanguageBreakdown from "./LanguageBreakdown";
import DateRangePicker, {
  DateRange,
  Granularity,
} from "./DateRangePicker";

// ─── 타입 정의 ──────────────────────────────────────────────

interface SummaryData {
  project: {
    id: string;
    name: string;
    source_lang: string;
    target_langs: string[];
    created_at: string;
  };
  totals: {
    sessions_count: number;
    total_duration_ms: number;
    interpretations_count: number;
    word_count: {
      original: number;
      translated: number;
      total: number;
    };
  };
  language_breakdown: Array<{ language: string; count: number }>;
  recent_activity: {
    sessions_last_7_days: number;
  };
}

interface AnalyticsData {
  totals: {
    sessions_count: number;
    total_duration_ms: number;
    interpretations_count: number;
    word_count: {
      original: number;
      translated: number;
    };
  };
  language_breakdown: Array<{ language: string; count: number }>;
  time_series: Array<{
    date: string;
    sessions: number;
    duration_ms: number;
    interpretations: number;
    word_count: number;
  }>;
}

// ─── 유틸 함수 ──────────────────────────────────────────────

function formatDurationHours(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return {
    from: formatDateStr(from),
    to: formatDateStr(to),
  };
}

// ─── 아이콘 컴포넌트 ───────────────────────────────────────

function SessionsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocumentTextIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h12m-12-8h12m-12 12h12a2 2 0 002-2V6a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5.26c.026-.836.214-1.623.547-2.338m.518-1.045A6.959 6.959 0 0112 5c2.46 0 4.637 1.219 5.975 3.117m0 0c.333.715.521 1.502.547 2.338h2.205M3.055 11a8.96 8.96 0 011.522-2.338M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${spinning ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ─── 로딩 스켱레톤 ──────────────────────────────────────────

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* 헤더 스켱레톤 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-64 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* 스탯 카드 스켱레톤 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
            <div className="h-10 w-10 bg-gray-800 rounded-lg mb-3" />
            <div className="h-7 w-24 bg-gray-800 rounded" />
            <div className="h-4 w-32 bg-gray-800 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* 차트 스켱레톤 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
          <div className="h-4 w-32 bg-gray-800 rounded mb-4" />
          <div className="h-48 bg-gray-800 rounded-lg" />
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
          <div className="h-4 w-24 bg-gray-800 rounded mb-4" />
          <div className="h-40 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── 메인 대시보드 컴포넌트 ──────────────────────────────────

export default function AnalyticsDashboard({ projectId }: { projectId: string }) {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/analytics/summary`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("인증이 필요합니다");
          return;
        }
        if (res.status === 404) {
          setError("프로젝트를 찾을 수 없습니다");
          return;
        }
        throw new Error("서버 오류");
      }
      const data = await res.json();
      setSummary(data);
    } catch {
      setError("요약 데이터를 로드하는 중 오류가 발생했습니다");
    }
  }, [projectId]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        from_date: dateRange.from,
        to_date: dateRange.to,
        granularity,
      });
      const res = await fetch(
        `/api/projects/${projectId}/analytics?${params}`
      );
      if (!res.ok) throw new Error("서버 오류");
      const data = await res.json();
      setAnalytics(data);
    } catch {
      setError("분석 데이터를 로드하는 중 오류가 발생했습니다");
    }
  }, [projectId, dateRange, granularity]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSummary(), fetchAnalytics()]);
    setLoading(false);
  }, [fetchSummary, fetchAnalytics]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 자동 갱신
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAll();
    }, 30000); // 30초 간격
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAll]);

  // 로딩 상태
  if (loading && !summary && !analytics) {
    return <AnalyticsLoadingSkeleton />;
  }

  // 에러 상태
  if (error) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchAll}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          다시 시도 →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">분석 대시보드</h1>
          <p className="text-sm text-gray-400 mt-1">
            {summary?.project.name || ""} 프로젝트 사용 현황
          </p>
        </div>

        {/* 필터 + 자동갱신 */}
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            value={dateRange}
            granularity={granularity}
            onChange={setDateRange}
            onGranularityChange={setGranularity}
          />

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-indigo-600 text-white"
                : "border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
            title="자동 갱신 (30초)"
          >
            <RefreshIcon spinning={autoRefresh && loading} />
            자동갱신
          </button>
        </div>
      </div>

      {/* 요약 스탯 카드 (전체 기간) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="총 세션 수"
          value={formatNumber(summary?.totals.sessions_count ?? 0)}
          subtitle={`최근 7일: ${summary?.recent_activity.sessions_last_7_days ?? 0}개`}
          icon={<SessionsIcon />}
          accent="indigo"
        />
        <StatCard
          title="총 통역 시간"
          value={formatDurationHours(summary?.totals.total_duration_ms ?? 0)}
          subtitle="누적 재생 시간"
          icon={<ClockIcon />}
          accent="emerald"
        />
        <StatCard
          title="총 해석 수"
          value={formatNumber(summary?.totals.interpretations_count ?? 0)}
          subtitle="최종 해석 건수"
          icon={<DocumentTextIcon />}
          accent="amber"
        />
        <StatCard
          title="총 단어 수"
          value={formatNumber(summary?.totals.word_count.total ?? 0)}
          subtitle={`원본 ${formatNumber(summary?.totals.word_count.original ?? 0)} · 번역 ${formatNumber(summary?.totals.word_count.translated ?? 0)}`}
          icon={<GlobeIcon />}
          accent="violet"
        />
      </div>

      {/* 차트 섹션 (선택 기간) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 사용량 차트 (세션 수) */}
        <div className="lg:col-span-2">
          <UsageChart
            data={analytics?.time_series ?? []}
            metric="sessions"
            title="세션 수 추이"
            height={240}
            color="#6366f1"
          />
        </div>

        {/* 언어 사용 비율 */}
        <LanguageBreakdown data={analytics?.language_breakdown ?? []} size={140} />
      </div>

      {/* 추가 차트: 해석 수 & 단어 수 추이 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UsageChart
          data={analytics?.time_series ?? []}
          metric="interpretations"
          title="해석 수 추이"
          height={200}
          color="#10b981"
        />
        <UsageChart
          data={analytics?.time_series ?? []}
          metric="word_count"
          title="단어 수 추이"
          height={200}
          color="#f59e0b"
          formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v))}
        />
      </div>
    </div>
  );
}
