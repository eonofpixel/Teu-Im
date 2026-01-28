"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logError } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary for catching unhandled React render errors.
 * Logs to the application logger and displays a user-friendly fallback UI.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError("ErrorBoundary", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-2.032-1.5-2.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              예상치 못한 오류가 발생했습니다
            </h1>
            <p className="text-gray-400 mb-6">
              페이지를 다시 로드하거나 아래 버튼을 클릭해 다시 시도해주세요.
              문제가 계속 되면 지원팀에 문의하세요.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors"
              >
                페이지 새로고침
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                  개발 모드: 오류 상세 보기
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-gray-900 rounded p-3 overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
