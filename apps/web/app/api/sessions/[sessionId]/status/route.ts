import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

const VALID_STATUSES = ['active', 'paused', 'ended'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Helper to get authenticated user from either cookies or Bearer token
async function getAuthenticatedUser(request: NextRequest) {
  // First try Bearer token from Authorization header (for desktop app)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { user, supabase };
    }
  }

  // Fall back to cookie-based auth (for web app)
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!error && user) {
    return { user, supabase };
  }

  return { user: null, supabase: null };
}

// PATCH - 세션 상태 업데이트
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const { user, supabase } = await getAuthenticatedUser(request);
    if (!user || !supabase) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as ValidStatus)) {
      return apiError('유효한 상태가 필요합니다 (active, paused, ended)', { status: 400 });
    }

    // 세션 조회 및 프로젝트 소유권 확인
    const { data: session, error: sessionError } = await (supabase as any)
      .from('sessions')
      .select('id, project_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return apiError('세션을 찾을 수 없습니다', { status: 404 });
    }

    // 프로젝트 소유권 확인
    const { data: project, error: projectError } = await (supabase as any)
      .from('projects')
      .select('id, user_id')
      .eq('id', session.project_id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    // 상태 전이 유효성 검사
    const currentStatus = session.status as string;
    const validTransitions: Record<string, string[]> = {
      idle: ['active'],
      active: ['paused', 'ended'],
      paused: ['active', 'ended'],
      ended: [],
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return apiError(
        `'${currentStatus}'에서 '${status}'로 전이할 수 없습니다`,
        { status: 409 }
      );
    }

    // 세션 상태 업데이트
    const updateData: Record<string, unknown> = { status };
    if (status === 'ended') {
      updateData.ended_at = new Date().toISOString();
    }

    const { data: updatedSession, error: updateError } = await (supabase as any)
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return apiSuccess({ session: updatedSession });
  } catch (error) {
    console.error('Update session status error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
