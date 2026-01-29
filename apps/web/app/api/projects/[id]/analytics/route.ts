import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, ERRORS } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

interface AnalyticsRow {
  date: string;
  total_sessions: number;
  total_duration_ms: number;
  total_interpretations: number;
  word_count_original: number;
  word_count_translated: number;
}

interface InterpretationRow {
  target_language: string | null;
  original_text: string;
  translated_text: string;
  created_at: string;
}

/**
 * GET /api/projects/[id]/analytics
 *
 * Query params:
 *   from_date  - ISO date string (YYYY-MM-DD), defaults to 30 days ago
 *   to_date    - ISO date string (YYYY-MM-DD), defaults to today
 *   granularity - "day" | "week" | "month", defaults to "day"
 *
 * Returns aggregated analytics: time series, totals, language breakdown
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    // 프로젝트 소유권 확인
    const { data: project } = await (supabase as any)
      .from("projects")
      .select("id, source_lang, target_langs")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const granularity = (searchParams.get("granularity") || "day") as
      | "day"
      | "week"
      | "month";

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const fromDate = searchParams.get("from_date") || formatDate(defaultFrom);
    const toDate = searchParams.get("to_date") || formatDate(now);

    // 유효성 검사
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return apiError("유효하지 않은 날짜 형식입니다 (YYYY-MM-DD)", { status: 400 });
    }

    // analytics_daily에서 집계된 데이터 조회
    const { data: analyticsData } = await (supabase as any)
      .from("analytics_daily")
      .select(
        "date, total_sessions, total_duration_ms, total_interpretations, word_count_original, word_count_translated"
      )
      .eq("project_id", projectId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    const rows: AnalyticsRow[] = analyticsData || [];

    // 세션에서 직접 집계 (analytics_daily가 비어있을 경우 실시간 집계)
    const { data: sessionsData } = await (supabase as any)
      .from("sessions")
      .select("id, started_at, ended_at, audio_duration_ms")
      .eq("project_id", projectId)
      .gte("started_at", fromDate + "T00:00:00+00:00")
      .lte("started_at", toDate + "T23:59:59+00:00")
      .order("started_at", { ascending: true });

    const sessions = sessionsData || [];

    // 해석 데이터에서 언어 분포 조회
    const sessionIds = sessions.map((s: { id: string }) => s.id);
    const languageBreakdown: Record<string, number> = {};
    let totalWordCountOrig = 0;
    let totalWordCountTrans = 0;
    let totalInterpretations = 0;
    let interps: InterpretationRow[] = [];

    if (sessionIds.length > 0) {
      const { data: interpsData } = await (supabase as any)
        .from("interpretations")
        .select("target_language, original_text, translated_text, created_at")
        .in("session_id", sessionIds)
        .eq("is_final", true)
        .order("created_at", { ascending: true });

      interps = interpsData || [];
      totalInterpretations = interps.length;

      // 언어별 해석 수 집계
      for (const interp of interps) {
        const lang = interp.target_language || "unknown";
        languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;

        // 단어 수 집계
        totalWordCountOrig += countWords(interp.original_text);
        totalWordCountTrans += countWords(interp.translated_text);
      }
    }

    // 총 재생 시간 계산
    let totalDurationMs = 0;
    for (const session of sessions) {
      if (session.ended_at && session.started_at) {
        totalDurationMs +=
          new Date(session.ended_at).getTime() -
          new Date(session.started_at).getTime();
      } else if (session.audio_duration_ms) {
        totalDurationMs += session.audio_duration_ms;
      }
    }

    // 시간 축 데이터 생성 (granularity별 그룹화)
    const timeSeries = buildTimeSeries(sessions, interps, granularity, fromDate, toDate);

    // PreAggregated analytics_daily 데이터와 직접 집계된 데이터 결합
    // analytics_daily가 있으면 우선 사용, 없으면 실시간 집계 결과 사용
    const totals = rows.length > 0
      ? {
          sessions_count: rows.reduce((sum, r) => sum + r.total_sessions, 0),
          total_duration_ms: rows.reduce((sum, r) => sum + r.total_duration_ms, 0),
          interpretations_count: rows.reduce((sum, r) => sum + r.total_interpretations, 0),
          word_count: {
            original: rows.reduce((sum, r) => sum + r.word_count_original, 0),
            translated: rows.reduce((sum, r) => sum + r.word_count_translated, 0),
          },
        }
      : {
          sessions_count: sessions.length,
          total_duration_ms: totalDurationMs,
          interpretations_count: totalInterpretations,
          word_count: {
            original: totalWordCountOrig,
            translated: totalWordCountTrans,
          },
        };

    return apiSuccess({
      totals,
      language_breakdown: Object.entries(languageBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([language, count]) => ({ language, count })),
      time_series: timeSeries,
      metadata: {
        from_date: fromDate,
        to_date: toDate,
        granularity,
        project_id: projectId,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// ─── 유틸 함수 ─────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr + "T00:00:00Z");
  return !isNaN(date.getTime());
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function getGranularityKey(date: Date, granularity: "day" | "week" | "month"): string {
  switch (granularity) {
    case "day":
      return formatDate(date);
    case "week": {
      // 주의일(월요일)로 정렬
      const d = new Date(date);
      const day = d.getUTCDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return formatDate(d);
    }
    case "month":
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
}

interface TimeSeriesPoint {
  date: string;
  sessions: number;
  duration_ms: number;
  interpretations: number;
  word_count: number;
}

function buildTimeSeries(
  sessions: Array<{ id: string; started_at: string; ended_at: string | null; audio_duration_ms: number | null }>,
  interpretations: InterpretationRow[],
  granularity: "day" | "week" | "month",
  fromDate: string,
  toDate: string
): TimeSeriesPoint[] {
  const buckets = new Map<string, TimeSeriesPoint>();

  // 세션별 집계
  for (const session of sessions) {
    const date = new Date(session.started_at);
    const key = getGranularityKey(date, granularity);

    if (!buckets.has(key)) {
      buckets.set(key, { date: key, sessions: 0, duration_ms: 0, interpretations: 0, word_count: 0 });
    }
    const bucket = buckets.get(key)!;
    bucket.sessions += 1;

    if (session.ended_at && session.started_at) {
      bucket.duration_ms +=
        new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
    } else if (session.audio_duration_ms) {
      bucket.duration_ms += session.audio_duration_ms;
    }
  }

  // 해석별 집계
  for (const interp of interpretations) {
    const date = new Date(interp.created_at);
    const key = getGranularityKey(date, granularity);

    if (!buckets.has(key)) {
      buckets.set(key, { date: key, sessions: 0, duration_ms: 0, interpretations: 0, word_count: 0 });
    }
    const bucket = buckets.get(key)!;
    bucket.interpretations += 1;
    bucket.word_count += countWords(interp.original_text) + countWords(interp.translated_text);
  }

  // 날짜순 정렬
  return Array.from(buckets.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
