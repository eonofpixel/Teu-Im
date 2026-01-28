"use client";

import React, { useMemo } from "react";

export interface LanguageEntry {
  language: string;
  count: number;
}

export interface LanguageBreakdownProps {
  /** 언어별 해석 수 배열 */
  data: LanguageEntry[];
  /** 도넛 차트 지름 (px) */
  size?: number;
}

const LANGUAGE_NAMES: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  es: "스페인어",
  fr: "프랑스어",
  de: "독일어",
  pt: "포르투갈어",
  ru: "러시아어",
  ar: "아랍어",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// 각 언어별 색상 배정
const CHART_COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
];

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export default function LanguageBreakdown({
  data,
  size = 160,
}: LanguageBreakdownProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return [];

    let currentAngle = 0;
    return data.map((entry, i) => {
      const percentage = entry.count / total;
      const sliceAngle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      return {
        ...entry,
        percentage,
        startAngle,
        endAngle,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [data]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // 빈 상태
  if (data.length === 0 || total === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          언어 사용 비율
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-600">해석 데이터가 없습니다</p>
        </div>
      </div>
    );
  }

  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.55; // 도넛 구멍 비율
  const center = size / 2;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="text-sm font-semibold text-white mb-4">언어 사용 비율</h3>

      <div className="flex items-center gap-6">
        {/* 도넛 차트 */}
        <div className="flex-shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {chartData.length === 1 ? (
              /* 단일 항목: 원 */
              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                fill={chartData[0].color}
                opacity="0.85"
              >
                <title>{`${getLanguageName(chartData[0].language)}: ${chartData[0].count}`}</title>
              </circle>
            ) : (
              chartData.map((slice, i) => {
                // 매우 얇은 슬라이스 최소 각도 보장
                const effectiveStart =
                  slice.endAngle - slice.startAngle < 3
                    ? slice.endAngle - 3
                    : slice.startAngle;

                return (
                  <g key={i}>
                    {/* 외부 호 */}
                    <path
                      d={describeArc(
                        center,
                        center,
                        outerRadius,
                        effectiveStart,
                        slice.endAngle
                      )}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={outerRadius - innerRadius}
                      strokeLinecap="butt"
                      opacity="0.85"
                    >
                      <title>{`${getLanguageName(slice.language)}: ${slice.count} (${(slice.percentage * 100).toFixed(1)}%)`}</title>
                    </path>
                  </g>
                );
              })
            )}

            {/* 중앙 테이블 표시 */}
            <circle cx={center} cy={center} r={innerRadius} fill="#111827" />
            <text
              x={center}
              y={center - 4}
              textAnchor="middle"
              fontSize="16"
              fontWeight="bold"
              fill="white"
            >
              {total}
            </text>
            <text
              x={center}
              y={center + 10}
              textAnchor="middle"
              fontSize="8"
              fill="#6b7280"
            >
              해석
            </text>
          </svg>
        </div>

        {/* 레전드 */}
        <div className="flex-1 space-y-2">
          {chartData.map((entry, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-300">
                  {getLanguageName(entry.language)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {(entry.percentage * 100).toFixed(1)}%
                </span>
                <span className="text-xs font-medium text-gray-400 w-8 text-right">
                  {entry.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
