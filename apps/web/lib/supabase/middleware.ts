import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return null session if env vars are missing (graceful degradation)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase environment variables not configured");
    return { session: null, supabase: null };
  }

  try {
    const supabase = createSupabaseServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options as any);
            });
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return { session, supabase };
  } catch (error) {
    console.error("Error updating Supabase session:", error);
    return { session: null, supabase: null };
  }
}
