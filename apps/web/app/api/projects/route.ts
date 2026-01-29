import { NextRequest } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { generateProjectCode } from '@teu-im/shared';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';
import { validateCreateProject } from '@/lib/validation';
import { logError } from '@/lib/logger';

// GET - 프로젝트 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { data: projects, error } = await (supabase as any)
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return apiSuccess({ projects }, { cacheTtl: 10 });
  } catch (error) {
    logError('GET /api/projects', error as Error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// POST - 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;

    // 입력 검증
    const validation = validateCreateProject(body);
    if (!validation.valid) {
      return apiError(validation.error, { status: 400 });
    }

    const { name, sourceLanguage, targetLanguages: resolvedTargetLangs } = validation.data;

    // 고유 프로젝트 코드 생성
    let code = generateProjectCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await (supabase as any)
        .from('projects')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;

      code = generateProjectCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return apiError('프로젝트 코드 생성에 실패했습니다', { status: 500 });
    }

    // 참석자 비밀번호 생성 (4자리)
    const password = Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data: project, error } = await (supabase as any)
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        code,
        password,
        source_lang: sourceLanguage,
        target_lang: resolvedTargetLangs[0], // primary target (backward compat)
        target_langs: resolvedTargetLangs,   // full multi-language array
        status: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return apiSuccess({ project }, { status: 201 });
  } catch (error) {
    logError('POST /api/projects', error as Error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
