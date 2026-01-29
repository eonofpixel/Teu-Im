import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let cachedClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  // Trim to remove any trailing newlines from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "환경변수 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다."
    );
  }

  cachedClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return cachedClient;
}

// Non-singleton version for cases that need fresh client
export function createSupabaseBrowserClient() {
  // Trim to remove any trailing newlines from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "환경변수 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
