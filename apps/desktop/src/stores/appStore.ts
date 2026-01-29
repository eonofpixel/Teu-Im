import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Project, Session } from "@teu-im/shared";

interface InterpretationHistoryItem {
  originalText: string;
  translatedText: string;
  isFinal: boolean;
  sequence: number;
}

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Project
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // Session
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;

  // Recording / Streaming state
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;

  isStreaming: boolean;
  setIsStreaming: (value: boolean) => void;

  // Soniox 연결 및 통역 상태
  isSonioxConnected: boolean;
  setSonioxConnected: (connected: boolean) => void;

  currentOriginalText: string;
  currentTranslatedText: string;
  setCurrentTexts: (original: string, translated: string) => void;

  interpretationHistory: InterpretationHistoryItem[];
  addToHistory: (item: InterpretationHistoryItem) => void;
  clearHistory: () => void;

  // 전체 초기화
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Project
      currentProject: null,
      setCurrentProject: (project) =>
        set({ currentProject: project, currentSession: null }),

      // Session
      currentSession: null,
      setCurrentSession: (session) => set({ currentSession: session }),

      // Recording
      isRecording: false,
      setIsRecording: (value) => set({ isRecording: value }),

      // Streaming
      isStreaming: false,
      setIsStreaming: (value) => set({ isStreaming: value }),

      // Soniox 연결 상태
      isSonioxConnected: false,
      setSonioxConnected: (connected) => set({ isSonioxConnected: connected }),

      // 현재 통역 텍스트
      currentOriginalText: '',
      currentTranslatedText: '',
      setCurrentTexts: (original, translated) =>
        set({ currentOriginalText: original, currentTranslatedText: translated }),

      // 통역 이력
      interpretationHistory: [],
      addToHistory: (item) =>
        set((state) => ({
          interpretationHistory: [...state.interpretationHistory, item],
        })),
      clearHistory: () => set({ interpretationHistory: [] }),

      // 전체 초기화
      reset: () =>
        set({
          user: null,
          currentProject: null,
          currentSession: null,
          isRecording: false,
          isStreaming: false,
          isSonioxConnected: false,
          currentOriginalText: '',
          currentTranslatedText: '',
          interpretationHistory: [],
        }),
    }),
    {
      name: 'teu-im-desktop-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist auth and project state, not transient states
      partialize: (state) => ({
        user: state.user,
        currentProject: state.currentProject,
      }),
    }
  )
);
