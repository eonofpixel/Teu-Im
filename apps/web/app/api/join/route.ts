import { NextRequest } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';
import { validateJoinProject } from '@/lib/validation';
import { logError } from '@/lib/logger';

// POST - 프로젝트 참여 (참석자용)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json() as Record<string, unknown>;

    // 입력 검증
    const validation = validateJoinProject(body);
    if (!validation.valid) {
      return apiError(validation.error, { status: 400 });
    }
    const { code, password } = validation.data;

    // 프로젝트 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
