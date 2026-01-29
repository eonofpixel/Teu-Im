import { NextRequest } from "next/server";
import { createServerClient as createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, ERRORS } from "@/lib/api-response";
import { validateJoinProject } from "@/lib/validation";
import { generateToken } from "@/lib/audience-token";
import { authLimiter } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Token lifetime in milliseconds (15 minutes). */
const TOKEN_TTL_MS = 15 * 60 * 1000;

// ─── POST /api/audience/token ────────────────────────────────────────────────
// 프로젝트 참석자용 단기 토큰 발급 (15분 유효)
// Input:  { code: string, password: string }
// Output: { token: string, expiresAt: string, projectId: string, sessionId: string | null }

export async function POST(request: NextRequest) {
  // ─── Rate limiting ──────────────────────────────────────────────────────

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = authLimiter.check(ip);

  if (!rateLimit.allowed) {
    return apiError(ERRORS.RATE_LIMITED, {
      status: 429,
      rateLimitHeaders: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
    });
  }

  try {
    const supabase = await createClient();
    const body = await request.json() as Record<string, unknown>;

    // ─── 입력 검증 ──────────────────────────────────────────────────────

    const validation = validateJoinProject(body);
    if (!validation.valid) {
      return apiError(validation.error, { status: 400 });
    }
    const { code, password } = validation.data;

    // ─── 프로젝트 조회 ───────────────────────────────────────────────────

    const { data: project, error: projectError } = await (supabase as any)
      .from("projects")
      .select("id, name, password, source_lang, target_lang, status")
      .eq("code", code.toUpperCase())
      .single();

    const projectData = project as {
      id: string;
      name: string;
      password: string;
      source_lang: string;
      target_lang: string;
      status: string;
    } | null;

    if (projectError || !projectData) {
      return apiError("프로젝트를 찾을 수 없습니다", { status: 404 });
    }

    // ─── 비밀번호 확인 ───────────────────────────────────────────────────
    // 프로젝트 존재 여부와 구분하지 않음 (정보 유출 방지)

    if (projectData.password !== password.toUpperCase()) {
      return apiError("프로젝트를 찾을 수 없습니다", { status: 404 });
    }

    // 인증 성공 시 해당 IP의 속도 제한 카운터 초기화
    authLimiter.reset(ip);

    // ─── 활성 세션 확인 ──────────────────────────────────────────────────

    const { data: activeSession } = await (supabase as any)
      .from("sessions")
      .select("id")
      .eq("project_id", projectData.id)
      .eq("status", "active")
      .single();
    const activeSessionData = activeSession as { id: string } | null;

    // ─── 토큰 생성 ───────────────────────────────────────────────────────

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    const token = generateToken(
      projectData.id,
      activeSessionData?.id ?? null,
      expiresAt
    );

    return apiSuccess(
      {
        token,
        expiresAt,
        projectId: projectData.id,
        sessionId: activeSessionData?.id ?? null,
      },
      {
        rateLimitHeaders: { remaining: rateLimit.remaining, resetAt: rateLimit.resetAt },
      }
    );
  } catch (error) {
    logError("POST /api/audience/token", error as Error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
