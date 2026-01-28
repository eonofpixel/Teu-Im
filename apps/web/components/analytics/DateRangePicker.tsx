"use client";

import React, { useState, useRef, useEffect } from "react";

export type Granularity = "day" | "week" | "month";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface DateRangePickerProps {
  /** 현재 날짜 범위 */
  value: DateRange;
  /** 선택된 granularity */
  granularity: Granularity;
  /** 날짜 범위 변경 핸들러 */
  onChange: (range: DateRange) => void;
  /** granularity 변경 핸들러 */
  onGranularityChange: (g: Granularity) => void;
}

// 프리셋 날짜 범위
const PRESETS = [
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function DateRangePicker({
  value,
  granularity,
  onChange,
  onGranularityChange,
}: DateRangePickerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - days);
    onChange({ from: formatDate(from), to: formatDate(to) });
    setDropdownOpen(false);
  };

  const handleDateInput = (
    field: "from" | "to",
    inputValue: string
  ) => {
    if (!inputValue) return;

    const newRange = { ...value };
    newRange[field] = inputValue;

    // from가 to보다 뒤에 오면 to 조정
    if (new Date(newRange.from) > new Date(newRange.to)) {
      if (field === "from") {
        newRange.to = newRange.from;
      } else {
        newRange.from = newRange.to;
      }
    }

    onChange(newRange);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 날짜 범위 드롭다운 */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
        >
          <CalendarIcon />
          <span>
            {formatDisplayDate(value.from)} – {formatDisplayDate(value.to)}
          </span>
          <ChevronDownIcon className={dropdownOpen ? "rotate-180" : ""} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 z-30 w-72 rounded-xl border border-gray-700 bg-gray-900 shadow-xl shadow-black/40 p-4">
            {/* 프리셋 버튼 */}
            <div className="flex gap-2 mb-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => handlePreset(preset.days)}
                  className="flex-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 직접 날짜 선택 */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">시작일</p>
                <input
                  type="date"
                  value={value.from}
                  onChange={(e) => handleDateInput("from", e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none transition-colors"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">종료일</p>
                <input
                  type="date"
                  value={value.to}
                  min={value.from}
                  onChange={(e) => handleDateInput("to", e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none transition-colors"
                  style={{ colorScheme: "dark" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Granularity 셀렉터 */}
      <div className="flex rounded-lg border border-gray-700 overflow-hidden">
        {(["day", "week", "month"] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => onGranularityChange(g)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              granularity === g
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {g === "day" ? "일별" : g === "week" ? "주별" : "월별"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SVG 아이콘 ─────────────────────────────────────────────

function CalendarIcon() {
  return (
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
