import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - 세션 시작
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 프로젝트 소유권 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: project, error: projectError } = await (supabase as any)
      .from('projects')
      .select('id, user_id, status')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    // 기존 활성 세션 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSession } = await (supabase as any)
      .from('sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();
    const existingSessionData = existingSession as { id: string } | null;

    if (existingSessionData) {
      return NextResponse.json(
        { error: '이미 활성 세션이 있습니다', sessionId: existingSessionData.id },
        { status: 409 }
      );
    }

    // 새 세션 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('projects')
      .update({ status: 'active' })
      .eq('id', projectId);

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// GET - 세션 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 프로젝트 소유권 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: project } = await (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions, error } = await (supabase as any)
      .from('sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
