"use client";

import React from "react";

export interface StatCardProps {
  /** 카드 제목 */
  title: string;
  /** 주요 값 표시 */
  value: string;
  /** 보조 설명 */
  subtitle?: string;
  /** 아이콘 (SVG element) */
  icon?: React.ReactNode;
  /** 강조 색상 클래스 (기본: indigo) */
  accent?: "indigo" | "emerald" | "amber" | "violet";
  /** 비교 변화량 표시 (예: "+12%" or "-3 sessions") */
  trend?: {
    value: string;
    positive: boolean;
  };
}

const accentStyles: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  indigo: {
    bg: "bg-indigo-900/30",
    text: "text-indigo-400",
    border: "border-indigo-800/50",
  },
  emerald: {
    bg: "bg-emerald-900/30",
    text: "text-emerald-400",
    border: "border-emerald-800/50",
  },
  amber: {
    bg: "bg-amber-900/30",
    text: "text-amber-400",
    border: "border-amber-800/50",
  },
  violet: {
    bg: "bg-violet-900/30",
    text: "text-violet-400",
    border: "border-violet-800/50",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "indigo",
  trend,
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700">
      <div className="flex items-start justify-between">
        {/* 아이콘 */}
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.bg} ${styles.text}`}>
            {icon}
          </div>
        )}

        {/* 트렌드 배지 */}
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.positive
                ? "bg-emerald-900/40 text-emerald-400"
                : "bg-red-900/40 text-red-400"
            }`}
          >
            {trend.positive ? "+" : ""}
            {trend.value}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className={`text-2xl font-bold ${styles.text}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
