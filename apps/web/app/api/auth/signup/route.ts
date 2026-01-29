import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess, ERRORS } from "@/lib/api-response";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password) {
      return apiError("이메일과 비밀번호를 입력해주세요", { status: 400 });
    }

    if (password.length < 8) {
      return apiError("비밀번호는 8자 이상이어야 합니다", { status: 400 });
    }

    // Create user with admin API (auto-confirmed)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: { name },
      });

    if (authError) {
      // Handle duplicate email
      if (authError.message.includes("already been registered")) {
        return apiError("이미 등록된 이메일입니다", { status: 400 });
      }
      return apiError(authError.message, { status: 400 });
    }

    if (!authData.user) {
      return apiError("회원가입에 실패했습니다", { status: 500 });
    }

    // Create user profile in users table
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || null,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail signup if profile creation fails
    }

    return apiSuccess({
      success: true,
      message: "회원가입이 완료되었습니다",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return apiError(ERRORS.INTERNAL, { status: 500 });
  }
}
