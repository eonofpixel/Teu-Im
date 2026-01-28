import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Support both Next.js (process.env) and Vite (import.meta.env)
const getEnv = (key: string): string | undefined => {
  // Vite environment
  if (typeof import.meta !== "undefined" && (import.meta as unknown as Record<string, unknown>).env) {
    return ((import.meta as unknown as Record<string, unknown>).env as Record<string, string>)[key];
  }
  // Node.js / Next.js environment
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

const SUPABASE_URL =
  getEnv("VITE_SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_KEY =
  getEnv("VITE_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase URL:", SUPABASE_URL);
  console.error("Supabase Key:", SUPABASE_KEY ? "[SET]" : "[NOT SET]");
  throw new Error(
    "환경변수 SUPABASE_URL, SUPABASE_ANON_KEY가 설정되지 않았습니다. (VITE_* 또는 NEXT_PUBLIC_* 접두사 필요)"
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

export type { Database };
