"use client";

import { useState, type FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0); // shake 재트리거용

  const triggerError = useCallback((msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode || trimmedCode.length !== 6) {
      triggerError("6자리 참여 코드를 입력해주세요.");
      return;
    }

    if (!password) {
      triggerError("비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();

      const projectResult = await supabase
        .from("projects")
        .select("id, name, code, password, status")
        .eq("code", trimmedCode)
        .single();

      const project = projectResult.data as {
        id: string;
        name: string;
        code: string;
        password: string;
        status: string;
      } | null;
      const queryError = projectResult.error;

      if (queryError || !project) {
        triggerError("존재하지 않는 참여 코드입니다. 다시 확인해주세요.");
        return;
      }

      if (project.password !== password) {
        triggerError("비밀번호가 일치하지 않습니다.");
        return;
      }

      if (project.status === "ended") {
        triggerError("이 행사는 종료되었습니다.");
        return;
      }

      router.push(`/live/${trimmedCode}`);
    } catch (err) {
      console.error("참여 오류:", err);
      triggerError("연결 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = code.trim().length === 6 && password.length > 0;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-bg-primary)" }}>
      {/* 상단 환상 그라디엔트 — 깊이 제공 */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
        }}
      />

      {/* 헤더 영역 — 로고 + 타이틀 */}
      <header className="relative z-10 pt-12 pb-6 px-6 text-center animate-slide-up-delay-1">
        {/* 아이콘 배지 */}
        <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-5 animate-scale-in" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582M4.501 9H19.5m-15 0a9.004 9.004 0 001.843 5.418M19.5 9a9.004 9.004 0 01-1.843 5.418"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          통역 참여
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          행사 코드와 비밀번호를 입력하세요
        </p>
      </header>

      {/* 폼 영역 */}
      <div className="flex-1 px-6 pt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 참여 코드 입력 */}
          <div className="animate-slide-up-delay-2">
            <label
              htmlFor="code"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              참여 코드
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              placeholder="예: A1B2C3"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="
                w-full px-4 py-4 rounded-2xl
                text-center text-2xl font-mono tracking-[0.25em] uppercase
                transition-all duration-200
                focus:outline-none
              "
              style={{
                background: "var(--color-bg-secondary)",
                border: "2px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="animate-slide-up-delay-3">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              className="
                w-full px-4 py-4 rounded-2xl
                text-base
                transition-all duration-200
                focus:outline-none
              "
              style={{
                background: "var(--color-bg-secondary)",
                border: "2px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--color-accent-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* 에러 메시지 — shake 재트리거 */}
          {error && (
            <div
              key={errorKey}
              className="animate-shake flex items-start gap-2.5 px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
              }}
            >
              <svg
                className="w-4.5 h-4.5 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--color-error)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9.303 3.376c-.866 1.5-2.747 2.847-5.577 3.724-.279.09-.58.165-.89.226C20.531 20.726 22 16.594 22 12.423c0-5.391-4.582-9.744-10.228-9.744-5.646 0-10.228 4.353-10.228 9.744 0 4.171 1.469 8.303 5.721 8.274.31-.061.611-.136.89-.226-2.83-.877-4.711-2.224-5.577-3.724"
                />
              </svg>
              <p className="text-sm leading-snug" style={{ color: "var(--color-error)" }}>
                {error}
              </p>
            </div>
          )}

          {/* 참여 버튼 */}
          <div className="animate-slide-up-delay-4 pt-2">
            <button
              type="submit"
              disabled={isLoading || !isValid}
              className="
                w-full py-4 rounded-2xl
                text-white font-semibold text-base
                transition-all duration-200
                focus:outline-none
                active:scale-[0.97]
              "
              style={{
                background: isValid
                  ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                  : "var(--color-bg-tertiary)",
                color: isValid ? "#fff" : "var(--color-text-disabled)",
                boxShadow: isValid ? "0 4px 20px rgba(99, 102, 241, 0.35)" : "none",
                cursor: isValid && !isLoading ? "pointer" : "not-allowed",
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  연결 중...
                </span>
              ) : (
                "참여하기"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 하단 안내 */}
      <footer className="px-6 pb-8 pt-6 text-center animate-slide-up-delay-4">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="h-px flex-1 max-w-12" style={{ background: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-disabled)" }}>또는</span>
          <div className="h-px flex-1 max-w-12" style={{ background: "var(--color-border)" }} />
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-disabled)" }}>
          참여 코드는 행사 주최자로부터 받아야 합니다
        </p>
      </footer>
    </main>
  );
}
