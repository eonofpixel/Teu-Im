"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SearchResultSession {
  startedAt: string;
  endedAt: string | null;
}

interface SearchResultItem {
  id: string;
  sessionId: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string | null;
  isFinal: boolean;
  sequence: number;
  startTimeMs: number | null;
  endTimeMs: number | null;
  createdAt: string;
  session: SearchResultSession;
  highlightedOriginal: string;
  highlightedTranslated: string;
}

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  limit: number;
  offset: number;
}

interface SearchBoxProps {
  /**
   * Restrict search to a specific project UUID.
   * If omitted, searches across all user projects.
   */
  projectId?: string;
  /** Maximum results to display per page. Defaults to 20. */
  limit?: number;
  /** Placeholder text for the search input. */
  placeholder?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 350;
const DEFAULT_LIMIT = 20;

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
  ar: "아랑어",
};

function getLanguageName(code: string | null): string {
  if (!code) return "기타";
  return LANGUAGE_NAMES[code] ?? code;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Debounce hook ─────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─── Client-side highlight: escape HTML first, then wrap matches in <mark> ──
// The server returns highlightedOriginal/highlightedTranslated with <mark> tags.
// We re-apply client-side highlighting from the raw text for maximum safety:
// 1. HTML-escape the raw text
// 2. Build a regex from the current query tokens
// 3. Wrap matches in <mark> tags
// This avoids trusting any server-generated HTML.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeHighlight(text: string, query: string): string {
  if (!text) return "";
  const escaped = escapeHtml(text);
  if (!query || !query.trim()) return escaped;

  const tokens = query
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return escaped;

  // Escape regex special chars in each token
  const regexTokens = tokens.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`(${regexTokens.join("|")})`, "gi");

  return escaped.replace(
    pattern,
    '<mark class="bg-indigo-500/20 text-indigo-300 rounded px-0.5">$1</mark>'
  );
}

// ─── Result card component ─────────────────────────────────────────────────

