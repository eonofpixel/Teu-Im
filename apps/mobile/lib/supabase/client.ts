import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@teu-im/supabase";

/**
 * 클라이언트 사이드 Supabase 인스턴스
 *
 * @supabase/ssr의 createBrowserClient를 사용하여
 * Next.js 클라이언트 컴포넌트에서 사용할 수 있는 인스턴스를 생성합니다.
 * 싱글턴 패턴으로 불필요한 중복 생성을 방지합니다.
 */

let cachedClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "환경변수 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다."
    );
  }

  cachedClient = createBrowserClient<Database>(supabaseUrl, supabaseKey);

  return cachedClient;
}
