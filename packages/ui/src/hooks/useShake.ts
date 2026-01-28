import { useState, useCallback } from "react";

// 에러 피드백을 위한 shake 호크
// isShaking 상태와 triggerShake 함수를 반환하여 컴포넌트에서 간결하게 사용

export function useShake(duration = 400) {
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = useCallback(() => {
    // 이미 shake 중인 경우 먼저 중단한 뒤 재시작하여 연속 트리거 가능
    setIsShaking(false);

    // 한 프레임 지연으로 클래스가 제거되고 다시 적용됨
    requestAnimationFrame(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), duration);
    });
  }, [duration]);

  return [isShaking, triggerShake] as const;
}

export default useShake;
