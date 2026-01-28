import React, { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 스트리밍 텍스트 컴포넌트 — 실시간 텍스트를 단어별로 순차 표시
// ChatGPT/Wordly 스타일의 타이핑 효과를 제공
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Animation speed presets (ms per word reveal)
 */
export type StreamingSpeed = 'slow' | 'normal' | 'fast';

/**
 * StreamingText component props
 */
export interface StreamingTextProps {
  /** 표시할 텍스트 */
  text: string;
  /** true = 아직 수신 중, false = 최종 텍스트 확정 */
  isPartial?: boolean;
  /** 추가 className */
  className?: string;
  /** 단어당 표시 속도 */
  speed?: StreamingSpeed;
  /** 커서 표시 여부 */
  showCursor?: boolean;
  /** 아니메이션 완료 시 호출 */
  onComplete?: () => void;
}

// 속도별 단어당 딜레이 (밀리초)
const SPEED_CONFIG = {
  slow: 120,
  normal: 55,
  fast: 22,
} as const satisfies Record<StreamingSpeed, number>;

// ───────────────────────────────────────────────────────────────────────────
// 내부 스토어: React 재렌더 없이 단어 인덱스를 관리하는 외부 저장소
// useSyncExternalStore를 사용하여 스트리밍 중 불필요한 리렌더를 방지
// ───────────────────────────────────────────────────────────────────────────

interface AnimationStore {
  visibleCount: number;
  totalCount: number;
  isAnimating: boolean;
  // 구독자에게 변경 알림
  subscribe: (listener: () => void) => () => void;
  // 현재 스냅샷 반환
  getSnapshot: () => { visibleCount: number; isAnimating: boolean };
}

function createAnimationStore(): AnimationStore {
  let visibleCount = 0;
  let totalCount = 0;
  let isAnimating = false;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  return {
    get visibleCount() {
      return visibleCount;
    },
    set visibleCount(val) {
      visibleCount = val;
      notify();
    },
    get totalCount() {
      return totalCount;
    },
    set totalCount(val) {
      totalCount = val;
    },
    get isAnimating() {
      return isAnimating;
    },
    set isAnimating(val) {
      isAnimating = val;
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return { visibleCount, isAnimating };
    },
  };
}

/**
 * StreamingText — 단어별 순차 표시 컴포넌트
 *
 * 실시간 스트리밍 텍스트를 단어 단위로 서서히 드러내며,
 * 수신 중(isPartial) / 완료 상태에 따라 시각적으로 구분합니다.
 *
 * @example
 * ```tsx
 * <StreamingText
 *   text={partialResponse}
 *   isPartial={!isDone}
 *   speed="normal"
 *   onComplete={() => console.log('finished')}
 * />
 * ```
 */
export function StreamingText({
  text,
  isPartial = false,
  className = '',
  speed = 'normal',
  showCursor = true,
  onComplete,
}: StreamingTextProps) {
  // 외부 스토어 인스턴스 (컴포넌트 마운트당 하나씩)
  const storeRef = useRef<AnimationStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createAnimationStore();
  }
  const store = storeRef.current;

  // useSyncExternalStore로 스토어 구독 — 불필요한 리렌더 최소화
  const { visibleCount, isAnimating } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // 이전 텍스트 참조 (새 단어만 감지)
  const previousTextRef = useRef('');
  // 타임어 ID 참조
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 단어 분할
  const words = text.split(/\s+/).filter(Boolean);

  // 클린업 헬퍼
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 텍스트 변경 시 새 단어 아니메이션 실행
  useEffect(() => {
    const prevWords = previousTextRef.current.split(/\s+/).filter(Boolean);

    // 동일 텍스트면 스킵
    if (text === previousTextRef.current) return;

    // 완전히 새 텍스트 (이전 텍스트가 새 텍스트의 접두사가 아닌 경우)
    const isReset =
      prevWords.length > 0 && words.slice(0, prevWords.length).join(' ') !== prevWords.join(' ');

    if (isReset) {
      // 리셋: 처음부터 다시 아니메이션
      store.visibleCount = 0;
      store.totalCount = words.length;
      store.isAnimating = true;
      previousTextRef.current = text;

      let idx = 0;
      const tick = () => {
        idx++;
        store.visibleCount = idx;
        if (idx < words.length) {
          timerRef.current = setTimeout(tick, SPEED_CONFIG[speed]);
        } else {
          store.isAnimating = false;
          onComplete?.();
        }
      };

      clearTimer();
      timerRef.current = setTimeout(tick, SPEED_CONFIG[speed]);
    } else {
      // 증분 추가: 기존 단어 유지, 새 단어만 아니메이션
      const newStartIndex = prevWords.length;
      const newWordsCount = words.length - newStartIndex;

      if (newWordsCount > 0) {
        store.totalCount = words.length;
        store.isAnimating = true;
        previousTextRef.current = text;

        let idx = 0;
        const tick = () => {
          idx++;
          store.visibleCount = newStartIndex + idx;
          if (idx < newWordsCount) {
            timerRef.current = setTimeout(tick, SPEED_CONFIG[speed]);
          } else {
            store.isAnimating = false;
            onComplete?.();
          }
        };

        clearTimer();
        timerRef.current = setTimeout(tick, SPEED_CONFIG[speed]);
      } else {
        previousTextRef.current = text;
      }
    }

    return () => clearTimer();
  }, [text, speed, onComplete, clearTimer, store]);

  // 초기 렌더: 텍스트가 있고 아직 visibleCount가 0이면 즉시 전체 표시
  useEffect(() => {
    if (words.length > 0 && store.visibleCount === 0 && previousTextRef.current === '') {
      store.visibleCount = words.length;
      store.totalCount = words.length;
      previousTextRef.current = text;
    }
  }, []);

  // 마운트 해제 시 타임어 정리
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // 표시할 단어 슬라이스
  const displayedWords = words.slice(0, visibleCount);

  // 스타일 상수
  const containerStyles: React.CSSProperties = {
    display: 'inline',
    fontFamily: 'var(--font-sans)',
    lineHeight: 'var(--leading-relaxed, 1.625)',
  };

  const wordStyles: React.CSSProperties = {
    display: 'inline',
    opacity: isPartial ? 0.75 : 1,
    transition: 'opacity 200ms ease',
  };

  const cursorStyles: React.CSSProperties = {
    display: 'inline-block',
    width: '2px',
    height: '1.1em',
    marginLeft: '1px',
    backgroundColor: 'currentColor',
    verticalAlign: 'text-bottom',
    borderRadius: '1px',
    animation: 'cursor-blink 1s step-end infinite',
  };

  // 커서 표시 조건: showCursor AND (수신 중 OR 아니메이션 진행 중)
  const shouldShowCursor = showCursor && (isPartial || isAnimating);

  return (
    <span
      className={`teu-streaming-text ${className}`}
      style={containerStyles}
      aria-live="polite"
      aria-atomic="false"
    >
      {displayedWords.map((word, i) => (
        <span
          key={i}
          className="teu-streaming-text__word animate-fade-in"
          style={wordStyles}
          aria-hidden="false"
        >
          {word}
          {i < displayedWords.length - 1 && ' '}
        </span>
      ))}

      {/* 블링킹 커서 — 수신 중 또는 아니메이션 진행 시 표시 */}
      {shouldShowCursor && (
        <span
          className="teu-streaming-text__cursor"
          style={cursorStyles}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// StreamingTextSimple — 아니메이션 없는 단순 버전
// 텍스트가 이미 완성된 경우, 또는 아니메이션이 불필요한 컨텍스트에 사용
// ═══════════════════════════════════════════════════════════════════════════

export interface StreamingTextSimpleProps {
  /** 표시할 텍스트 */
  text: string;
  /** true = 수신 중 (불투명도 낮침 + 커서 표시) */
  isPartial?: boolean;
  /** 추가 className */
  className?: string;
}

/**
 * StreamingTextSimple — 아니메이션 없는 스트리밍 텍스트
 *
 * @example
 * ```tsx
 * <StreamingTextSimple text={response} isPartial={!isDone} />
 * ```
 */
export function StreamingTextSimple({
  text,
  isPartial = false,
  className = '',
}: StreamingTextSimpleProps) {
  const styles: React.CSSProperties = {
    display: 'inline',
    opacity: isPartial ? 0.75 : 1,
    transition: 'opacity 200ms ease',
  };

  const cursorStyles: React.CSSProperties = {
    display: 'inline-block',
    width: '2px',
    height: '1.1em',
    marginLeft: '1px',
    backgroundColor: 'currentColor',
    verticalAlign: 'text-bottom',
    borderRadius: '1px',
    animation: 'cursor-blink 1s step-end infinite',
  };

  return (
    <span
      className={`teu-streaming-text-simple ${className}`}
      style={styles}
      aria-live="polite"
    >
      {text}
      {isPartial && (
        <span className="teu-streaming-text-simple__cursor" style={cursorStyles} aria-hidden="true" />
      )}
    </span>
  );
}

export default StreamingText;
