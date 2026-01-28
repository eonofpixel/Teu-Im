export { supabase } from "./client";
export type { Database, SessionStatus } from "./types";
export { signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from "./auth";
export { getProjects, getProject, createSession, updateSessionStatus, endSession, saveInterpretation } from "./db";
