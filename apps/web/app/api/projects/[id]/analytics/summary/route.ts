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

/**
 * GET /api/projects/[id]/analytics/summary
 *
 * Returns quick overview stats for dashboard cards:
 *   - total sessions (all time)
 *   - total duration (all time)
 *   - total interpretations (all time)
 *   - total word count (original + translated, all time)
 *   - language breakdown (all time)
 *   - recent activity (last 7 days session count)
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
      .select("id, name, source_lang, target_langs, created_at")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    // 전체 세션 조회
    const { data: sessionsData } = await (supabase as any)
      .from("sessions")
      .select("id, started_at, ended_at, audio_duration_ms")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });

    const sessions = sessionsData || [];
    const totalSessions = sessions.length;

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

    // 최종 해석 조회 (세션 IDs로)
    const sessionIds = sessions.map((s: { id: string }) => s.id);
    let totalInterpretations = 0;
    let totalWordCountOrig = 0;
    let totalWordCountTrans = 0;
    let languageBreakdown: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: interpsData } = await (supabase as any)
        .from("interpretations")
        .select("target_language, original_text, translated_text")
        .in("session_id", sessionIds)
        .eq("is_final", true);

      const interps = interpsData || [];
      totalInterpretations = interps.length;

      for (const interp of interps) {
        const lang = interp.target_language || "unknown";
        languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
        totalWordCountOrig += countWords(interp.original_text);
        totalWordCountTrans += countWords(interp.translated_text);
      }
    }

    // 최근 7일 활동
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentSessions = sessions.filter(
      (s: { started_at: string }) => new Date(s.started_at) >= weekAgo
    );

    return apiSuccess({
      project: {
        id: project.id,
        name: project.name,
        source_lang: project.source_lang,
        target_langs: project.target_langs || [],
        created_at: project.created_at,
      },
      totals: {
        sessions_count: totalSessions,
        total_duration_ms: totalDurationMs,
        interpretations_count: totalInterpretations,
        word_count: {
          original: totalWordCountOrig,
          translated: totalWordCountTrans,
          total: totalWordCountOrig + totalWordCountTrans,
        },
      },
      language_breakdown: Object.entries(languageBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([language, count]) => ({ language, count })),
      recent_activity: {
        sessions_last_7_days: recentSessions.length,
      },
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

function countWords(text: string): number {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
