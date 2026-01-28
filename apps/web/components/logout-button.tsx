"use client";

import { createBrowserClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
    >
      로그아웃
    </button>
  );
}
