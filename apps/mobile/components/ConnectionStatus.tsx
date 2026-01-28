"use client";

export type ConnectionState =
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "waiting";

export type ProjectStatusType = "idle" | "active" | "ended";

interface ConnectionStatusProps {
  status: ConnectionState;
  projectStatus: ProjectStatusType;
}

const statusConfig = {
  connected: {
    dot: "#34d399",     /* emerald-400 */
    ring: "rgba(52, 211, 153, 0.2)",
    label: "연결됨",
    sublabel: "실시간 통역 수신 중",
    pulse: true,
  },
  reconnecting: {
    dot: "#fbbf24",     /* amber-400 */
    ring: "rgba(251, 191, 36, 0.2)",
    label: "재연결 중...",
    sublabel: "연결이 불안정합니다. 자동으로 복구 중입니다.",
    pulse: true,
  },
  disconnected: {
    dot: "#f87171",     /* red-400 */
    ring: "rgba(248, 113, 113, 0.15)",
    label: "연결 끊김",
    sublabel: "잠시 후 자동 재연결을 시도합니다.",
    pulse: false,
  },
  waiting: {
    dot: "#4a5060",     /* disabled gray */
    ring: "transparent",
    label: "세션 대기",
    sublabel: "행사 주최자가 세션을 시작할 때까지 대기합니다.",
    pulse: false,
  },
} as const satisfies Record<ConnectionState, {
  dot: string;
  ring: string;
  label: string;
  sublabel: string;
  pulse: boolean;
}>;

export default function ConnectionStatus({
  status,
  projectStatus,
}: ConnectionStatusProps) {

  // ─── 행사 종료 상태 ───
  if (projectStatus === "ended") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl animate-slide-up"
        style={{
          background: "var(--color-bg-tertiary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: "var(--color-text-disabled)" }}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            행사 종료
          </span>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-disabled)" }}>
            이 행사는 종료되었습니다. 다른 행사에 참여하세요.
          </p>
        </div>
      </div>
    );
  }

  const config = statusConfig[status];

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass-card animate-slide-up"
    >
      {/* 상태 닷 — 펄스 링 포함 */}
      <div className="shrink-0 relative flex items-center justify-center w-5 h-5">
        {/* 외부 펄스 링 */}
        {config.pulse && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: config.ring,
            }}
          />
        )}
        {/* 내부 닷 */}
        <div
          className="w-2.5 h-2.5 rounded-full relative z-10 shrink-0"
          style={{ background: config.dot }}
        />
      </div>

      {/* 텍스트 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: config.dot }}
          >
            {config.label}
          </span>
          {status === "connected" && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md"
              style={{
                background: "rgba(52, 211, 153, 0.1)",
                color: "var(--color-success)",
              }}
            >
              라이브
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-disabled)" }}>
          {config.sublabel}
        </p>
      </div>
    </div>
  );
}
