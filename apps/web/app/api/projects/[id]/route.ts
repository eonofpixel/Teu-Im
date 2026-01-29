import { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, ERRORS } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET - 프로젝트 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { data: project, error } = await (supabase as any)
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return apiError(ERRORS.NOT_FOUND, { status: 404 });
    }

    return apiSuccess({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// Helper function to generate random code
function generateRandomCode(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

// PATCH - 프로젝트 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const updates = await request.json() as Record<string, unknown>;

    // 허용된 필드만 업데이트
    const allowedFields = ['name', 'source_lang', 'target_lang', 'target_langs', 'status'];
    const filteredUpdates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Handle password regeneration
    if (updates.regeneratePassword === true) {
      filteredUpdates.password = generateRandomCode(4);
    }

    // Handle code regeneration
    if (updates.regenerateCode === true) {
      filteredUpdates.code = generateRandomCode(6);
    }

    const { data: project, error } = await (supabase as any)
      .from('projects')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return apiSuccess({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}

// DELETE - 프로젝트 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError(ERRORS.UNAUTHORIZED, { status: 401 });
    }

    const { error } = await (supabase as any)
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
