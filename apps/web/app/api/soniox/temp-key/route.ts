import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: object, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: '인증이 필요합니다' }, 401);
    }

    const accessToken = authHeader.slice(7);

    // 2. 토큰으로 Supabase 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );

    // 3. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return jsonResponse({ error: '인증이 필요합니다' }, 401);
    }

    const { projectId } = await request.json();

    // 4. 프로젝트 소유권 확인
    const { data: project, error: projectError } = await (supabase as any)
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();
    const projectData = project as { id: string; user_id: string } | null;

    if (projectError || !projectData) {
      return jsonResponse({ error: '프로젝트를 찾을 수 없습니다' }, 404);
    }

    if (projectData.user_id !== user.id) {
      return jsonResponse({ error: '권한이 없습니다' }, 403);
    }

    // 5. 사용자의 Soniox API 키 조회
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('soniox_api_key')
      .eq('id', user.id)
      .single();
    const userDataTyped = userData as { soniox_api_key: string | null } | null;

    if (userError || !userDataTyped?.soniox_api_key) {
      return jsonResponse(
        { error: 'Soniox API 키가 설정되지 않았습니다. 설정에서 API 키를 등록해주세요.' },
        400
      );
    }

    // 6. Soniox API로 임시 키 발급 요청
    const sonioxResponse = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userDataTyped.soniox_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 300, // 5분
      }),
    });

    if (!sonioxResponse.ok) {
      const errorData = await sonioxResponse.json().catch(() => ({}));
      console.error('Soniox API error:', sonioxResponse.status, errorData);
      return jsonResponse({ error: `Soniox API 오류: ${errorData.message || sonioxResponse.status}` }, 502);
    }

    const sonioxData = await sonioxResponse.json();
    console.log('Soniox temp key response:', { hasApiKey: !!sonioxData.api_key, keyLength: sonioxData.api_key?.length });
    const tempApiKey = sonioxData.api_key;

    // 7. 응답 반환
    return jsonResponse({
      tempApiKey,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      websocketUrl: 'wss://stt-rt.soniox.com/transcribe-websocket',
    });

  } catch (error) {
    console.error('Temp key API error:', error);
    return jsonResponse({ error: '서버 오류가 발생했습니다' }, 500);
  }
}
