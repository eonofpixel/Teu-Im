"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  const { id: projectId } = useParams<{ id: string }>();

  return (
    <div className="max-w-6xl">
      {/* 백크리눠 정보 경로 */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/projects"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          프로젝트
        </Link>
        <span className="text-gray-700">›</span>
        <Link
          href={`/projects/${projectId}/sessions`}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          세션
        </Link>
        <span className="text-gray-700">›</span>
        <span className="text-xs text-gray-400">분석</span>
      </div>

      {/* 대시보드 */}
      <AnalyticsDashboard projectId={projectId} />
    </div>
  );
}
