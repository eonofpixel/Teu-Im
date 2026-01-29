import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, ERRORS } from '@/lib/api-response';
import { generateSrt } from '@/lib/srt';

interface RouteParams {
  params: Promise<{ id: string; sessionId: string }>;
}

// GET - 세션 SRT 파일 내보내기
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, sessionId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'translated'; // 'original' | 'translated'
    const language = searchParams.get('language'); // optional: specific target language

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

    // 세션 존재 확인
    const { data: session } = await (supabase as any)
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('project_id', projectId)
      .single();

    if (!session) {
      return apiError('세션을 찾을 수 없습니다', { status: 404 });
    }

    // 해석 데이터 조회
    let query = (supabase as any)
      .from('interpretations')
      .select('sequence, start_time_ms, end_time_ms, original_text, translated_text, target_language')
      .eq('session_id', sessionId)
      .eq('is_final', true)
      .not('start_time_ms', 'is', null)
      .order('sequence', { ascending: true });

    if (language) {
      query = query.eq('target_language', language);
    }

    const { data: interpretations, error } = await query;

    if (error) {
      throw error;
    }

    const rows = interpretations as Array<{
      sequence: number;
      start_time_ms: number;
      end_time_ms: number;
      original_text: string;
      translated_text: string;
      target_language: string;
    }>;

    const entries = rows.map((i) => ({
      sequence: i.sequence,
      startTimeMs: i.start_time_ms,
      endTimeMs: i.end_time_ms,
      text: type === 'original' ? i.original_text : i.translated_text,
    }));

    const srtContent = generateSrt(entries);
    const filename = `session_${sessionId}_${type}${language ? `_${language}` : ''}.srt`;

    return new NextResponse(srtContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export SRT error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
