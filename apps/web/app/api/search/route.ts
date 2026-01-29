import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createClient } from "@/lib/supabase/server";

// ─── Response types ────────────────────────────────────────────────────────

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
  session: {
    startedAt: string;
    endedAt: string | null;
  };
  /**
   * Client-side highlight map: positions of the query terms inside the text.
   * We wrap matched tokens in <mark> tags so the frontend can render them
   * without additional parsing.
   */
  highlightedOriginal: string;
  highlightedTranslated: string;
}

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Utility: wrap query tokens in <mark> for highlighting ────────────────

function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;

  // Split query into individual tokens, filter empties
  const tokens = query
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return text;

  // Build a regex that matches any of the tokens (case-insensitive, word-boundary)
  const escaped = tokens.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  return text.replace(pattern, "<mark>$1</mark>");
}

// ─── Utility: parse & validate query params ───────────────────────────────

function parseParams(url: URL): {
  q: string;
  projectId: string | null;
  limit: number;
  offset: number;
} | null {
  const q = url.searchParams.get("q")?.trim() ?? "";
  const projectId = url.searchParams.get("project_id");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");

  const limit = limitRaw ? parseInt(limitRaw, 10) : 20;
  const offset = offsetRaw ? parseInt(offsetRaw, 10) : 0;

  if (isNaN(limit) || limit < 1 || limit > 100) return null;
  if (isNaN(offset) || offset < 0) return null;

  return { q, projectId, limit, offset };
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // Parse params
    const params = parseParams(request.nextUrl);
    if (!params) {
      return NextResponse.json(
        { error: "잘못된 요청 파라미터입니다 (limit: 1-100, offset: >= 0)" },
        { status: 400 }
      );
    }

    const { q, projectId, limit, offset } = params;

    // Empty query returns empty results (not an error)
    if (!q) {
      const response: SearchResponse = {
        results: [],
        total: 0,
        limit,
        offset,
      };
      return NextResponse.json(response);
    }

    // If project_id provided, verify ownership
    if (projectId) {
      const { data: project } = await (supabase as any)
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (!project) {
        return NextResponse.json(
          { error: "프로젝트를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
    }

    // Determine which project(s) to search.
    // If no project_id, search across all of the user's projects by
    // collecting their IDs first (respects RLS ownership).
    let searchProjectIds: string[];

    if (projectId) {
      searchProjectIds = [projectId];
    } else {
      const { data: projects } = await (supabase as any)
        .from("projects")
        .select("id")
        .eq("user_id", user.id);

      searchProjectIds = (projects as { id: string }[]).map((p) => p.id);
    }

    if (searchProjectIds.length === 0) {
      const response: SearchResponse = {
        results: [],
        total: 0,
        limit,
        offset,
      };
      return NextResponse.json(response);
    }

    // Execute search across each project and merge results.
    // For single-project queries (the common case) this is one RPC call.
    // For cross-project queries we fan out but keep total <= limit.
    let allResults: SearchResultItem[] = [];
    let totalCount = 0;

    for (const pid of searchProjectIds) {
      // Fetch count
      const { data: countData } = await (supabase as any).rpc(
        "count_search_interpretations",
        { query: q, p_project_id: pid }
      );
      totalCount += (countData as number) ?? 0;

      // Fetch results (only if we still need more)
      const remaining = limit - allResults.length;
      if (remaining <= 0) continue;

      const { data: rows, error: searchError } = await (supabase as any).rpc(
        "search_interpretations",
        {
          query: q,
          p_project_id: pid,
          p_limit: remaining,
          // Offset only applies when searching a single project
          p_offset: searchProjectIds.length === 1 ? offset : 0,
        }
      );

      if (searchError) {
        console.error("Search RPC error:", searchError);
        return NextResponse.json({ error: "검색 중 오류가 발생했습니다" }, {
          status: 500,
        });
      }

      const typed = rows as Array<{
        interpretation_id: string;
        session_id: string;
        original_text: string;
        translated_text: string;
        target_language: string | null;
        is_final: boolean;
        sequence: number;
        start_time_ms: number | null;
        end_time_ms: number | null;
        created_at: string;
        session_started_at: string;
        session_ended_at: string | null;
        rank: number;
      }>;

      for (const row of typed) {
        allResults.push({
          id: row.interpretation_id,
          sessionId: row.session_id,
          originalText: row.original_text,
          translatedText: row.translated_text,
          targetLanguage: row.target_language,
          isFinal: row.is_final,
          sequence: row.sequence,
          startTimeMs: row.start_time_ms,
          endTimeMs: row.end_time_ms,
          createdAt: row.created_at,
          session: {
            startedAt: row.session_started_at,
            endedAt: row.session_ended_at,
          },
          highlightedOriginal: highlightMatches(row.original_text, q),
          highlightedTranslated: highlightMatches(row.translated_text, q),
        });
      }
    }

    // For cross-project queries, apply offset after merge
    if (searchProjectIds.length > 1) {
      allResults = allResults.slice(offset, offset + limit);
    }

    const response: SearchResponse = {
      results: allResults,
      total: totalCount,
      limit,
      offset,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search endpoint error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