function ResultCard({
  item,
  query,
  onNavigate,
}: {
  item: SearchResultItem;
  query: string;
  onNavigate: () => void;
}) {
  const highlightedOriginal = safeHighlight(item.originalText, query);
  const highlightedTranslated = safeHighlight(item.translatedText, query);

  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left group rounded-lg border border-gray-800 bg-gray-900 p-3.5 transition-all duration-150 hover:border-indigo-800 hover:bg-gray-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    >
      {/* Header: session date + language badge */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">
          {formatDate(item.session.startedAt)}
          {item.session.endedAt && (
            <span className="text-gray-600 ml-1.5">
              – {formatDate(item.session.endedAt)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {item.isFinal && (
            <span className="text-xs text-emerald-500 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              최종
            </span>
          )}
          <span className="text-xs font-medium text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-full">
            {getLanguageName(item.targetLanguage)}
          </span>
        </div>
      </div>

      {/* Original text with highlights */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500">원본</p>
        <p
          className="text-sm text-gray-300 leading-relaxed line-clamp-2 group-hover:text-gray-200 transition-colors"
          // Safe: safeHighlight escapes all HTML first, then only adds controlled <mark> tags
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: highlightedOriginal }}
        />
      </div>

      {/* Translated text with highlights */}
      <div className="mt-2 pt-2 border-t border-gray-800 space-y-1">
        <p className="text-xs text-gray-500">번역</p>
        <p
          className="text-sm text-indigo-300 leading-relaxed line-clamp-2"
          // Safe: safeHighlight escapes all HTML first, then only adds controlled <mark> tags
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: highlightedTranslated }}
        />
      </div>

      {/* Footer: sequence + timestamp */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs font-mono text-gray-600">
          #{item.sequence}
        </span>
        {item.startTimeMs != null && (
          <span className="text-xs font-mono text-gray-600">
            {formatTimestamp(item.startTimeMs)}
            {item.endTimeMs != null && ` → ${formatTimestamp(item.endTimeMs)}`}
          </span>
        )}
        <span className="ml-auto text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          세션으로 이동 →
        </span>
      </div>
    </button>
  );
}

// ─── Date range filter ─────────────────────────────────────────────────────

function DateRangeFilter({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onChange(e.target.value, endDate)}
        className="rounded-md bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <span className="text-xs text-gray-600">~</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChange(startDate, e.target.value)}
        className="rounded-md bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {(startDate || endDate) && (
        <button
          type="button"
          onClick={() => onChange("", "")}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}

// ─── Main SearchBox component ──────────────────────────────────────────────

export function SearchBox({
  projectId,
  limit = DEFAULT_LIMIT,
  placeholder = "해석 내용 검색...",
}: SearchBoxProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // ─── Fetch search results ─────────────────────────────────────────

  const fetchResults = useCallback(
    async (searchQuery: string, searchOffset: number) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotal(0);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          limit: String(limit),
          offset: String(searchOffset),
        });
        if (projectId) params.set("project_id", projectId);

        const res = await fetch(`/api/search?${params.toString()}`);

        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          setError(body.error ?? "검색 실패");
          setResults([]);
          setTotal(0);
          return;
        }

        const data = (await res.json()) as SearchResponse;

        // Client-side date range filtering
        let filtered = data.results;
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate + "T23:59:59.999Z") : null;

          filtered = filtered.filter((item) => {
            const sessionStart = new Date(item.session.startedAt);
            if (start && sessionStart < start) return false;
            if (end && sessionStart > end) return false;
            return true;
          });
        }

        setResults((prev) =>
          searchOffset === 0 ? filtered : [...prev, ...filtered]
        );
        setTotal(data.total);
        setIsOpen(true);
      } catch {
        setError("네트워크 오류가 발생했습니다");
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, limit, startDate, endDate]
  );

  // ─── Trigger search on debounced query change ─────────────────────

  useEffect(() => {
    setOffset(0);
    fetchResults(debouncedQuery, 0);
  }, [debouncedQuery, fetchResults]);

  // ─── Handlers ─────────────────────────────────────────────────────

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchResults(debouncedQuery, newOffset);
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setOffset(0);
  };

  const navigateToSession = (sessionId: string, startTimeMs: number | null) => {
    const base = `/sessions/${sessionId}`;
    // Append timestamp fragment so the session page can scroll to position
    const url = startTimeMs != null ? `${base}#t=${startTimeMs}` : base;
    router.push(url);
    setIsOpen(false);
  };

  // ─── Render ───────────────────────────────────────────────────────

  const hasResults = results.length > 0;
  const hasMore = results.length < total;

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="5" />
          <path d="M11.5 11.5L14 14" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery && results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-label="검색"
          className="w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="검색 초기화"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3L11 11M11 3L3 11" />
            </svg>
          </button>
        )}
      </div>

      {/* Date range filter — visible when query is present */}
      {query && (
        <div className="mt-2">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />
        </div>
      )}

      {/* Dropdown results panel */}
      {isOpen && query && (
        <div className="absolute z-40 mt-2 w-full max-h-[480px] overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 shadow-xl shadow-black/40">
          {/* Results header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800">
            {isLoading && results.length === 0 ? (
              <span className="text-xs text-gray-500">검색 중...</span>
            ) : (
              <span className="text-xs text-gray-500">
                {total}개 결과
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
              aria-label="닫기"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3L9 9M9 3L3 9" />
              </svg>
            </button>
          </div>

          {/* Loading state */}
          {isLoading && results.length === 0 && (
            <div className="px-4 py-8">
              <div className="space-y-3 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-gray-800 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-28 bg-gray-800 rounded" />
                      <div className="h-3 w-16 bg-gray-800 rounded" />
                    </div>
                    <div className="h-3 w-full bg-gray-800 rounded" />
                    <div className="h-3 w-4/5 bg-gray-800 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">
                &quot;{query}&quot;에 대한 검색 결과가 없습니다
              </p>
              <p className="text-xs text-gray-600 mt-1">
                다른 키워드로 검색해보세요
              </p>
            </div>
          )}

          {/* Result list */}
          {hasResults && (
            <div className="p-2 space-y-1.5">
              {results.map((item) => (
                <ResultCard
                  key={item.id}
                  item={item}
                  query={debouncedQuery}
                  onNavigate={() =>
                    navigateToSession(item.sessionId, item.startTimeMs)
                  }
                />
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="pt-2 pb-1">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-gray-800 py-2 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "로딩 중..." : `더 보기 (${total - results.length}개 남음)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
