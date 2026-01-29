import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { LiveWaveform } from "@/components/LiveWaveform";
import {
  StatefulButton,
  StreamingTextSimple,
  ConnectionIndicator,
  getLanguageNativeName,
  type SessionState,
  type ConnectionStatus,
} from "@teu-im/ui";
import {
  startMultiLangSoniox,
  stopMultiLangSoniox,
  cancelMultiLangSoniox,
  pauseMultiLangSoniox,
  resumeMultiLangSoniox,
} from "@/lib/soniox";
import { createSession, endSession } from "@teu-im/supabase";

// Language code to display name mapping
const LANGUAGE_NAMES: Record<string, { name: string; nativeName: string }> = {
  ko: { name: "Korean", nativeName: "한국어" },
  en: { name: "English", nativeName: "English" },
  ja: { name: "Japanese", nativeName: "日本語" },
  zh: { name: "Chinese", nativeName: "中文" },
  es: { name: "Spanish", nativeName: "Español" },
  fr: { name: "French", nativeName: "Français" },
  de: { name: "German", nativeName: "Deutsch" },
  pt: { name: "Portuguese", nativeName: "Português" },
  ru: { name: "Russian", nativeName: "Русский" },
  ar: { name: "Arabic", nativeName: "العربية" },
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code]?.nativeName || getLanguageNativeName(code) || code.toUpperCase();
}

// Subtle color accents per language for translation panels
const LANGUAGE_ACCENTS: Record<string, { border: string; text: string; label: string }> = {
  en: { border: "border-blue-800/40", text: "text-blue-300", label: "text-blue-400" },
  ja: { border: "border-rose-800/40", text: "text-rose-300", label: "text-rose-400" },
  zh: { border: "border-amber-800/40", text: "text-amber-300", label: "text-amber-400" },
  es: { border: "border-orange-800/40", text: "text-orange-300", label: "text-orange-400" },
  fr: { border: "border-indigo-800/40", text: "text-indigo-300", label: "text-indigo-400" },
  de: { border: "border-yellow-800/40", text: "text-yellow-300", label: "text-yellow-400" },
  pt: { border: "border-green-800/40", text: "text-green-300", label: "text-green-400" },
  ru: { border: "border-cyan-800/40", text: "text-cyan-300", label: "text-cyan-400" },
  ar: { border: "border-teal-800/40", text: "text-teal-300", label: "text-teal-400" },
  ko: { border: "border-purple-800/40", text: "text-purple-300", label: "text-purple-400" },
};

function getLanguageAccent(code: string) {
  return LANGUAGE_ACCENTS[code] || { border: "border-gray-800", text: "text-emerald-300", label: "text-gray-400" };
}

