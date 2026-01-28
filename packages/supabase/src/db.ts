import { supabase } from "./client";
import type { Database } from "./types";
import type { Project, Session } from "@teu-im/shared";

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

function toProject(row: ProjectRow): Project {
  // Derive targetLangs: prefer the dedicated column if present, otherwise wrap the primary targetLang
  const targetLangs: string[] =
    (row as unknown as { target_langs?: string[] }).target_langs ??
    (row.target_lang ? [row.target_lang] : []);

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    code: row.code,
    password: row.password,
    sourceLang: row.source_lang as Project["sourceLang"],
    targetLang: row.target_lang as Project["targetLang"],
    targetLangs,
    status: row.status as Project["status"],
    createdAt: row.created_at,
    updatedAt: (row as unknown as { updated_at?: string }).updated_at,
  };
}

function toSession(row: SessionRow): Session {
  const extended = row as unknown as {
    name?: string;
    audio_file_path?: string;
    audio_duration_ms?: number;
    created_at?: string;
    updated_at?: string;
  };

  return {
    id: row.id,
    projectId: row.project_id,
    name: extended.name,
    status: row.status as Session["status"],
    audioFilePath: extended.audio_file_path,
    audioDurationMs: extended.audio_duration_ms,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    createdAt: extended.created_at,
    updatedAt: extended.updated_at,
  };
}

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ProjectRow[]).map(toProject);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  if (!data) return null;
  return toProject(data as ProjectRow);
}

export async function createSession(projectId: string): Promise<Session> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("sessions")
    .insert({ project_id: projectId })
    .select()
    .single();

  if (error) throw error;
  return toSession(data as SessionRow);
}

export async function updateSessionStatus(
  sessionId: string,
  status: "active" | "paused" | "ended"
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase as any).from("sessions");
  if (status === "ended") {
    const { error } = await query
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) throw error;
  } else {
    const { error } = await query
      .update({ status })
      .eq("id", sessionId);
    if (error) throw error;
  }
}

export async function endSession(sessionId: string): Promise<void> {
  await updateSessionStatus(sessionId, "ended");
}

export async function saveInterpretation(
  sessionId: string,
  originalText: string,
  translatedText: string,
  isFinal: boolean,
  sequence: number,
  options?: {
    targetLanguage?: string;
    startTimeMs?: number;
    endTimeMs?: number;
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("interpretations").insert({
    session_id: sessionId,
    original_text: originalText,
    translated_text: translatedText,
    is_final: isFinal,
    sequence,
    ...(options?.targetLanguage && { target_language: options.targetLanguage }),
    ...(options?.startTimeMs != null && { start_time_ms: options.startTimeMs }),
    ...(options?.endTimeMs != null && { end_time_ms: options.endTimeMs }),
  });

  if (error) throw error;
}
