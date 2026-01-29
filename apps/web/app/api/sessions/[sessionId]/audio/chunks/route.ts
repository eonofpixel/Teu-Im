import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
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

interface PostBody {
  chunk_index: number;
  storage_path: string;
  start_time_ms: number;
  end_time_ms: number;
  file_size_bytes: number;
}

/**
 * POST - 오디오 청크 메타데이터 등록
 * Body: { chunk_index, storage_path, start_time_ms, end_time_ms, file_size_bytes }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 세션 존재 및 소유권 확인
    const { data: session } = await (supabase as any)
      .from('sessions')
      .select('id, project_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
    }

    const { data: project } = await (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', (session as { project_id: string }).project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: '프로젝트 소유권 확인 실패' }, { status: 403 });
    }

    // 요청 본문 파싱
    const body: PostBody = await request.json();

    if (
      body.chunk_index == null ||
      !body.storage_path ||
      body.start_time_ms == null ||
      body.end_time_ms == null ||
      body.file_size_bytes == null
    ) {
      return NextResponse.json(
        { error: 'chunk_index, storage_path, start_time_ms, end_time_ms, file_size_bytes 필수' },
        { status: 400 }
      );
    }

    if (body.end_time_ms <= body.start_time_ms) {
      return NextResponse.json({ error: 'end_time_ms는 start_time_ms보다 커야 합니다' }, { status: 400 });
    }

    // audio_chunks 테이블에 삽입
    const { data: chunk, error: insertError } = await (supabase as any)
      .from('audio_chunks')
      .insert({
        session_id: sessionId,
        chunk_index: body.chunk_index,
        storage_path: body.storage_path,
        start_time_ms: body.start_time_ms,
        end_time_ms: body.end_time_ms,
        file_size_bytes: body.file_size_bytes,
      })
      .select()
      .single();

    if (insertError) {
      // 중복 청크 인덱스 처리 (23505 = unique_violation)
      if (insertError.code === '23505') {
        return NextResponse.json({ error: '이미 등록된 청크 인덱스입니다' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ chunk }, { status: 201 });
  } catch (error) {
    console.error('Register audio chunk error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

/**
 * GET - 세션의 오디오 청크 목록 조회 (presigned URL 포함)
 * Query params: ?limit=100&offset=0
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 세션 존재 및 소유권 확인
    const { data: session } = await (supabase as any)
      .from('sessions')
      .select('id, project_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
    }

    const { data: project } = await (supabase as any)
      .from('projects')
      .select('id')
      .eq('id', (session as { project_id: string }).project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: '프로젝트 소유권 확인 실패' }, { status: 403 });
    }

    // 페이지네이션 파라미터
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 청크 목록 조회 (chunk_index 순)
    const { data: chunks, error, count } = await (supabase as any)
      .from('audio_chunks')
      .select('*', { count: 'exact' })
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // 각 청크에 대해 presigned URL 생성
    const chunksWithUrls = await Promise.all(
      (chunks as AudioChunkRow[]).map(async (chunk) => {
        const { data: signedUrl } = await supabase.storage
          .from('session-audio')
          .createSignedUrl(chunk.storage_path, 3600); // 1시간 유효

        return {
          ...chunk,
          signed_url: signedUrl,
        };
      })
    );

    return NextResponse.json({
      chunks: chunksWithUrls,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List audio chunks error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
