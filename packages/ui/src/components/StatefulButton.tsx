import React, { useCallback, useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Session lifecycle states that drive the button's appearance and action.
 *
 * - idle       → No active session. Primary CTA is "Start".
 * - recording  → Audio capture is live. Primary is "Pause", secondary is "End".
 * - streaming  → AI response is streaming. Primary is "Stop stream".
 * - paused     → Recording paused mid-session. Primary is "Resume".
 * - ending     → Graceful shutdown in progress. Non-interactive loading state.
 */
export type SessionState = 'idle' | 'recording' | 'streaming' | 'paused' | 'ending';

export interface StatefulButtonProps {
  /** Current session lifecycle state */
  state: SessionState;
  /** Fires when the user initiates a new session */
  onStart?: () => void;
  /** Fires when the user pauses an active recording */
  onPause?: () => void;
  /** Fires when the user resumes a paused recording */
  onResume?: () => void;
  /** Fires when the user stops an active stream */
  onStop?: () => void;
  /** Fires when the user ends the session entirely */
  onEnd?: () => void;
  /** Disables all interactions */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE CONFIGURATION
// Maps each SessionState to its primary action and optional secondary action.
// ═══════════════════════════════════════════════════════════════════════════

type ColorToken = 'brand' | 'success' | 'warning' | 'danger' | 'muted';
type IconName = 'mic' | 'pause' | 'play' | 'stop' | 'x' | 'loader';

interface ActionConfig {
  label: string;
  icon: IconName;
  action: keyof Omit<StatefulButtonProps, 'state' | 'disabled' | 'className'> | null;
  color: ColorToken;
}

interface StateConfig {
  primary: ActionConfig;
  secondary: ActionConfig | null;
}

const STATE_CONFIG = {
  idle: {
    primary: { label: '수신 시작', icon: 'mic', action: 'onStart', color: 'brand' },
    secondary: null,
  },
  recording: {
    primary: { label: '일시정지', icon: 'pause', action: 'onPause', color: 'warning' },
    secondary: { label: '종료', icon: 'stop', action: 'onEnd', color: 'danger' },
  },
  streaming: {
    primary: { label: '송출 중지', icon: 'stop', action: 'onStop', color: 'danger' },
    secondary: { label: '종료', icon: 'x', action: 'onEnd', color: 'muted' },
  },
  paused: {
    primary: { label: '재개', icon: 'play', action: 'onResume', color: 'success' },
    secondary: { label: '종료', icon: 'stop', action: 'onEnd', color: 'danger' },
  },
  ending: {
    primary: { label: '종료 중...', icon: 'loader', action: null, color: 'muted' },
    secondary: null,
  },
} as const satisfies Record<SessionState, StateConfig>;

// ═══════════════════════════════════════════════════════════════════════════
// ICONS — Lightweight inline SVGs matching the design system's 1.25rem (20px) base
// ═══════════════════════════════════════════════════════════════════════════

const Icons: Record<IconName, React.FC<{ size: string }>> = {
  mic: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  pause: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  play: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  stop: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  x: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  loader: ({ size }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════
// COLOR TOKENS → Computed inline styles using design system CSS variables
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_MAP: Record<ColorToken, { bg: string; bgHover: string; shadow: string }> = {
  brand: {
    bg: 'var(--color-brand-primary)',
    bgHover: 'var(--color-brand-hover)',
    shadow: 'var(--shadow-brand)',
  },
  success: {
    bg: 'var(--color-success)',
    bgHover: '#059669', // emerald-600
    shadow: 'var(--shadow-success)',
  },
  warning: {
    bg: 'var(--color-warning)',
    bgHover: '#d97706', // amber-600
    shadow: '0 4px 14px 0 rgba(245, 158, 11, 0.3)',
  },
  danger: {
    bg: 'var(--color-error)',
    bgHover: 'var(--color-error-light)',
    shadow: 'var(--shadow-error)',
  },
  muted: {
    bg: 'var(--color-bg-tertiary)',
    bgHover: 'var(--color-bg-elevated)',
    shadow: 'none',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * StatefulButton — A context-aware action button that collapses the full
 * session lifecycle (start / pause / resume / stop / end) into a single
 * dominant primary action with an optional quiet secondary action.
 *
 * Design intent: reduce cognitive load by surfacing only the *next logical
 * action* for the current state, inspired by the Toss mobile banking pattern.
 *
 * Keyboard bindings:
 * - Space → triggers the primary action for the current state
 * - Escape → triggers onEnd (session termination)
 *
 * @example
 * ```tsx
 * <StatefulButton
 *   state={sessionState}
 *   onStart={handleStart}
 *   onPause={handlePause}
 *   onResume={handleResume}
 *   onStop={handleStop}
 *   onEnd={handleEnd}
 * />
 * ```
 */
export function StatefulButton({
  state,
  onStart,
  onPause,
  onResume,
  onStop,
  onEnd,
  disabled = false,
  className = '',
}: StatefulButtonProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const [hoverSecondary, setHoverSecondary] = useState(false);
  const prevStateRef = useRef(state);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = STATE_CONFIG[state];
  const colors = COLOR_MAP[config.primary.color];

  // Trigger scale-down / scale-up transition on state change
  useEffect(() => {
    if (prevStateRef.current !== state) {
      prevStateRef.current = state;
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 180);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Keyboard shortcut bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focus is inside a text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'idle') onStart?.();
        else if (state === 'recording') onPause?.();
        else if (state === 'paused') onResume?.();
        else if (state === 'streaming') onStop?.();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        onEnd?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, onStart, onPause, onResume, onStop, onEnd]);

  // Dispatch action by name
  const handleAction = useCallback(
    (actionName: ActionConfig['action']) => {
      if (!actionName || disabled) return;
      const actions: Record<string, (() => void) | undefined> = {
        onStart,
        onPause,
        onResume,
        onStop,
        onEnd,
      };
      actions[actionName]?.();
    },
    [disabled, onStart, onPause, onResume, onStop, onEnd]
  );

  // ─── Primary button styles ───────────────────────────────────────────────
  const primaryStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    height: 'var(--button-height-lg)',
    padding: '0 var(--space-6)',
    minWidth: '9rem', // 144px — prevents layout shift across labels
    borderRadius: 'var(--radius-lg)',
    border: '1px solid transparent',
    backgroundColor: hoverPrimary && !disabled ? colors.bgHover : colors.bg,
    color: 'white',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
    cursor: disabled || !config.primary.action ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    boxShadow: hoverPrimary && !disabled ? colors.shadow : 'none',
    transform: isTransitioning ? 'scale(0.93)' : 'scale(1)',
    transition: [
      'background-color var(--duration-normal) var(--ease-in-out)',
      'box-shadow var(--duration-normal) var(--ease-out)',
      'transform var(--duration-moderate) var(--ease-bounce)',
      'opacity var(--duration-normal) var(--ease-out)',
    ].join(', '),
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as React.CSSProperties['whiteSpace'],
    userSelect: 'none' as React.CSSProperties['userSelect'],
  };

  // ─── Secondary button styles ─────────────────────────────────────────────
  const secondaryStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-1-5)',
    height: 'var(--button-height-lg)',
    padding: '0 var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    border: `1px solid ${hoverSecondary && !disabled ? 'var(--color-text-muted)' : 'var(--color-border)'}`,
    backgroundColor: hoverSecondary && !disabled ? 'var(--color-bg-elevated)' : 'var(--color-bg-tertiary)',
    color: hoverSecondary && !disabled ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: [
      'background-color var(--duration-normal) var(--ease-in-out)',
      'border-color var(--duration-normal) var(--ease-in-out)',
      'color var(--duration-normal) var(--ease-in-out)',
      'transform var(--duration-fast) var(--ease-out)',
    ].join(', '),
    whiteSpace: 'nowrap' as React.CSSProperties['whiteSpace'],
    userSelect: 'none' as React.CSSProperties['userSelect'],
  };

  const PrimaryIcon = Icons[config.primary.icon];
  const SecondaryIcon = config.secondary ? Icons[config.secondary.icon] : null;

  return (
    <div
      ref={containerRef}
      className={`teu-stateful-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .teu-stateful-button__primary:active:not(:disabled) {
          transform: scale(0.95) !important;
        }
        .teu-stateful-button__secondary:active:not(:disabled) {
          transform: scale(0.97);
        }
        .teu-stateful-button__primary:focus-visible,
        .teu-stateful-button__secondary:focus-visible {
          outline: var(--ring-width) solid var(--ring-color);
          outline-offset: var(--ring-offset);
        }
      `}</style>

      {/* Primary action */}
      <button
        className="teu-stateful-button__primary"
        type="button"
        disabled={disabled || !config.primary.action}
        onClick={() => handleAction(config.primary.action)}
        onMouseEnter={() => setHoverPrimary(true)}
        onMouseLeave={() => setHoverPrimary(false)}
        aria-disabled={disabled || !config.primary.action}
        aria-busy={state === 'ending'}
        aria-label={config.primary.label}
        style={primaryStyle}
      >
        <PrimaryIcon size="1.25rem" />
        <span style={{ visibility: 'visible' }}>{config.primary.label}</span>
      </button>

      {/* Secondary action — only rendered when the state calls for it */}
      {config.secondary && (
        <button
          className="teu-stateful-button__secondary"
          type="button"
          disabled={disabled}
          onClick={() => handleAction(config.secondary!.action)}
          onMouseEnter={() => setHoverSecondary(true)}
          onMouseLeave={() => setHoverSecondary(false)}
          aria-disabled={disabled}
          aria-label={config.secondary.label}
          style={secondaryStyle}
        >
          {SecondaryIcon && <SecondaryIcon size="1rem" />}
          <span>{config.secondary.label}</span>
        </button>
      )}
    </div>
  );
}

StatefulButton.displayName = 'StatefulButton';

export default StatefulButton;
