import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';
import { validateJoinProject } from '@/lib/validation';
import { verifyToken } from '@/lib/audience-token';
import { logError } from '@/lib/logger';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-audience-token',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── 속도 제한 (in-memory, 프로젝트 코드별) ───────────────────

const RATE_LIMIT_MAX = 5; // 1분당 최대 요청 수
const RATE_LIMIT_WINDOW_MS = 60_000;

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // 새 윈도우 시작
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { limited: false, remaining: RATE_LIMIT_MAX - 1, resetAt: Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000) };
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  const resetAt = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS) / 1000);
  return { limited: entry.count > RATE_LIMIT_MAX, remaining, resetAt };
}

// POST - 프로젝트 참여 (참석자용)
// 비밀번호 인증 또는 토큰 인증 두 가지 경로를 지원합니다.
//   • 토큰 경로: x-audience-token 헤더에 유효한 토큰이 있으면 비밀번호 검증을 건너뜁니다.
//   • 비밀번호 경로: code + password로 기존 방식과 동일합니다.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json() as Record<string, unknown>;
    const audienceToken = request.headers.get("x-audience-token");

    // ─── 토큰 인증 경로 ────────────────────────────────────────────────────

    if (audienceToken) {
      const tokenPayload = verifyToken(audienceToken);
      if (!tokenPayload) {
        return apiError('토큰이 유효하지 않거나 만료되었습니다', { status: 401 });
      }

      // 토큰에서 projectId로 프로젝트 조회
      const { data: project, error: projectError } = await (supabase as any)
        .from('projects')
        .select('id, name, source_lang, target_lang, status')
        .eq('id', tokenPayload.projectId)
        .single();
      const projectData = project as { id: string; name: string; source_lang: string; target_lang: string; status: string } | null;

      if (projectError || !projectData) {
        return apiError('프로젝트를 찾을 수 없습니다', { status: 404 });
      }

      // 활성 세션 확인 (토큰 생성 시의 세션이 아직 활성인지 재확인)
      const { data: activeSession } = await (supabase as any)
        .from('sessions')
        .select('id')
        .eq('project_id', projectData.id)
        .eq('status', 'active')
        .single();
      const activeSessionData = activeSession as { id: string } | null;

      return apiSuccess({
        projectId: projectData.id,
        projectName: projectData.name,
        sourceLanguage: projectData.source_lang,
        targetLanguage: projectData.target_lang,
        status: projectData.status,
        sessionId: activeSessionData?.id || null,
      });
    }

    // ─── 비밀번호 인증 경로 ─────────────────────────────────────────────────

    // 입력 검증
    const validation = validateJoinProject(body);
    if (!validation.valid) {
      return apiError(validation.error, { status: 400 });
    }
    const { code, password } = validation.data;

    // 속도 제한 확인 (프로젝트 코드별)
    const rateLimit = checkRateLimit(code.toUpperCase());
    if (rateLimit.limited) {
      return apiError(ERRORS.RATE_LIMITED, {
        status: 429,
        rateLimitHeaders: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
      });
    }

    // 프로젝트 조회
    const { data: project, error: projectError } = await (supabase as any)
      .from('projects')
      .select('id, name, password, source_lang, target_lang, status')
      .eq('code', code.toUpperCase())
      .single();
    const projectData = project as { id: string; name: string; password: string; source_lang: string; target_lang: string; status: string } | null;

    if (projectError || !projectData) {
      return apiError('프로젝트를 찾을 수 없습니다', { status: 404 });
    }

    // 비밀번호 확인 — 고의적으로 프로젝트 존재 여부와 구분하지 않음 (정보 유출 방지)
    if (projectData.password !== password.toUpperCase()) {
      return apiError('프로젝트를 찾을 수 없습니다', { status: 404 });
    }

    // 활성 세션 확인
    const { data: activeSession } = await (supabase as any)
      .from('sessions')
      .select('id')
      .eq('project_id', projectData.id)
      .eq('status', 'active')
      .single();
    const activeSessionData = activeSession as { id: string } | null;

    return apiSuccess({
      projectId: projectData.id,
      projectName: projectData.name,
      sourceLanguage: projectData.source_lang,
      targetLanguage: projectData.target_lang,
      status: projectData.status,
      sessionId: activeSessionData?.id || null,
    });
  } catch (error) {
    logError('POST /api/join', error as Error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
