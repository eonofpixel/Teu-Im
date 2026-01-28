import React, { forwardRef } from 'react';

/**
 * Badge status variants for semantic meaning
 */
export type BadgeStatus = 'active' | 'paused' | 'completed' | 'error' | 'default';

/**
 * Badge size options
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge component props
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status variant that determines color */
  status?: BadgeStatus;
  /** Size of the badge */
  size?: BadgeSize;
  /** Shows pulsing animation (useful for active states) */
  pulse?: boolean;
  /** Optional leading icon */
  icon?: React.ReactNode;
  /** Badge text content */
  children: React.ReactNode;
}

const statusStyles: Record<BadgeStatus, { bg: string; text: string; dot: string }> = {
  active: {
    bg: 'var(--color-success-subtle)',
    text: 'var(--color-success-light)',
    dot: 'var(--color-success)',
  },
  paused: {
    bg: 'var(--color-warning-subtle)',
    text: 'var(--color-warning-light)',
    dot: 'var(--color-warning)',
  },
  completed: {
    bg: 'var(--color-info-subtle)',
    text: 'var(--color-info-light)',
    dot: 'var(--color-info)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    text: 'var(--color-error-light)',
    dot: 'var(--color-error)',
  },
  default: {
    bg: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-secondary)',
    dot: 'var(--color-text-muted)',
  },
};

const sizeStyles: Record<BadgeSize, { padding: string; fontSize: string; dotSize: string; height: string }> = {
  sm: {
    padding: 'var(--space-0-5) var(--space-2)',
    fontSize: 'var(--text-xs)',
    dotSize: '6px',
    height: '1.25rem',
  },
  md: {
    padding: 'var(--space-1) var(--space-2-5)',
    fontSize: 'var(--text-xs)',
    dotSize: '8px',
    height: '1.5rem',
  },
  lg: {
    padding: 'var(--space-1-5) var(--space-3)',
    fontSize: 'var(--text-sm)',
    dotSize: '10px',
    height: '1.75rem',
  },
};

/**
 * Badge component for status indicators.
 *
 * Features:
 * - Status variants: active, paused, completed, error, default
 * - Three sizes: sm, md, lg
 * - Optional pulsing animation for active states
 * - Status dot indicator
 * - Icon support
 *
 * @example
 * ```tsx
 * <Badge status="active" pulse>
 *   Recording
 * </Badge>
 *
 * <Badge status="completed" size="lg">
 *   Done
 * </Badge>
 *
 * <Badge status="error" icon={<AlertIcon />}>
 *   Failed
 * </Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      status = 'default',
      size = 'md',
      pulse = false,
      icon,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const statusConfig = statusStyles[status];
    const sizeConfig = sizeStyles[size];

    const badgeStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1-5)',
      height: sizeConfig.height,
      padding: sizeConfig.padding,
      fontSize: sizeConfig.fontSize,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
      lineHeight: 1,
      color: statusConfig.text,
      backgroundColor: statusConfig.bg,
      borderRadius: 'var(--radius-full)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      ...style,
    };

    const dotContainerStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: sizeConfig.dotSize,
      height: sizeConfig.dotSize,
    };

    const dotStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-full)',
      backgroundColor: statusConfig.dot,
    };

    const pulseRingStyles: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      borderRadius: 'var(--radius-full)',
      backgroundColor: statusConfig.dot,
      animation: 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
    };

    return (
      <span
        ref={ref}
        className={`teu-badge teu-badge--${status} teu-badge--${size} ${className || ''}`}
        style={badgeStyles}
        {...props}
      >
        <style>
          {`
            @keyframes pulse-ring {
              0% {
                transform: scale(0.8);
                opacity: 1;
              }
              100% {
                transform: scale(2);
                opacity: 0;
              }
            }
          `}
        </style>

        {icon ? (
          <span className="teu-badge__icon" aria-hidden="true">
            {icon}
          </span>
        ) : (
          <span style={dotContainerStyles}>
            {pulse && <span style={pulseRingStyles} aria-hidden="true" />}
            <span style={dotStyles} aria-hidden="true" />
          </span>
        )}

        <span className="teu-badge__text">{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
