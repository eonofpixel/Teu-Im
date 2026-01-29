// Desktop client (basic @supabase/supabase-js)
export { supabase } from "./client";

// SSR clients for Next.js apps (browser only - server exports cause bundling issues)
export { getSupabaseBrowserClient, createSupabaseBrowserClient } from "./browser";
// Note: For server client, import directly from "@teu-im/supabase/src/server"

// Types
export type { Database, SessionStatus } from "./types";

// Auth helpers (for desktop)
export { signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from "./auth";

// DB helpers (for desktop)
export { getProjects, getProject, createSession, updateSessionStatus, endSession, saveInterpretation } from "./db";
