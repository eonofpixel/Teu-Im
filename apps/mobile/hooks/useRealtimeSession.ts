"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Interpretation } from "@teu-im/shared";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ConnectionState } from "@/components/ConnectionStatus";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseRealtimeSessionReturn {
  /** All interpretations for the session (filtered by selected language if set) */
  interpretations: Interpretation[];
  /** All distinct target languages seen in the session */
  availableLanguages: string[];
  /** Currently selected language filter (null = show all) */
  selectedLanguage: string | null;
  /** Set the active language filter */
  setSelectedLanguage: (lang: string | null) => void;
  /** Supabase Realtime connection status */
  connectionStatus: ConnectionState;
  /** True while the initial historical data is being fetched */
  isLoading: boolean;
  /** Last error encountered, if any */
  error: string | null;
  /** Ref to attach to the scroll container's bottom sentinel for auto-scroll */
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Real-time attendee view hook backed by Supabase Realtime.
 *
 * Responsibilities:
 *   1. Fetch historical interpretations for `sessionId` on mount.
 *   2. Subscribe to INSERT / UPDATE events on the `interpretations` table
 *      filtered to the given session.
 *   3. Maintain a sorted list, deduplicated by `id`.
 *   4. Expose language filtering helpers for multi-language sessions.
 *   5. Auto-scroll to the latest item whenever the list grows.
 *
 * @param sessionId  The active session to observe. Pass `null` to skip.
 */
export function useRealtimeSession(
  sessionId: string | null
): UseRealtimeSessionReturn {
  // ─── State ─────────────────────────────────────────────────────────────

  /** Master list: every interpretation received for this session */
  const [allInterpretations, setAllInterpretations] = useState<Interpretation[]>([]);
  /** Which language the attendee wants to see (null = all) */
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for auto-scroll sentinel
  const bottomRef = useRef<HTMLDivElement>(null);
  // Track previous count so we only scroll when new items arrive
  const prevCountRef = useRef(0);

  // Channel ref for cleanup
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  // ─── Derived: available languages ──────────────────────────────────────

  const availableLanguages = useCallback((): string[] => {
    const seen = new Set<string>();
    for (const item of allInterpretations) {
      if (item.targetLanguage) seen.add(item.targetLanguage);
    }
    return Array.from(seen).sort();
  }, [allInterpretations]);

  // ─── Derived: filtered interpretations ─────────────────────────────────

  const interpretations = useCallback((): Interpretation[] => {
    if (!selectedLanguage) return allInterpretations;
    return allInterpretations.filter((i) => i.targetLanguage === selectedLanguage);
  }, [allInterpretations, selectedLanguage]);

  // ─── Auto-scroll on new items ──────────────────────────────────────────

  useEffect(() => {
    const filtered = interpretations();
    if (filtered.length > prevCountRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = filtered.length;
  }, [interpretations]);

  // ─── Initial load ──────────────────────────────────────────────────────

  const loadHistorical = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error: dbError } = await supabase
        .from("interpretations")
        .select(
          "id, session_id, original_text, translated_text, target_language, is_final, sequence, start_time_ms, end_time_ms, created_at"
        )
        .eq("session_id", sessionId)
        .order("sequence", { ascending: true });

      if (dbError) {
        console.error("[useRealtimeSession] historical load error:", dbError);
        setError("기존 통역 내역을 로드할 수 없습니다.");
        return;
      }

      if (data) {
        const mapped: Interpretation[] = (data as Array<Record<string, unknown>>).map((row) => ({
          id: row.id as string,
          sessionId: row.session_id as string,
          originalText: row.original_text as string,
          translatedText: row.translated_text as string,
          targetLanguage: (row.target_language as string) ?? "",
          isFinal: row.is_final as boolean,
          sequence: row.sequence as number,
          startTimeMs: row.start_time_ms as number | undefined,
          endTimeMs: row.end_time_ms as number | undefined,
          createdAt: row.created_at as string,
        }));
        setAllInterpretations(mapped);
      }
    } catch (err) {
      console.error("[useRealtimeSession] unexpected error:", err);
      setError("예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // ─── Realtime subscription ─────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) {
      setAllInterpretations([]);
      setConnectionStatus("disconnected");
      setSelectedLanguage(null);
      return;
    }

    // Load historical data first
    loadHistorical();

    const supabase = getSupabaseClient();

    const channel = supabase
      .channel(`session-live:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interpretations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            session_id: string;
            original_text: string;
            translated_text: string;
            target_language: string | null;
            is_final: boolean;
            sequence: number;
            start_time_ms: number | null;
            end_time_ms: number | null;
            created_at: string;
          };

          const item: Interpretation = {
            id: row.id,
            sessionId: row.session_id,
            originalText: row.original_text,
            translatedText: row.translated_text,
            targetLanguage: row.target_language ?? "",
            isFinal: row.is_final,
            sequence: row.sequence,
            startTimeMs: row.start_time_ms ?? undefined,
            endTimeMs: row.end_time_ms ?? undefined,
            createdAt: row.created_at,
          };

          setAllInterpretations((prev) => {
            // Guard: skip if we already have this id
            if (prev.some((p) => p.id === item.id)) return prev;
            const next = [...prev, item];
            next.sort((a, b) => a.sequence - b.sequence);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "interpretations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            session_id: string;
            original_text: string;
            translated_text: string;
            target_language: string | null;
            is_final: boolean;
            sequence: number;
            start_time_ms: number | null;
            end_time_ms: number | null;
            created_at: string;
          };

          const item: Interpretation = {
            id: row.id,
            sessionId: row.session_id,
            originalText: row.original_text,
            translatedText: row.translated_text,
            targetLanguage: row.target_language ?? "",
            isFinal: row.is_final,
            sequence: row.sequence,
            startTimeMs: row.start_time_ms ?? undefined,
            endTimeMs: row.end_time_ms ?? undefined,
            createdAt: row.created_at,
          };

          setAllInterpretations((prev) => {
            const idx = prev.findIndex((p) => p.id === item.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = item;
              return next;
            }
            // Treat as new if not found (race with initial load)
            const next = [...prev, item];
            next.sort((a, b) => a.sequence - b.sequence);
            return next;
          });
        }
      )
      .subscribe((status) => {
        switch (status) {
          case "SUBSCRIBED":
            setConnectionStatus("connected");
            setError(null);
            break;
          case "CHANNEL_ERROR":
            setConnectionStatus("reconnecting");
            setError("실시간 연결에 문제가 있습니다. 자동 복구 중...");
            break;
          case "TIMED_OUT":
            setConnectionStatus("reconnecting");
            setError("연결 타임아웃. 자동 재시도 중...");
            break;
          case "CLOSED":
            setConnectionStatus("disconnected");
            setError("실시간 연결이 종료되었습니다.");
            break;
          default:
            break;
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [sessionId, loadHistorical]);

  return {
    interpretations: interpretations(),
    availableLanguages: availableLanguages(),
    selectedLanguage,
    setSelectedLanguage,
    connectionStatus,
    isLoading,
    error,
    bottomRef,
  };
}
