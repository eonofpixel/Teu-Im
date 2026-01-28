import { useState, useEffect, useCallback, useRef } from "react";
import type { Interpretation } from "@teu-im/shared";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ConnectionState } from "@/components/ConnectionStatus";

interface UseRealtimeInterpretationsReturn {
  interpretations: Interpretation[];
  connectionStatus: ConnectionState;
  isLoading: boolean;
}

/**
 * Supabase Realtime을 통해 특정 세션의 통역 내역을 실시간으로 구독하는 훅
 *
 * @param sessionId - 구독할 세션 ID. null이면 구독하지 않음.
 * @returns 실시간 통역 내역 배열과 연결 상태
 */
export function useRealtimeInterpretations(
  sessionId: string | null
): UseRealtimeInterpretationsReturn {
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionState>("disconnected");
  const [isLoading, setIsLoading] = useState(false);

  // 기존 구독을 정리하기 위한 ref
  const subscriptionRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<{
    unsubscribe: () => void;
  } | null>(null);

  // 기존 통역 내역 초기 로드
  const loadInitialInterpretations = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("interpretations")
        .select(
          "id, session_id, original_text, translated_text, target_language, is_final, sequence, created_at"
        )
        .eq("session_id", sessionId)
        .order("sequence", { ascending: true });

      if (error) {
        console.error("초기 통역 내역 로드 실패:", error);
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
          createdAt: row.created_at as string,
        }));
        setInterpretations(mapped);
      }
    } catch (err) {
      console.error("초기 통역 내역 로드 오류:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Realtime 구독 시작
  useEffect(() => {
    if (!sessionId) {
      setInterpretations([]);
      setConnectionStatus("disconnected");
      return;
    }

    const supabase = getSupabaseClient();

    // 초기 데이터 로드
    loadInitialInterpretations();

    // Realtime 구독 설정
    const channel = supabase
      .channel(`interpretations:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE 모두 구독
          schema: "public",
          table: "interpretations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT" || eventType === "UPDATE") {
            const row = payload.new as {
              id: string;
              session_id: string;
              original_text: string;
              translated_text: string;
              target_language: string;
              is_final: boolean;
              sequence: number;
              created_at: string;
            };

            const newItem: Interpretation = {
              id: row.id,
              sessionId: row.session_id,
              originalText: row.original_text,
              translatedText: row.translated_text,
              targetLanguage: row.target_language ?? "",
              isFinal: row.is_final,
              sequence: row.sequence,
              createdAt: row.created_at,
            };

            setInterpretations((prev) => {
              // UPDATE 시 기존 항목 교체, INSERT 시 추가
              const existingIndex = prev.findIndex((item) => item.id === newItem.id);

              if (existingIndex >= 0) {
                // UPDATE: 기존 항목을 교체
                const updated = [...prev];
                updated[existingIndex] = newItem;
                return updated;
              }

              // INSERT: 새 항목 추가 (sequence 순서 유지)
              const newList = [...prev, newItem];
              newList.sort((a, b) => a.sequence - b.sequence);
              return newList;
            });
          } else if (eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setInterpretations((prev) =>
              prev.filter((item) => item.id !== oldRow.id)
            );
          }
        }
      )
      .subscribe((status) => {
        switch (status) {
          case "SUBSCRIBED":
            setConnectionStatus("connected");
            break;
          case "CHANNEL_ERROR":
            setConnectionStatus("reconnecting");
            break;
          case "TIMED_OUT":
            setConnectionStatus("reconnecting");
            break;
          case "CLOSED":
            setConnectionStatus("disconnected");
            break;
          default:
            break;
        }
      });

    channelRef.current = channel;

    // 클린업: 구독 해제
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (subscriptionRef.current) {
        clearTimeout(subscriptionRef.current);
      }
    };
  }, [sessionId, loadInitialInterpretations]);

  return {
    interpretations,
    connectionStatus,
    isLoading,
  };
}
