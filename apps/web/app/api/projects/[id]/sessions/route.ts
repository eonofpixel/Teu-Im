import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// POST - 세션 시작
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    // 프로젝트 소유권 확인
    const { data: project, error: projectError } = await (supabase as any)
      .from('projects')
      .select('id, user_id, status')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    // 기존 활성 세션 확인
    const { data: existingSession } = await (supabase as any)
      .from('sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();
    const existingSessionData = existingSession as { id: string } | null;

    if (existingSessionData) {
      // Return existing session ID in the response body (not details which is stripped in production)
      return NextResponse.json(
        {
          error: '이미 활성 세션이 있습니다',
          sessionId: existingSessionData.id
        },
        {
          status: 409,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // 새 세션 생성
    const { data: session, error: sessionError } = await (supabase as any)
      .from('sessions')
      .insert({
        project_id: projectId,
        status: 'active',
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    // 프로젝트 상태 업데이트
    await (supabase as any)
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId);

    return apiSuccess({ session }, { status: 201 });
  } catch (error) {
    console.error('Create session error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// GET - 세션 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    // 프로젝트 소유권 확인
    const { data: project } = await (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    const { data: sessions, error } = await (supabase as any)
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false });

    if (error) {
      throw error;
    }

    return apiSuccess({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
