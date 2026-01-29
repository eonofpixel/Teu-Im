"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/error-tracking";

/**
 * Global error boundary for the entire application.
 * Catches unhandled errors at the app level.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("Global error:", error);

    // Track error with context
    captureError(error, {
      component: "GlobalError",
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  const handleReload = () => {
    window.location.href = "/";
  };

  return (
    <html lang="ko">
      <body className="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="rounded-xl border border-red-800/50 bg-red-900/10 p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-900/20 flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-2.032-1.5-2.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              문제가 발생했습니다
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 다시 시도해주세요.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                aria-label="다시 시도"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                다시 시도
              </button>
              <button
                onClick={handleReload}
                aria-label="홈으로 이동"
                className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-950"
              >
                홈으로 이동
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                  개발 모드: 오류 상세 정보
                </summary>
                <pre className="text-xs text-red-400 bg-gray-900/50 rounded-lg p-4 overflow-auto max-h-40 border border-gray-800">
                  {error.message}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
