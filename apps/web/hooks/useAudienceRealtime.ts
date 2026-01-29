"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Interpretation } from "@teu-im/shared";
import { createClient } from "@/lib/supabase/client";
import { captureError, captureMessage } from "@/lib/error-tracking";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseAudienceRealtimeParams {
  sessionId: string | null;
  targetLanguage: string | null;
  sessionEnded?: boolean;
}

export interface UseAudienceRealtimeResult {
  interpretations: Interpretation[];
  connectionStatus: "connecting" | "connected" | "disconnected" | "error" | "ended";
  error: Error | null;
}

// ─── Internal row type matching the Supabase schema ──────────────────────────

interface InterpretationRow {
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: InterpretationRow): Interpretation {
  return {
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
}

/**
 * Merge a new or updated interpretation into the master list.
 * Deduplicates by id and keeps the list sorted by sequence.
 */
function mergeInterpretation(
  prev: Interpretation[],
  item: Interpretation
): Interpretation[] {
  const idx = prev.findIndex((p) => p.id === item.id);
  let next: Interpretation[];

  if (idx >= 0) {
    next = [...prev];
    next[idx] = item;
  } else {
    next = [...prev, item];
  }

  next.sort((a, b) => a.sequence - b.sequence);
  return next;
}

/**
 * From a sorted list of interpretations, keep all final entries plus only
 * the single latest non-final entry (highest sequence). This surfaces the
 * "live" in-progress chunk without flooding the UI with every partial.
 */
function filterForAudience(items: Interpretation[]): Interpretation[] {
  const finals: Interpretation[] = [];
  let latestNonFinal: Interpretation | null = null;

  for (const item of items) {
    if (item.isFinal) {
      finals.push(item);
    } else {
      // items are sorted by sequence ascending, so the last one wins
      latestNonFinal = item;
    }
  }

  if (latestNonFinal) {
    // Insert at the correct position to maintain sequence order
    const insertIdx = finals.findIndex(
      (f) => f.sequence > latestNonFinal!.sequence
    );
    if (insertIdx === -1) {
      finals.push(latestNonFinal);
    } else {
      finals.splice(insertIdx, 0, latestNonFinal);
    }
  }

  return finals;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Real-time audience subscription hook for live interpretation sessions.
 *
 * Subscribes to INSERT and UPDATE events on the `interpretations` table
 * filtered server-side by `session_id`, then applies client-side language
 * filtering and the final/non-final presentation rule.
 *
 * Connection lifecycle:
 *   - idle        → no sessionId provided, nothing happens
 *   - connecting  → channel created, waiting for SUBSCRIBED status
 *   - connected   → actively receiving events
 *   - disconnected → CLOSED or TIMED_OUT (Supabase auto-reconnects internally)
 *   - error       → CHANNEL_ERROR; retried via useEffect re-trigger
 *
 * @param params.sessionId     The session to observe. Pass `null` to skip.
 * @param params.targetLanguage Client-side language filter. Pass `null` for all.
 */
export function useAudienceRealtime({
  sessionId,
  targetLanguage,
  sessionEnded = false,
}: UseAudienceRealtimeParams): UseAudienceRealtimeResult {
  // ─── State ───────────────────────────────────────────────────────────────

  /** Master list: every interpretation received for this session */
  const [allInterpretations, setAllInterpretations] = useState<
    Interpretation[]
  >([]);

  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error" | "ended"
  >("disconnected");

  const [error, setError] = useState<Error | null>(null);

  /** Tracks the number of reconnection attempts for exponential backoff */
  const [retryCount, setRetryCount] = useState<number>(0);

  // ─── Refs ────────────────────────────────────────────────────────────────

  /** Holds the active channel so the cleanup function can unsubscribe */
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  /**
   * Tracks whether a reconnect attempt is already scheduled to avoid
   * stacking multiple timeouts.
   */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Derived: language-filtered & audience-shaped interpretations ────────

  const interpretations = useMemo((): Interpretation[] => {
    let filtered = allInterpretations;

    // Client-side language filter
    if (targetLanguage) {
      filtered = filtered.filter((i) => i.targetLanguage === targetLanguage);
    }

    // Keep all finals + latest non-final only
    return filterForAudience(filtered);
  }, [allInterpretations, targetLanguage]);

  // ─── Session ended override ─────────────────────────────────────────────

  useEffect(() => {
    if (sessionEnded) {
      setConnectionStatus("ended");
    }
  }, [sessionEnded]);

  // ─── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    // Guard: nothing to subscribe to without a session
    if (!sessionId || sessionEnded) {
      setAllInterpretations([]);
      setConnectionStatus("disconnected");
      setError(null);
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    const supabase = createClient();

    const channel = supabase
      .channel(`audience-live:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interpretations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as InterpretationRow;
          const item = mapRow(row);

          setAllInterpretations((prev) => {
            // Deduplicate: skip if we already have this exact id
            if (prev.some((p) => p.id === item.id)) return prev;
            return mergeInterpretation(prev, item);
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
          const row = payload.new as InterpretationRow;
          const item = mapRow(row);

          setAllInterpretations((prev) => mergeInterpretation(prev, item));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "interpretations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.old as InterpretationRow;
          if (!row?.id) return;

          setAllInterpretations((prev) => prev.filter((p) => p.id !== row.id));
        }
      )
      .subscribe((status) => {
        switch (status) {
          case "SUBSCRIBED":
            setConnectionStatus("connected");
            setError(null);
            setRetryCount(0); // Reset retry count on successful connection
            // Clear any pending reconnect timer on successful connection
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
            }
            break;

          case "CHANNEL_ERROR":
            setConnectionStatus("error");
            const channelError = new Error("Realtime channel error. Attempting reconnect...");
            setError(channelError);

            // Track channel error
            captureError(channelError, {
              component: "useAudienceRealtime",
              action: "realtime_channel_error",
              extra: {
                sessionId,
                targetLanguage,
                retryCount,
              },
            });

            // Schedule a reconnect with exponential backoff
            if (!reconnectTimerRef.current) {
              // Calculate exponential backoff: 1s, 2s, 4s, 8s (max)
              const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);

              reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                if (channelRef.current) {
                  channelRef.current.unsubscribe();
                  channelRef.current = null;
                }
                // Increment retry count and trigger re-subscription
                setRetryCount((prev) => prev + 1);
                setConnectionStatus("connecting");
                setError(null);
              }, backoffMs);
            }
            break;

          case "TIMED_OUT":
            setConnectionStatus("disconnected");
            const timeoutError = new Error("Connection timed out. Waiting for reconnect...");
            setError(timeoutError);

            // Track timeout event
            captureMessage("Realtime connection timed out", {
              component: "useAudienceRealtime",
              action: "realtime_timeout",
              extra: {
                sessionId,
                targetLanguage,
              },
            });
            break;

          case "CLOSED":
            setConnectionStatus("disconnected");
            const closedError = new Error("Realtime connection closed.");
            setError(closedError);

            // Track connection closed event
            captureMessage("Realtime connection closed", {
              component: "useAudienceRealtime",
              action: "realtime_closed",
              extra: {
                sessionId,
                targetLanguage,
              },
            });
            break;

          default:
            break;
        }
      });

    channelRef.current = channel;

    // ─── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
    // Note: retryCount and targetLanguage are intentionally not in deps
    // They are captured for logging context only and should not trigger re-subscription
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, sessionEnded]);

  return {
    interpretations,
    connectionStatus,
    error,
  };
}
