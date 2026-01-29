"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { LanguageCode } from "@teu-im/shared";
import {
  MultiLanguageSelector,
  SUPPORTED_LANGUAGES,
} from "@/components/multi-language-selector";

const ONBOARDING_COMPLETE_KEY = "teu-im-onboarding-complete";

type Step = "welcome" | "api-key" | "create-project";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [apiKey, setApiKey] = useState("");
  const [projectName, setProjectName] = useState("");
  const [sourceLang, setSourceLang] = useState<LanguageCode>("ko");
  const [targetLangs, setTargetLangs] = useState<LanguageCode[]>(["en"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if onboarding is complete
    const isComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
    if (!isComplete) {
      // Delay slightly for smoother appearance
      setTimeout(() => setIsVisible(true), 300);
    }
  }, []);

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleComplete = async () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleNextFromWelcome = () => {
    setCurrentStep("api-key");
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError("API 키를 입력해주세요");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("로그인이 필요합니다");
        setLoading(false);
        return;
      }

      const { error: updateError } = await (supabase as any)
        .from("users")
        .update({ soniox_api_key: apiKey })
        .eq("id", session.user.id);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setCurrentStep("create-project");
    } catch (err) {
      setError("API 키 저장 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipApiKey = () => {
    setCurrentStep("create-project");
  };

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetLangs.length === 0) {
      setError("타겟 언어를 최소 1개 선택해주세요");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("로그인이 필요합니다");
        setLoading(false);
        return;
      }

      const password = generateCode();

      const { error: insertError } = await (supabase as any)
        .from("projects")
        .insert({
          user_id: session.user.id,
          name: projectName,
          code: generateCode(),
          password,
          source_lang: sourceLang,
          target_lang: targetLangs[0],
          target_langs: targetLangs,
          status: "idle",
        });

      if (insertError) {
        setError(insertError.message);
        setLoading(false);
        return;
      }

      handleComplete();
    } catch (err) {
      setError("프로젝트 생성 중 오류가 발생했습니다");
      setLoading(false);
    }
  };

  const handleSkipProject = () => {
    handleComplete();
  };

  if (!isVisible) {
    return null;
  }

  const steps: Step[] = ["welcome", "api-key", "create-project"];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <>
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .onboarding-overlay {
          animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .onboarding-card {
          animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }

        .step-indicator {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .step-indicator-active {
          background: linear-gradient(
            90deg,
            #6366f1 0%,
            #818cf8 50%,
            #6366f1 100%
          );
          background-size: 200% auto;
          animation: shimmer 2s linear infinite;
        }

        .content-transition {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Full-screen overlay */}
      <div
        className="onboarding-overlay fixed inset-0 z-50 flex items-center justify-center bg-gray-950 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Card container */}
        <div className="onboarding-card w-full max-w-2xl">
          {/* Step indicators */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`step-indicator h-1.5 rounded-full ${
                  index === currentStepIndex
                    ? "step-indicator-active w-12"
                    : index < currentStepIndex
                    ? "w-8 bg-indigo-600"
                    : "w-8 bg-gray-800"
                }`}
                role="progressbar"
                aria-valuenow={index === currentStepIndex ? 100 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Step ${index + 1} of ${steps.length}`}
              />
            ))}
          </div>

          {/* Main card */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-8 md:p-12 shadow-2xl shadow-black/60">
            {/* Welcome Step */}
            {currentStep === "welcome" && (
              <div className="content-transition space-y-8">
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/40">
                    <svg
                      className="h-10 w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                  </div>

                  <h1
                    id="onboarding-title"
                    className="text-4xl font-bold tracking-tight text-white"
                  >
                    Teu-Im에 오신 것을
                    <br />
                    환영합니다
                  </h1>

                  <p className="mx-auto max-w-md text-lg leading-relaxed text-gray-400">
                    실시간 음성 통역 플랫폼으로 언어 장벽 없이 소통하세요.
                    <br />
                    빠른 설정으로 바로 시작할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    type="button"
                    onClick={handleNextFromWelcome}
                    className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98]"
                  >
                    시작하기
                  </button>

                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full rounded-xl border border-gray-800 py-4 text-base font-medium text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800/50 hover:text-gray-300 active:scale-[0.98]"
                  >
                    나중에 하기
                  </button>
                </div>
              </div>
            )}

            {/* API Key Step */}
            {currentStep === "api-key" && (
              <div className="content-transition space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white">
                    API 키 설정
                  </h2>
                  <p className="text-base leading-relaxed text-gray-400">
                    Soniox API 키를 입력하면 실시간 음성 인식 기능을 사용할 수
                    있습니다. API 키는{" "}
                    <a
                      href="https://soniox.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-400 underline decoration-indigo-400/30 underline-offset-2 transition-colors hover:text-indigo-300 hover:decoration-indigo-300/50"
                    >
                      Soniox 대시보드
                    </a>
                    에서 발급받을 수 있습니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="api-key-input"
                      className="mb-2 block text-sm font-semibold text-gray-300"
                    >
                      Soniox API Key
                    </label>
                    <input
                      id="api-key-input"
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 font-mono text-sm text-white placeholder-gray-600 shadow-inner transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={loading}
                    className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "저장 중..." : "저장하고 계속하기"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipApiKey}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-800 py-4 text-base font-medium text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800/50 hover:text-gray-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    나중에 설정하기
                  </button>
                </div>
              </div>
            )}

            {/* Create Project Step */}
            {currentStep === "create-project" && (
              <div className="content-transition space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-white">
                    첫 프로젝트 만들기
                  </h2>
                  <p className="text-base leading-relaxed text-gray-400">
                    프로젝트를 생성하면 통역 세션을 시작할 수 있습니다. 소스
                    언어와 타겟 언어를 선택하세요.
                  </p>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-5">
                  <div>
                    <label
                      htmlFor="project-name"
                      className="mb-2 block text-sm font-semibold text-gray-300"
                    >
                      프로젝트 이름
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      required
                      placeholder="예: 글로벌 컨퍼런스 2026"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 text-sm text-white placeholder-gray-600 shadow-inner transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="source-lang"
                      className="mb-2 block text-sm font-semibold text-gray-300"
                    >
                      소스 언어
                    </label>
                    <select
                      id="source-lang"
                      value={sourceLang}
                      onChange={(e) => {
                        const newSource = e.target.value as LanguageCode;
                        setSourceLang(newSource);
                        setTargetLangs((prev) =>
                          prev.filter((c) => c !== newSource)
                        );
                      }}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3.5 text-sm text-white shadow-inner transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <MultiLanguageSelector
                    label="타겟 언어"
                    selected={targetLangs}
                    onChange={setTargetLangs}
                    excludeCodes={[sourceLang]}
                    placeholder="타겟 언어를 선택하세요 (복수 가능)"
                    required
                  />

                  {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading || targetLangs.length === 0}
                      className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "생성 중..." : "프로젝트 생성하고 완료"}
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipProject}
                      disabled={loading}
                      className="w-full rounded-xl border border-gray-800 py-4 text-base font-medium text-gray-400 transition-all hover:border-gray-700 hover:bg-gray-800/50 hover:text-gray-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      나중에 만들기
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Skip all link */}
          <div className="mt-6 text-center">
            <button
              onClick={handleSkip}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-400"
            >
              온보딩 건너뛰기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
