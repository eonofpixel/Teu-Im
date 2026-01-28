import React, { useEffect, useRef, useState, type ReactNode } from "react";

// 간단한 트랜지션 래퍼
// 지정 가능한 지속 시간과 이벤트 타이밍 함수를 사용하여 자식 요소에 트랜지션 적용

type EasingFunction =
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring"
  | "bounce";

const EASING_MAP: Record<EasingFunction, string> = {
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease-out",
  "ease-in-out": "ease-in-out",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
};

interface TransitionProps {
  /** 트랜지션이 활성화되는지 여부 */
  in: boolean;
  /** 트랜지션 지속 시간 (밀리초) */
  duration?: number;
  /** 이벤트 타이밍 함수 */
  easing?: EasingFunction;
  /** 트랜지션된 속성 목록 */
  properties?: string[];
  /** 진입 완료 시 호출 */
  onEntered?: () => void;
  /** 퇴장 완료 시 호출 */
  onExited?: () => void;
  /** 자식 요소 — render prop 패턴으로 현재 상태를 전달 */
  children:
    | ReactNode
    | ((state: { isActive: boolean; progress: number }) => ReactNode);
}

export function Transition({
  in: isIn,
  duration = 200,
  easing = "ease-in-out",
  properties,
  onEntered,
  onExited,
  children,
}: TransitionProps) {
  const [isActive, setIsActive] = useState(isIn);
  const [progress, setProgress] = useState(isIn ? 1 : 0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    if (isIn) {
      // 초기 상태 설정 후 다음 프레임에서 트랜지션 시작
      setProgress(0);
      setIsActive(true);

      rafRef.current = requestAnimationFrame(() => {
        // 한 프레임 후 진행도를 1로 설정하여 CSS 트랜지션 트리거
        setProgress(1);
      });

      timerRef.current = setTimeout(() => {
        onEntered?.();
      }, duration);
    } else {
      setProgress(0);

      timerRef.current = setTimeout(() => {
        setIsActive(false);
        onExited?.();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isIn, duration, onEntered, onExited]);

  const transitionStyle: React.CSSProperties = {
    transition: properties
      ? properties.map((p) => `${p} ${duration}ms ${EASING_MAP[easing]}`).join(", ")
      : `all ${duration}ms ${EASING_MAP[easing]}`,
  };

  // Render prop 패턴 지원
  if (typeof children === "function") {
    return (
      <div style={transitionStyle}>
        {children({ isActive, progress })}
      </div>
    );
  }

  // 기본 div 래퍼로 트랜지션 스타일 적용
  return (
    <div
      style={transitionStyle}
      className={
        isActive
          ? progress === 1
            ? "opacity-100"
            : "opacity-0"
          : "opacity-0"
      }
    >
      {children}
    </div>
  );
}

export default Transition;
