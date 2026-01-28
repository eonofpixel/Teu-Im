import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-white mb-3">Teu-Im</h1>
        <p className="text-gray-400 mb-8">실시간 실제 통역 관리 플랫폼</p>
        <a
          href="/login"
          className="block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          시작하기
        </a>
      </div>
    </div>
  );
}
