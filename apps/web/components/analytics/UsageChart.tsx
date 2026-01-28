"use client";

import React, { useMemo } from "react";

export interface TimeSeriesPoint {
  date: string;
  sessions: number;
  duration_ms: number;
  interpretations: number;
  word_count: number;
}

export interface UsageChartProps {
  /** 시간 축 데이터 */
  data: TimeSeriesPoint[];
  /** 표시할 메트릭 */
  metric: "sessions" | "duration_ms" | "interpretations" | "word_count";
  /** 차트 높이 (px) */
  height?: number;
  /** 축 포맷 함수 (Y축 레이블) */
  formatValue?: (value: number) => string;
  /** 차트 제목 */
  title?: string;
  /** 강조 색상 (CSS color) */
  color?: string;
}

function defaultFormatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}`;
}

export default function UsageChart({
  data,
  metric,
  height = 220,
  formatValue,
  title,
  color = "#6366f1",
}: UsageChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point) => ({
      date: point.date,
      value: point[metric],
      label: formatDateLabel(point.date),
    }));
  }, [data, metric]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.value), 1);
  }, [chartData]);

  const format = formatValue || defaultFormatValue;

  // 빈 상태
  if (chartData.length === 0) {
    return (
      <div
        className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col items-center justify-center"
        style={{ height }}
      >
        <p className="text-sm text-gray-600">데이터가 없습니다</p>
      </div>
    );
  }

  // SVG 차트 렌더링
  const padding = { top: 24, right: 16, bottom: 36, left: 48 };
  const chartWidth = 100; // viewBox 단위 (백분율)
  const chartHeight = height - padding.top - padding.bottom;

  // Y축 레이블 단계 (최대 4개)
  const ySteps = [0, 0.25, 0.5, 0.75, 1.0];
  const yLabels = ySteps.map((step) => ({
    ratio: step,
    value: Math.round(maxValue * step),
  }));

  // 바 폴리라인 데이터점 생성
  const barWidth = Math.max(2, (chartWidth / chartData.length) * 0.6);
  const barSpacing = chartWidth / chartData.length;

  const bars = chartData.map((point, i) => {
    const x = (i + 0.5) * barSpacing - barWidth / 2;
    const barHeight = maxValue > 0 ? (point.value / maxValue) * chartHeight : 0;
    const y = chartHeight - barHeight;
    return { x, y, width: barWidth, height: barHeight, value: point.value, label: point.label };
  });

  // 포인트라인 (area chart 효과)
  const linePoints = chartData
    .map((point, i) => {
      const x = (i + 0.5) * barSpacing;
      const y = maxValue > 0 ? chartHeight - (point.value / maxValue) * chartHeight : chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  // 영역 경로 (area fill)
  const areaPath =
    chartData.length > 0
      ? `M ${0.5 * barSpacing},${chartHeight} ` +
        chartData
          .map((point, i) => {
            const x = (i + 0.5) * barSpacing;
            const y =
              maxValue > 0
                ? chartHeight - (point.value / maxValue) * chartHeight
                : chartHeight;
            return `L ${x},${y}`;
          })
          .join(" ") +
        ` L ${(chartData.length - 0.5) * barSpacing},${chartHeight} Z`
      : "";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      {title && (
        <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      )}

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
        className="w-full"
        style={{ height: height - padding.top - 8 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y축 가이드라인 + 레이블 */}
        {yLabels.map(({ ratio, value }) => {
          const y = chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#374151"
                strokeWidth="0.3"
                strokeDasharray="2,2"
              />
              <text
                x="-2"
                y={y + 3}
                textAnchor="end"
                fontSize="7"
                fill="#6b7280"
              >
                {format(value)}
              </text>
            </g>
          );
        })}

        {/* Area 영역 */}
        {areaPath && (
          <path d={areaPath} fill="url(#areaGradient)" />
        )}

        {/* 바 (반투명) */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={color}
            opacity="0.25"
            rx="0.5"
          />
        ))}

        {/* 라인 (연결선) */}
        {linePoints && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}

        {/* 데이터 포인트 원 */}
        {chartData.map((point, i) => {
          const x = (i + 0.5) * barSpacing;
          const y = maxValue > 0 ? chartHeight - (point.value / maxValue) * chartHeight : chartHeight;
          return (
            <circle key={i} cx={x} cy={y} r="2" fill={color} opacity="0.8" />
          );
        })}

        {/* X축 날짜 레이블 */}
        {chartData.map((point, i) => {
          // 레이블 밀집도 조절: 항목이 많으면 일부만 표시
          const showLabel =
            chartData.length <= 7
              ? true
              : chartData.length <= 14
                ? i % 2 === 0
                : i % 3 === 0;

          if (!showLabel) return null;

          const x = (i + 0.5) * barSpacing;
          return (
            <text
              key={i}
              x={x}
              y={chartHeight + 14}
              textAnchor="middle"
              fontSize="7"
              fill="#6b7280"
            >
              {point.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
