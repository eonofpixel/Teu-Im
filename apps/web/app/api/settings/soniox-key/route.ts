import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET - API 키 상태 확인
export async function GET() {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { data: userData } = await (supabase as any)
      .from('users')
      .select('soniox_api_key')
      .eq('id', user.id)
      .single();
    const userDataTyped = userData as { soniox_api_key: string | null } | null;

    const hasKey = !!userDataTyped?.soniox_api_key;
    // 마스킹: 앞 8자만 표시
    const maskedKey = hasKey && userDataTyped?.soniox_api_key
      ? `${userDataTyped.soniox_api_key.slice(0, 8)}...`
      : null;

    return apiSuccess({ exists: hasKey, maskedKey });
  } catch (error) {
    console.error('Get API key error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// POST - API 키 저장
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { apiKey } = await request.json();

    // Soniox API 키는 64자리 hex 문자열
    if (!apiKey || !/^[a-f0-9]{64}$/i.test(apiKey)) {
      return apiError('올바른 Soniox API 키 형식이 아닙니다 (64자리)', { status: 400 });
    }

    // API 키 유효성 검증 (Soniox API 호출)
    const validationResponse = await fetch('https://api.soniox.com/v1/account', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!validationResponse.ok) {
      return apiError('유효하지 않은 API 키입니다', { status: 400 });
    }

    // DB에 저장 (추후 암호화 추가 권장)
    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ soniox_api_key: apiKey })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return apiSuccess({ success: true, message: 'API 키가 저장되었습니다' });
  } catch (error) {
    console.error('Save API key error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// DELETE - API 키 삭제
export async function DELETE() {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { error: updateError } = await (supabase as any)
      .from('users')
      .update({ soniox_api_key: null })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return apiSuccess({ success: true, message: 'API 키가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
