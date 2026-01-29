import { NextRequest, NextResponse } from "next/server";
import { createServerClient as createClient } from "@/lib/supabase/server";
import {
  exportSubtitles,
  type SubtitleEntry,
  type SubtitleFormat,
  type SubtitleLanguage,
} from "@teu-im/shared";

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

const VALID_FORMATS: SubtitleFormat[] = ["srt", "vtt"];
const VALID_LANGUAGES: SubtitleLanguage[] = ["original", "translated", "both"];

// GET /api/sessions/[sessionId]/export?format=srt|vtt&language=original|translated|both
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // --- Query parameter validation ---
    const format = (searchParams.get("format") || "srt") as SubtitleFormat;
    const language = (searchParams.get("language") ||
      "translated") as SubtitleLanguage;
    const targetLanguage = searchParams.get("targetLanguage"); // optional: filter by specific target language

    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${VALID_FORMATS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        {
          error: `Invalid language. Supported: ${VALID_LANGUAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // --- Auth ---
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // --- Session lookup and ownership verification ---
    const { data: session } = await (supabase as any)
      .from("sessions")
      .select("id, project_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const { data: project } = await (supabase as any)
      .from("projects")
      .select("id")
      .eq("id", session.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // --- Fetch interpretations ---
    let query = (supabase as any)
      .from("interpretations")
      .select(
        "sequence, start_time_ms, end_time_ms, original_text, translated_text, target_language"
      )
      .eq("session_id", sessionId)
      .eq("is_final", true)
      .not("start_time_ms", "is", null)
      .not("end_time_ms", "is", null)
      .order("start_time_ms", { ascending: true });

    if (targetLanguage) {
      query = query.eq("target_language", targetLanguage);
    }

    const { data: interpretations, error } = await query;

    if (error) {
      throw error;
    }

    // --- Map DB rows to SubtitleEntry ---
    const entries: SubtitleEntry[] = (
      interpretations as Array<{
        sequence: number;
        start_time_ms: number;
        end_time_ms: number;
        original_text: string;
        translated_text: string;
        target_language: string;
      }>
    ).map((row) => ({
      sequence: row.sequence,
      startTimeMs: row.start_time_ms,
      endTimeMs: row.end_time_ms,
      originalText: row.original_text,
      translatedText: row.translated_text,
      targetLanguage: row.target_language,
    }));

    // --- Generate export ---
    const result = exportSubtitles(entries, sessionId, {
      format,
      language,
    });

    return new NextResponse(result.content, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error("Export subtitle error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