export function Interpreter() {
  const currentProject = useAppStore((state) => state.currentProject)!;
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const currentSession = useAppStore((state) => state.currentSession);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const isRecording = useAppStore((state) => state.isRecording);
  const isStreaming = useAppStore((state) => state.isStreaming);
  const isSonioxConnected = useAppStore((state) => state.isSonioxConnected);
  const setIsRecording = useAppStore((state) => state.setIsRecording);
  const setIsStreaming = useAppStore((state) => state.setIsStreaming);
  const setSonioxConnected = useAppStore((state) => state.setSonioxConnected);

  const [sourceText, setSourceText] = useState("");
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const [partialTexts, setPartialTexts] = useState<Record<string, string>>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Target languages from project
  const targetLangs = useMemo(() => {
    return currentProject?.targetLangs?.length
      ? currentProject.targetLangs
      : currentProject?.targetLang
        ? [currentProject.targetLang]
        : [];
  }, [currentProject]);

  // Map session state to StatefulButton state
  const buttonState = useMemo((): SessionState => {
    if (isPaused) return "paused";
    if (isStreaming) return "streaming";
    if (isRecording) return "recording";
    return "idle";
  }, [isRecording, isStreaming, isPaused]);

  // Map Soniox connection to ConnectionIndicator status
  const connectionStatus = useMemo((): ConnectionStatus => {
    if (error) return "error";
    if (isRecording && isSonioxConnected) return "connected";
    if (isRecording && !isSonioxConnected) return "connecting";
    return "disconnected";
  }, [isRecording, isSonioxConnected, error]);

  // Timer management
  useEffect(() => {
    if (sessionStartTime && !timerRef.current && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }

    if (isPaused && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionStartTime, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelMultiLangSoniox().catch(console.error);
    };
  }, []);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  const handleStart = useCallback(async () => {
    console.log("handleStart called");
    setError(null);
    setIsPaused(false);

    try {
      // Create session if needed
      let session = currentSession;
      if (!session) {
        console.log("Creating new session for project:", currentProject.id);
        session = await createSession(currentProject.id);
        console.log("Session created:", session);
        setCurrentSession(session);
      }

      if (!sessionStartTime) {
        setSessionStartTime(Date.now());
      }

      // Start Soniox multi-language
      console.log("Starting Multi-Lang Soniox for languages:", targetLangs);
      await startMultiLangSoniox({
        projectId: currentProject.id,
        sessionId: session.id,
        sourceLanguage: currentProject.sourceLang,
        targetLanguages: targetLangs,
        onPartialResult: (result) => {
          setSourceText(result.originalText);
          setPartialTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: result.translatedText,
          }));
        },
        onFinalResult: (result) => {
          setSourceText(result.originalText);
          setTranslatedTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: result.translatedText,
          }));
          setPartialTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: "",
          }));
        },
        onError: (err, targetLanguage) => {
          console.error(`Soniox error for ${targetLanguage}:`, err);
          setError(err.message);
          setIsRecording(false);
        },
        onConnectionChange: (connected, targetLanguage) => {
          console.log(`Connection ${targetLanguage}: ${connected}`);
          setSonioxConnected(connected);
          if (!connected && isRecording) {
            setIsRecording(false);
          }
        },
      });

      console.log("Soniox started successfully");
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start:", err);
      setError((err as Error).message);
    }
  }, [
    currentProject,
    currentSession,
    sessionStartTime,
    targetLangs,
    isRecording,
    setCurrentSession,
    setIsRecording,
    setSonioxConnected,
  ]);

  const handlePause = useCallback(async () => {
    await pauseMultiLangSoniox();
    setIsPaused(true);
    setIsRecording(false);
  }, [setIsRecording]);

  const handleResume = useCallback(async () => {
    setIsPaused(false);
    setError(null);

    if (!currentSession) {
      await handleStart();
      return;
    }

    try {
      await resumeMultiLangSoniox({
        projectId: currentProject.id,
        sessionId: currentSession.id,
        sourceLanguage: currentProject.sourceLang,
        targetLanguages: targetLangs,
        onPartialResult: (result) => {
          setSourceText(result.originalText);
          setPartialTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: result.translatedText,
          }));
        },
        onFinalResult: (result) => {
          setSourceText(result.originalText);
          setTranslatedTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: result.translatedText,
          }));
          setPartialTexts((prev) => ({
            ...prev,
            [result.targetLanguage]: "",
          }));
        },
        onError: (err, targetLanguage) => {
          console.error(`Soniox error for ${targetLanguage}:`, err);
          setError(err.message);
          setIsRecording(false);
        },
        onConnectionChange: (connected) => {
          setSonioxConnected(connected);
          if (!connected && isRecording) {
            setIsRecording(false);
          }
        },
      });

      setIsRecording(true);
    } catch (err) {
      console.error("Failed to resume:", err);
      setError((err as Error).message);
    }
  }, [
    currentProject,
    currentSession,
    targetLangs,
    isRecording,
    handleStart,
    setIsRecording,
    setSonioxConnected,
  ]);

  const handleStop = useCallback(async () => {
    await stopMultiLangSoniox();
    setIsRecording(false);
    setIsStreaming(false);
    setIsPaused(false);
  }, [setIsRecording, setIsStreaming]);

  const handleEnd = useCallback(async () => {
    await stopMultiLangSoniox({ updateStatus: true });
    setIsRecording(false);
    setIsStreaming(false);
    setIsPaused(false);

    // End session (fallback direct DB call if not already ended via API)
    if (currentSession) {
      try {
        await endSession(currentSession.id);
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }

    // Reset all state
    setSourceText("");
    setTranslatedTexts({});
    setPartialTexts({});
    setElapsedTime(0);
    setSessionStartTime(null);
    setCurrentSession(null);
    setCurrentProject(null);
  }, [currentSession, setCurrentSession, setCurrentProject, setIsRecording, setIsStreaming]);

  const handleBack = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
  };

  // Source language display
  const sourceLanguageDisplay = getLanguageName(currentProject?.sourceLang || "ko");

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* ═══════════════════════════════════════════════════════════════════════════
          HEADER — Project info and status
          ═══════════════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-800/60 bg-gray-900/40 backdrop-blur-sm">
        {/* Left: Back button + Project info */}
        <div className="flex items-center gap-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-3 text-base text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-xl transition-all min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>돌아가기</span>
          </button>

          <div className="h-8 w-px bg-gray-800" />

          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {currentProject?.name || "Interpreter"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {sourceLanguageDisplay} → {targetLangs.map((l) => getLanguageName(l)).join(", ")}
            </p>
          </div>
        </div>

        {/* Right: Status badge + Timer */}
        <div className="flex items-center gap-8">
          {/* Session state indicator badge */}
          <span
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold ${
              isPaused
                ? "bg-amber-900/40 text-amber-300 border border-amber-800/40"
                : isRecording
                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/40"
                  : currentSession
                    ? "bg-gray-800/60 text-gray-400 border border-gray-700/40"
                    : "bg-gray-900 text-gray-600 border border-gray-800/40"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused
                  ? "bg-amber-400"
                  : isRecording
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-gray-600"
              }`}
            />
            {isPaused ? "일시정지" : isRecording ? "녹음 중" : currentSession ? "대기" : "세션 없음"}
          </span>

          <div className="text-right">
            <p className="text-3xl font-mono text-white tabular-nums tracking-tight">
              {formatTime(elapsedTime)}
            </p>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MAIN CONTENT — Source text and translations
          ═══════════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 overflow-hidden p-8">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Source Panel — Original speech */}
          <div className="rounded-3xl bg-gray-900 border border-gray-800 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg font-semibold text-gray-300">원본</span>
              <span className="text-sm text-gray-600 font-mono uppercase px-3 py-1 bg-gray-800 rounded-lg">
                {currentProject?.sourceLang}
              </span>
              {isRecording && !isPaused && (
                <span className="flex items-center gap-2 text-sm text-emerald-400 ml-auto font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  실시간
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {sourceText ? (
                <StreamingTextSimple
                  text={sourceText}
                  isPartial={isRecording && !isPaused}
                  className="text-2xl text-white leading-relaxed"
                />
              ) : (
                <p className="text-2xl text-gray-600 leading-relaxed">
                  {isRecording
                    ? "음성 인식 대기 중..."
                    : isPaused
                      ? "일시정지됨"
                      : "시작 버튼을 눌러주세요"}
                </p>
              )}
            </div>
          </div>

          {/* Translation Panels — One per target language */}
          <div
            className="grid gap-6 overflow-auto"
            style={{
              gridTemplateRows: `repeat(${Math.min(targetLangs.length, 3)}, minmax(180px, 1fr))`,
            }}
          >
            {targetLangs.map((lang) => {
              const finalText = translatedTexts[lang] || "";
              const partialText = partialTexts[lang] || "";
              const displayText = finalText || partialText;
              const isPartial = !!partialText && !finalText;
              const accent = getLanguageAccent(lang);

              return (
                <div
                  key={lang}
                  className={`rounded-3xl bg-gray-900/50 border ${accent.border} p-7 flex flex-col`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-lg font-semibold ${accent.label}`}>
                      {getLanguageName(lang)}
                    </span>
                    <span className="text-sm text-gray-600 font-mono uppercase px-3 py-1 bg-gray-900/80 rounded-lg">{lang}</span>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {displayText ? (
                      <StreamingTextSimple
                        text={displayText}
                        isPartial={isPartial}
                        className={`text-xl leading-relaxed ${accent.text}`}
                      />
                    ) : (
                      <p className="text-xl text-gray-600 leading-relaxed">
                        {isRecording ? "번역 대기 중..." : "번역 결과가 표시됩니다"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════════
          CONTROL BAR — Waveform, StatefulButton
          ═══════════════════════════════════════════════════════════════════════════ */}
      <footer className="px-8 py-6 border-t border-gray-800/60 bg-gray-900/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Left: Waveform visualization */}
          <div className="flex items-center gap-6 w-48">
            <LiveWaveform
              isActive={isRecording && !isPaused}
              barCount={24}
              className="w-full h-8"
            />
          </div>

          {/* Center: StatefulButton + Pause */}
          <div className="flex items-center gap-4">
            {/* Pause button — visible only when actively recording */}
            {isRecording && !isPaused && (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-base font-semibold text-amber-300 bg-amber-900/30 border border-amber-800/40 hover:bg-amber-900/50 transition-all min-h-[52px]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                일시정지
              </button>
            )}

            <StatefulButton
              state={buttonState}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onEnd={handleEnd}
            />
          </div>

          {/* Right: Keyboard shortcuts */}
          <div className="flex items-center gap-6 text-sm text-gray-500 w-48 justify-end">
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 font-mono text-xs">
                Space
              </kbd>
              <span>시작/정지</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 font-mono text-xs">
                Esc
              </kbd>
              <span>종료</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════════
          ERROR TOAST — Animated slide-up notification
          ═══════════════════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl bg-red-900/90 border border-red-800 text-red-200 text-base animate-slide-up backdrop-blur-sm shadow-lg max-w-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300 transition-colors p-1 hover:bg-red-800/30 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
