import React, { forwardRef } from 'react';

/**
 * Skeleton variant types
 */
export type SkeletonVariant = 'text' | 'card' | 'avatar' | 'button' | 'custom';

/**
 * LoadingSkeleton component props
 */
export interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Predefined shape variant */
  variant?: SkeletonVariant;
  /** Width of the skeleton (CSS value) */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** Border radius (CSS value) */
  borderRadius?: string;
  /** Number of skeleton items to render (for text variant) */
  count?: number;
  /** Gap between items when count > 1 */
  gap?: string;
  /** Disables animation */
  animated?: boolean;
}

/**
 * Skeleton configuration for variants
 */
const variantConfig: Record<SkeletonVariant, { width: string; height: string; radius: string }> = {
  text: {
    width: '100%',
    height: '1rem',
    radius: 'var(--radius-sm)',
  },
  card: {
    width: '100%',
    height: '8rem',
    radius: 'var(--radius-xl)',
  },
  avatar: {
    width: '2.5rem',
    height: '2.5rem',
    radius: 'var(--radius-full)',
  },
  button: {
    width: '6rem',
    height: 'var(--button-height-md)',
    radius: 'var(--radius-lg)',
  },
  custom: {
    width: '100%',
    height: '1rem',
    radius: 'var(--radius-md)',
  },
};

/**
 * Single skeleton item
 */
const SkeletonItem: React.FC<{
  width: string | number;
  height: string | number;
  borderRadius: string;
  animated: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ width, height, borderRadius, animated, className, style }) => {
  const skeletonStyles: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius,
    backgroundColor: 'var(--color-bg-tertiary)',
    ...(animated && {
      background: `linear-gradient(
        90deg,
        var(--color-bg-tertiary) 0%,
        var(--color-bg-elevated) 50%,
        var(--color-bg-tertiary) 100%
      )`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s linear infinite',
    }),
    ...style,
  };

  return <div className={className} style={skeletonStyles} aria-hidden="true" />;
};

/**
 * LoadingSkeleton component with shimmer animation.
 *
 * Features:
 * - Predefined variants: text, card, avatar, button, custom
 * - Shimmer animation effect
 * - Customizable dimensions and border radius
 * - Multiple items with gap support
 * - Respects reduced motion preferences
 *
 * @example
 * ```tsx
 * // Single text line skeleton
 * <LoadingSkeleton variant="text" />
 *
 * // Multiple text lines
 * <LoadingSkeleton variant="text" count={3} />
 *
 * // Avatar skeleton
 * <LoadingSkeleton variant="avatar" />
 *
 * // Custom dimensions
 * <LoadingSkeleton
 *   variant="custom"
 *   width="200px"
 *   height="100px"
 *   borderRadius="var(--radius-lg)"
 * />
 * ```
 */
export const LoadingSkeleton = forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      borderRadius,
      count = 1,
      gap = 'var(--space-2)',
      animated = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const config = variantConfig[variant];

    const resolvedWidth = width ?? config.width;
    const resolvedHeight = height ?? config.height;
    const resolvedRadius = borderRadius ?? config.radius;

    // For text with varying widths
    const getTextWidth = (index: number, total: number): string | number => {
      if (variant !== 'text' || typeof resolvedWidth !== 'string' || resolvedWidth !== '100%') {
        return resolvedWidth;
      }
      // Last line is shorter
      if (index === total - 1 && total > 1) {
        return '75%';
      }
      // Second to last is slightly shorter
      if (index === total - 2 && total > 2) {
        return '90%';
      }
      return '100%';
    };

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap,
      ...style,
    };

    // Single item doesn't need container
    if (count === 1) {
      return (
        <div ref={ref} className={`teu-skeleton ${className || ''}`} {...props}>
          <style>
            {`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }

              @media (prefers-reduced-motion: reduce) {
                .teu-skeleton * {
                  animation: none !important;
                }
              }
            `}
          </style>
          <SkeletonItem
            width={resolvedWidth}
            height={resolvedHeight}
            borderRadius={resolvedRadius}
            animated={animated}
          />
        </div>
      );
    }

    // Multiple items
    return (
      <div
        ref={ref}
        className={`teu-skeleton teu-skeleton--multiple ${className || ''}`}
        style={containerStyles}
        {...props}
      >
        <style>
          {`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }

            @media (prefers-reduced-motion: reduce) {
              .teu-skeleton * {
                animation: none !important;
              }
            }
          `}
        </style>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonItem
            key={index}
            width={getTextWidth(index, count)}
            height={resolvedHeight}
            borderRadius={resolvedRadius}
            animated={animated}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          />
        ))}
      </div>
    );
  }
);

LoadingSkeleton.displayName = 'LoadingSkeleton';

/**
 * Preset skeleton compositions for common UI patterns
 */
export const SkeletonPresets = {
  /**
   * Card skeleton with image, title, and description
   */
  Card: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <LoadingSkeleton variant="card" height="10rem" />
      <LoadingSkeleton variant="text" width="60%" />
      <LoadingSkeleton variant="text" count={2} />
    </div>
  ),

  /**
   * List item skeleton with avatar and text
   */
  ListItem: () => (
    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
      <LoadingSkeleton variant="avatar" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <LoadingSkeleton variant="text" width="40%" />
        <LoadingSkeleton variant="text" width="70%" />
      </div>
    </div>
  ),

  /**
   * Profile skeleton with avatar, name, and bio
   */
  Profile: () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
      <LoadingSkeleton variant="avatar" width="5rem" height="5rem" />
      <LoadingSkeleton variant="text" width="8rem" />
      <LoadingSkeleton variant="text" width="12rem" />
    </div>
  ),

  /**
   * Table row skeleton
   */
  TableRow: ({ columns = 4 }: { columns?: number }) => (
    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <LoadingSkeleton
          key={i}
          variant="text"
          width={i === 0 ? '20%' : `${60 / (columns - 1)}%`}
        />
      ))}
    </div>
  ),
};

export default LoadingSkeleton;
