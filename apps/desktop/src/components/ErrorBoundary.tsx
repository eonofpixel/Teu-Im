import { Component, ReactNode, ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-gray-950 text-gray-50 flex items-center justify-center p-6"
          role="alert"
          aria-live="assertive"
          aria-label="Application error"
        >
          <div className="max-w-2xl w-full bg-gray-900 border border-red-800/40 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900/30 to-red-800/20 border-b border-red-800/40 p-6">
              <div className="flex items-center gap-3">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h1 className="text-2xl font-bold text-red-400">
                    오류가 발생했습니다
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    애플리케이션에서 예기치 않은 오류가 발생했습니다
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {this.state.error && (
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-red-400 mb-2">
                    오류 메시지:
                  </h2>
                  <p className="text-gray-300 font-mono text-sm break-words">
                    {this.state.error.message || "알 수 없는 오류"}
                  </p>
                </div>
              )}

              {this.state.errorInfo && (
                <details className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer p-4 hover:bg-gray-900 transition-colors text-sm font-semibold text-gray-400">
                    스택 트레이스 보기
                  </summary>
                  <div className="p-4 pt-0 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-900/30 transition-all"
                  aria-label="애플리케이션 다시 시도"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  다시 시도
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-600 transition-all"
                  aria-label="페이지 새로고침"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h5M20 20v-5h-5M3 10a9 9 0 0118 0M21 14a9 9 0 01-18 0"
                    />
                  </svg>
                  새로고침
                </button>
              </div>

              {/* Help Text */}
              <p className="text-xs text-gray-500 text-center pt-2">
                문제가 계속되면 애플리케이션을 다시 시작해주세요
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
