import React, { useEffect, useRef, useState, type ReactNode } from "react";

// 진입/퇴장 트랜지션을 위한 CSS-only 래퍼
// framer-motion의 AnimatePresence와 유사한 기능을 제공

type AnimationType =
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-in-right"
  | "scale-bounce";

interface AnimatedPresenceProps {
  /** 자식 요소가 표시되는지 여부를 제어 */
  show: boolean;
  /** 사용할 트랜지션 타입 */
  animation?: AnimationType;
  /** 트랜지션 지속 시간 (밀리초) */
  duration?: number;
  /** 퇴장 후 DOM에서 제거되지 않고 숨겨지는지 여부 */
  unmountOnExit?: boolean;
  /** 진입/퇴장 시 호출되는 콜백 */
  onEnter?: () => void;
  onExitComplete?: () => void;
  /** 자식 요소 */
  children: ReactNode;
}

const ANIMATION_CLASSES: Record<AnimationType, { enter: string; exit: string }> =
  {
    fade: {
      enter: "opacity-0",
      exit: "opacity-0",
    },
    "slide-up": {
      enter: "translate-y-2 opacity-0",
      exit: "translate-y-2 opacity-0",
    },
    "slide-down": {
      enter: "-translate-y-2 opacity-0",
      exit: "-translate-y-2 opacity-0",
    },
    "slide-in-right": {
      enter: "translate-x-5 opacity-0",
      exit: "translate-x-5 opacity-0",
    },
    "scale-bounce": {
      enter: "scale-95 opacity-0",
      exit: "scale-95 opacity-0",
    },
  };

// 타입 정의를 위한 상태 열거형
const State = {
  UNMOUNTED: "unmounted",
  EXITED: "exited",
  ENTERING: "entering",
  ENTERED: "entered",
  EXITING: "exiting",
} as const;

type PresenceState = (typeof State)[keyof typeof State];

export function AnimatedPresence({
  show,
  animation = "fade",
  duration = 200,
  unmountOnExit = true,
  onEnter,
  onExitComplete,
  children,
}: AnimatedPresenceProps) {
  const [state, setState] = useState<PresenceState>(
    show ? State.ENTERED : unmountOnExit ? State.UNMOUNTED : State.EXITED
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { enter, exit } = ANIMATION_CLASSES[animation];

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (show) {
      // 퇴장 중인 경우 먼저 EXITED로 놓고 다음 프레임에서 ENTERING 시작
      if (state === State.UNMOUNTED || state === State.EXITED) {
        setState(State.EXITED);
        // 한 프레임 지연으로 초기 상태 적용 후 트랜지션 시작
        timerRef.current = setTimeout(() => {
          setState(State.ENTERING);
          onEnter?.();
        }, 20);
      } else if (state === State.EXITING) {
        setState(State.ENTERING);
        onEnter?.();
      } else if (state !== State.ENTERED) {
        setState(State.ENTERING);
        onEnter?.();
      }

      // ENTERING -> ENTERED
      if (state === State.ENTERING || show) {
        const enterTimer = setTimeout(() => {
          setState(State.ENTERED);
        }, duration);

        if (!timerRef.current) {
          timerRef.current = enterTimer;
        } else {
          // 이미 타이머가 있으면 (EXITED -> ENTERING 전이) 추가 타이머를 설정
          setTimeout(() => {
            setState(State.ENTERED);
          }, duration + 20);
        }
      }
    } else {
      // 퇴장 시작
      if (state === State.ENTERED || state === State.ENTERING) {
        setState(State.EXITING);

        timerRef.current = setTimeout(() => {
          if (unmountOnExit) {
            setState(State.UNMOUNTED);
          } else {
            setState(State.EXITED);
          }
          onExitComplete?.();
        }, duration);
      } else if (state !== State.UNMOUNTED && state !== State.EXITED) {
        if (unmountOnExit) {
          setState(State.UNMOUNTED);
        } else {
          setState(State.EXITED);
        }
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [show, animation, duration, unmountOnExit, onEnter, onExitComplete, state]);

  // UNMOUNTED 상태에서는 아무것도 렌더링하지 않음
  if (state === State.UNMOUNTED) {
    return null;
  }

  // 현재 상태에 맞는 클래스 결정
  const isVisible =
    state === State.ENTERED || state === State.ENTERING;

  const baseStyle: React.CSSProperties = {
    transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  };

  // 퇴장 중이거나 진입 초기 상태일 때 숨김 클래스 적용
  const isExiting = state === State.EXITING;
  const shouldApplyHiddenClass = !isVisible || isExiting;

  return (
    <div
      className={`${shouldApplyHiddenClass ? (isExiting ? exit : enter) : ""}`}
      style={baseStyle}
      aria-hidden={!isVisible}
    >
      {children}
    </div>
  );
}

export default AnimatedPresence;
