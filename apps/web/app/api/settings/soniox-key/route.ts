import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET - API 키 상태 확인
export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { data: userData } = await (supabase as any)
      .from('users')
      .select('soniox_api_key')
      .eq('id', user.id)
      .single();
    const userDataTyped = userData as { soniox_api_key: string | null } | null;

    const hasKey = !!userDataTyped?.soniox_api_key;
    const maskedKey = hasKey ? 'sk_***' : null;

    return NextResponse.json({ exists: hasKey, maskedKey });
  } catch (error) {
    console.error('Get API key error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// POST - API 키 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: '올바른 Soniox API 키 형식이 아닙니다' },
        { status: 400 }
      );
    }

    // API 키 유효성 검증 (Soniox API 호출)
    const validationResponse = await fetch('https://api.soniox.com/v1/account', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!validationResponse.ok) {
      return NextResponse.json(
        { error: '유효하지 않은 API 키입니다' },
        { status: 400 }
      );
    }

    // DB에 저장 (추후 암호화 추가 권장)
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ soniox_api_key: apiKey })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'API 키가 저장되었습니다' });
  } catch (error) {
    console.error('Save API key error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// DELETE - API 키 삭제
export async function DELETE() {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ soniox_api_key: null })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'API 키가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
