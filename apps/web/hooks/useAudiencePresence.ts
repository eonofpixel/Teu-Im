"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AudiencePresenceState {
  /** Total number of viewers currently in the session */
  totalCount: number;
  /** Viewer count grouped by their selected language code */
  byLanguage: Record<string, number>;
}

export interface UseAudiencePresenceParams {
  /** The session ID to track presence on. Pass `null` to skip. */
  sessionId: string | null;
  /** The language this viewer has selected (sent as presence metadata). */
  selectedLanguage: string | null;
  /** When `true`, the hook will not send presence for this client. */
  passive?: boolean;
}

// ─── Presence payload shape ──────────────────────────────────────────────────

interface PresenceMeta {
  language: string | null;
}

// ─── Aggregation helper ──────────────────────────────────────────────────────

/**
 * Given the raw presence state map from Supabase (keyed by arbitrary
 * client key, values are arrays of presence payloads), flatten into
 * a total count and a per-language breakdown.
 */
function aggregate(
  presenceState: Record<string, PresenceMeta[]>
): AudiencePresenceState {
  let totalCount = 0;
  const byLanguage: Record<string, number> = {};

  for (const entries of Object.values(presenceState)) {
    for (const entry of entries) {
      totalCount += 1;
      const lang = entry.language ?? "unknown";
      byLanguage[lang] = (byLanguage[lang] ?? 0) + 1;
    }
  }

  return { totalCount, byLanguage };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Tracks audience presence for a live interpretation session using
 * Supabase Realtime Presence.
 *
 * Each viewer joins the presence channel with their selected language
 * as metadata. The hook returns a live aggregate of viewer count and
 * per-language breakdown.
 *
 * Channel naming: `session-presence:${sessionId}`
 *
 * @param params.sessionId       Session to track. `null` → no-op.
 * @param params.selectedLanguage Language code this viewer has chosen.
 * @param params.passive         If `true`, listen only—do not send own presence.
 */
export function useAudiencePresence({
  sessionId,
  selectedLanguage,
  passive = false,
}: UseAudiencePresenceParams): AudiencePresenceState {
  const [state, setState] = useState<AudiencePresenceState>({
    totalCount: 0,
    byLanguage: {},
  });

  // Refs to hold the channel and the latest selectedLanguage so the
  // track callback always has access to the current value without
  // needing to re-run the effect.
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const languageRef = useRef(selectedLanguage);

  // Keep languageRef in sync with the prop
  useEffect(() => {
    languageRef.current = selectedLanguage;

    // If we already have an active channel, update our own presence
    // so the new language is reflected immediately.
    if (channelRef.current && !passive) {
      const meta: PresenceMeta = { language: selectedLanguage };
      channelRef.current.track(meta);
    }
  }, [selectedLanguage, passive]);

  // ─── Main subscription effect ───────────────────────────────────────────
  const subscribeEffect = useCallback(() => {
    if (!sessionId) {
      setState({ totalCount: 0, byLanguage: {} });
      return;
    }

    const supabase = createClient();
    const channelName = `session-presence:${sessionId}`;

    const channel = supabase
      .channel(channelName, {
        config: {
          presence: {
            // Each client is uniquely identified internally by Supabase;
            // we use a short key so the payload stays small.
            key: `viewer`,
          },
        },
      })
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<PresenceMeta>();
        setState(aggregate(presenceState));
      })
      .on("presence", { event: "join" }, () => {
        const presenceState = channel.presenceState<PresenceMeta>();
        setState(aggregate(presenceState));
      })
      .on("presence", { event: "leave" }, () => {
        const presenceState = channel.presenceState<PresenceMeta>();
        setState(aggregate(presenceState));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !passive) {
          // Send this viewer's presence once subscribed
          const meta: PresenceMeta = { language: languageRef.current };
          await channel.track(meta);
        }
      });

    channelRef.current = channel;

    // Cleanup function returned to the calling effect
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setState({ totalCount: 0, byLanguage: {} });
    };
  }, [sessionId, passive]);

  useEffect(() => {
    const cleanup = subscribeEffect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [subscribeEffect]);

  return state;
}
