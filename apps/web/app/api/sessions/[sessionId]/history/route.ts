import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, ERRORS } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// ─── 타입 정의 ──────────────────────────────────────────────

interface InterpretationRow {
  id: string;
  session_id: string;
  original_text: string;
  translated_text: string;
  is_final: boolean;
  sequence: number;
  created_at: string;
  target_language: string | null;
  start_time_ms: number | null;
  end_time_ms: number | null;
}

interface AudioChunkRow {
  id: string;
  session_id: string;
  chunk_index: number;
  storage_path: string;
  start_time_ms: number;
  end_time_ms: number;
  duration_ms: number;
  file_size_bytes: number;
  created_at: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  audio_file_path: string | null;
  audio_duration_ms: number | null;
}

// ─── 유효성 검사 헬퍼 ──────────────────────────────────────

function parsePaginationParams(searchParams: URLSearchParams): {
  limit: number;
  cursor: string | null;
  language: string | null;
  includeChunks: boolean;
} {
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.max(1, Math.min(rawLimit, 200));
  const cursor = searchParams.get("cursor") || null;
  const language = searchParams.get("language") || null;
  const includeChunks = searchParams.get("include_chunks") !== "false";

  return { limit, cursor, language, includeChunks };
}

function decodeCursor(cursor: string): { sequence: number; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as { sequence: number; id: string };
    if (typeof parsed.sequence === "number" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(sequence: number, id: string): string {
  return Buffer.from(JSON.stringify({ sequence, id })).toString("base64");
}

// ─── 프로젝트 소유권 검증 ──────────────────────────────────

async function verifyOwnership(
  supabase: any,
  sessionId: string,
  userId: string
): Promise<{ session: SessionRow } | { error: string; status: number }> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, project_id, status, started_at, ended_at, audio_file_path, audio_duration_ms")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { error: "세션을 찾을 수 없습니다", status: 404 };
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", (session as SessionRow).project_id)
    .eq("user_id", userId)
    .single();

  if (projectError || !project) {
    return { error: "프로젝트 소유권 확인 실패", status: 403 };
  }

  return { session: session as SessionRow };
}

// ─── GET /api/sessions/[sessionId]/history ──────────────────
//
// 세션의 해석 내역을 시간순으로 조회합니다.
// 커서 기반 페이지네이션 지원.
//
// Query params:
//   limit          - 페이지당 항목 수 (기본 50, 최대 200)
//   cursor         - 다음 페이지 커서 (API 응답의 next_cursor 값)
//   language       - 타겟 언어 코드로 필터링 (예: "en", "ja")
//   include_chunks - "false"이면 오디오 청크 정보 제외 (기본 true)
//
// 응답 구조:
//   interpretations[] - 해석 목록 (sequence 순)
//   audio_chunks[]    - 해석 시간 범위에 해당하는 오디오 청크 (include_chunks=true)
//   session           - 세션 메타데이터
//   pagination        - next_cursor, has_more, count

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    // 세션 존재 및 소유권 확인
    const ownershipResult = await verifyOwnership(supabase, sessionId, user.id);
    if ("error" in ownershipResult) {
      return apiError(ownershipResult.error, { status: ownershipResult.status });
    }
    const { session } = ownershipResult;

    // 페이지네이션 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const { limit, cursor, language, includeChunks } = parsePaginationParams(searchParams);

    // 커서 디코딩
    let cursorData: { sequence: number; id: string } | null = null;
    if (cursor) {
      cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return apiError(ERRORS.VALIDATION, { status: 400 });
      }
    }

    // 해석 조회 쿼리 구성
    let query = (supabase as any)
      .from("interpretations")
      .select("*", { count: "exact" })
      .eq("session_id", sessionId)
      .eq("is_final", true);

    // 언어 필터
    if (language) {
      query = query.eq("target_language", language);
    }

    // 커서 기반 페이지네이션: sequence 순 정렬 후 커서 이후 항목만 조회
    if (cursorData) {
      query = query
        .or(
          `sequence.gt.${cursorData.sequence},and(sequence.eq.${cursorData.sequence},id.gt.${cursorData.id})`
        );
    }

    query = query.order("sequence", { ascending: true }).order("id", { ascending: true }).limit(limit + 1); // 하나 더 조회하여 has_more 판단

    const { data: interpretationsRaw, error: interpError, count: totalCount } =
      await query;

    if (interpError) {
      throw interpError;
    }

    const interpretations = (interpretationsRaw as InterpretationRow[]) || [];

    // has_more 판단
    const hasMore = interpretations.length > limit;
    if (hasMore) {
      interpretations.pop(); // 초과 항목 제거
    }

    // 다음 커서 생성
    const lastItem = interpretations[interpretations.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? encodeCursor(lastItem.sequence, lastItem.id)
        : null;

    // 응답 해석 데이터 포맷팅
    const formattedInterpretations = interpretations.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      original_text: row.original_text,
      translated_text: row.translated_text,
      target_language: row.target_language,
      is_final: row.is_final,
      start_time_ms: row.start_time_ms,
      end_time_ms: row.end_time_ms,
      created_at: row.created_at,
    }));

    // 오디오 청크 조회 (해석 시간 범위 기준)
    let audioChunks: Array<AudioChunkRow & { signed_url: string | null }> = [];

    if (includeChunks && interpretations.length > 0) {
      // 현재 페이지 해석의 시간 범위 계산
      const timestampedInterps = interpretations.filter(
        (i) => i.start_time_ms !== null && i.end_time_ms !== null
      );

      if (timestampedInterps.length > 0) {
        const minStartMs = Math.min(
          ...timestampedInterps.map((i) => i.start_time_ms!)
        );
        const maxEndMs = Math.max(
          ...timestampedInterps.map((i) => i.end_time_ms!)
        );

        // 시간 범위와 겹치는 청크 조회
        const { data: chunksRaw, error: chunkError } = await (supabase as any)
          .from("audio_chunks")
          .select("*")
          .eq("session_id", sessionId)
          .lte("start_time_ms", maxEndMs)
          .gte("end_time_ms", minStartMs)
          .order("chunk_index", { ascending: true });

        if (chunkError) {
          throw chunkError;
        }

        const chunks = (chunksRaw as AudioChunkRow[]) || [];

        // Presigned URL 생성
        audioChunks = await Promise.all(
          chunks.map(async (chunk) => {
            const { data: signedData } = await supabase.storage
              .from("session-audio")
              .createSignedUrl(chunk.storage_path, 3600);

            return {
              ...chunk,
              signed_url: signedData?.signedUrl ?? null,
            };
          })
        );
      }
    }

    // 세션 메타데이터
    const sessionMeta = {
      id: session.id,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      audio_duration_ms: session.audio_duration_ms,
    };

    return apiSuccess({
      interpretations: formattedInterpretations,
      audio_chunks: audioChunks,
      session: sessionMeta,
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore,
        count: formattedInterpretations.length,
        total: totalCount ?? 0,
      },
    });
  } catch (error) {
    console.error("Fetch session history error:", error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
