import React, { forwardRef } from 'react';

/**
 * EmptyState component props
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon or illustration to display */
  icon?: React.ReactNode;
  /** Main title text */
  title: string;
  /** Descriptive text explaining the empty state */
  description?: string;
  /** Primary action button or element */
  action?: React.ReactNode;
  /** Secondary action button or element */
  secondaryAction?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    iconSize: '48px',
    titleSize: 'var(--text-base)',
    descSize: 'var(--text-sm)',
    gap: 'var(--space-3)',
    padding: 'var(--space-6)',
  },
  md: {
    iconSize: '64px',
    titleSize: 'var(--text-lg)',
    descSize: 'var(--text-sm)',
    gap: 'var(--space-4)',
    padding: 'var(--space-8)',
  },
  lg: {
    iconSize: '80px',
    titleSize: 'var(--text-xl)',
    descSize: 'var(--text-base)',
    gap: 'var(--space-5)',
    padding: 'var(--space-12)',
  },
};

/**
 * Default empty state illustration
 */
const DefaultIllustration: React.FC<{ size: string }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="8"
      y="12"
      width="48"
      height="40"
      rx="4"
      stroke="var(--color-text-muted)"
      strokeWidth="2"
      strokeDasharray="4 4"
    />
    <circle cx="32" cy="28" r="8" stroke="var(--color-text-muted)" strokeWidth="2" />
    <path
      d="M24 44h16"
      stroke="var(--color-text-muted)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * EmptyState component for displaying placeholder content.
 *
 * Features:
 * - Icon/illustration slot
 * - Title and description
 * - Primary and secondary action buttons
 * - Three sizes: sm, md, lg
 * - Centered layout with proper spacing
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FolderIcon />}
 *   title="No projects yet"
 *   description="Create your first project to get started"
 *   action={<Button>Create Project</Button>}
 * />
 *
 * <EmptyState
 *   title="No results found"
 *   description="Try adjusting your search or filters"
 *   size="sm"
 * />
 * ```
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      secondaryAction,
      size = 'md',
      className,
      style,
      ...props
    },
    ref
  ) => {
    const sizeConfig = sizeStyles[size];

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: sizeConfig.padding,
      gap: sizeConfig.gap,
      fontFamily: 'var(--font-sans)',
      ...style,
    };

    const iconContainerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-text-muted)',
      marginBottom: 'var(--space-2)',
    };

    const contentStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-2)',
      maxWidth: '24rem',
    };

    const titleStyles: React.CSSProperties = {
      margin: 0,
      fontSize: sizeConfig.titleSize,
      fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
      color: 'var(--color-text-primary)',
      lineHeight: 'var(--leading-tight)',
    };

    const descriptionStyles: React.CSSProperties = {
      margin: 0,
      fontSize: sizeConfig.descSize,
      color: 'var(--color-text-muted)',
      lineHeight: 'var(--leading-relaxed)',
    };

    const actionsStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-2)',
      flexWrap: 'wrap',
      justifyContent: 'center',
    };

    return (
      <div
        ref={ref}
        className={`teu-empty-state teu-empty-state--${size} ${className || ''}`}
        style={containerStyles}
        role="status"
        {...props}
      >
        <div style={iconContainerStyles}>
          {icon || <DefaultIllustration size={sizeConfig.iconSize} />}
        </div>

        <div style={contentStyles}>
          <h3 style={titleStyles}>{title}</h3>
          {description && <p style={descriptionStyles}>{description}</p>}
        </div>

        {(action || secondaryAction) && (
          <div style={actionsStyles}>
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
