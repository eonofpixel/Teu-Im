import { useState, useCallback, type MouseEvent } from "react";

// 버튼 클릭 시 리플 효과를 위한 호크
// ripples 배열과 triggerRipple 함수를 반환

interface RippleInstance {
  /** 고유 식별자 */
  id: number;
  /** 클릭 위치의 X 좌표 (부모 기준 퍼센트) */
  x: number;
  /** 클릭 위치의 Y 좌표 (부모 기준 퍼센트) */
  y: number;
}

export function useRipple(duration = 600) {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);

  const triggerRipple = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();

      // 클릭 좌표를 부모 요소 기준 퍼센트로 변환
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      const newRipple: RippleInstance = {
        id: Date.now() + Math.random(),
        x,
        y,
      };

      setRipples((prev) => [...prev, newRipple]);

      // 아니메이션 완료 후 리플 제거
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, duration);
    },
    [duration]
  );

  // 리플 요소를 렌더링하기 위한 컴포넌트 FragmentArray
  const RippleElements = ripples.map((ripple) => (
    <span
      key={ripple.id}
      aria-hidden="true"
      className="absolute rounded-full bg-white/30 pointer-events-none"
      style={{
        left: `${ripple.x}%`,
        top: `${ripple.y}%`,
        width: "10px",
        height: "10px",
        transform: "translate(-50%, -50%)",
        animation: `ripple ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
      }}
    />
  ));

  return { ripples, triggerRipple, RippleElements };
}

export default useRipple;
