import { useEffect, useState } from "react";

// 연결 상태를 표시하는 아니메이션 닷 + 펄스 링 컴포넌트
// 상태: connected (연결됨, 초록), connecting (연결 중, 노랑 펄스),
//        disconnected (연결 단절, 빨강), error (에러, 빨강 shake)

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

interface ConnectionIndicatorProps {
  /** 현재 연결 상태 */
  status: ConnectionStatus;
  /** 닷 크기 (px) */
  size?: number;
  /** shake 아니메이션 지속 시간 (밀리초) */
  shakeDuration?: number;
  /** 연결 상태 라벨 표시 여부 */
  showLabel?: boolean;
  /** 추가 className */
  className?: string;
}

const STATUS_CONFIG = {
  connected: {
    color: "bg-emerald-400",
    ringColor: "bg-emerald-400",
    label: "연결됨",
    hasPulse: false,
    hasShake: false,
  },
  connecting: {
    color: "bg-amber-400",
    ringColor: "bg-amber-400",
    label: "연결 중...",
    hasPulse: true,
    hasShake: false,
  },
  disconnected: {
    color: "bg-red-400",
    ringColor: "bg-red-400",
    label: "연결 단절",
    hasPulse: false,
    hasShake: false,
  },
  error: {
    color: "bg-red-500",
    ringColor: "bg-red-500",
    label: "에러 발생",
    hasPulse: false,
    hasShake: true,
  },
} as const satisfies Record<
  ConnectionStatus,
  {
    color: string;
    ringColor: string;
    label: string;
    hasPulse: boolean;
    hasShake: boolean;
  }
>;

export function ConnectionIndicator({
  status,
  size = 8,
  shakeDuration = 400,
  showLabel = false,
  className = "",
}: ConnectionIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const [shakeKey, setShakeKey] = useState(0);

  // error 상태로 전환될 때마다 shake 키를 변경하여 아니메이션 재실행
  useEffect(() => {
    if (status === "error") {
      setShakeKey((prev) => prev + 1);
    }
  }, [status]);

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={config.label}
    >
      {/* 아니메이션 컨테이너 */}
      <div
        className="relative flex items-center justify-center"
        key={config.hasShake ? shakeKey : undefined}
        style={{
          width: size * 2.5,
          height: size * 2.5,
          animation: config.hasShake
            ? `shake ${shakeDuration}ms cubic-bezier(0.36, 0.07, 0.19, 0.97)`
            : "none",
        }}
      >
        {/* 펄스 링 — connecting 상태에서만 표시 */}
        {config.hasPulse && (
          <span
            className={`absolute inset-0 rounded-full ${config.ringColor} opacity-60`}
            style={{
              animation: "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
            aria-hidden="true"
          />
        )}

        {/* 중앙 닷 */}
        <span
          className={`relative rounded-full ${config.color} shadow-sm`}
          style={{
            width: size,
            height: size,
            zIndex: 1,
            // connected 상태에서 부드러운 펄스 효과
            animation:
              status === "connected"
                ? "pulse-soft 2s ease-in-out infinite"
                : "none",
          }}
          aria-hidden="true"
        />
      </div>

      {/* 라벨 */}
      {showLabel && (
        <span className="text-sm text-gray-500">{config.label}</span>
      )}
    </div>
  );
}

export default ConnectionIndicator;
