import { useEffect, useState } from "react";

// 자기 자신을 그리는 체크마크 SVG 컴포넌트
// 확인 피드백으로 사용 — stroke-dasharray와 stroke-dashoffset 기반 드로잉 아니메이션

interface SuccessCheckmarkProps {
  /** 체크마크 표시 여부 */
  show?: boolean;
  /** 체크마크 색상 */
  color?: string;
  /** 컴포넌트 전체 크기 (px) */
  size?: number;
  /** 아니메이션 지속 시간 (밀리초) */
  duration?: number;
  /** 아니메이션 완료 시 호출 */
  onComplete?: () => void;
  /** 추가 className */
  className?: string;
}

const STROKE_LENGTH = 24;

export function SuccessCheckmark({
  show = true,
  color = "currentColor",
  size = 48,
  duration = 400,
  onComplete,
  className = "",
}: SuccessCheckmarkProps) {
  const [isDrawn, setIsDrawn] = useState(show);

  useEffect(() => {
    if (show) {
      // 한 프레임 후 드로잉 시작하여 초기 숨김 상태를 보장
      setIsDrawn(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsDrawn(true);
        });
      });

      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else {
      setIsDrawn(false);
    }
  }, [show, duration, onComplete]);

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="성공"
    >
      {/* 배경 원 — scale-bounce 효과로 나타남 */}
      <div
        className="absolute rounded-full bg-green-100"
        style={{
          width: size,
          height: size,
          animation: show ? `scale-bounce ${duration * 0.8}ms ease-out forwards` : "none",
          opacity: show ? 1 : 0,
          transition: `opacity ${duration * 0.3}ms ease`,
        }}
      />
      {/* 체크마크 SVG */}
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative"
        style={{ zIndex: 1 }}
      >
        <path
          d="M5 13l4 4L19 7"
          strokeDasharray={STROKE_LENGTH}
          strokeDashoffset={isDrawn ? 0 : STROKE_LENGTH}
          style={{
            transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
      </svg>
    </div>
  );
}

export default SuccessCheckmark;
