import React, { forwardRef } from 'react';

/**
 * Card variant styles
 */
export type CardVariant = 'default' | 'elevated' | 'bordered';

/**
 * Card component props
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style variant */
  variant?: CardVariant;
  /** Enables hover effect with lift animation */
  hoverable?: boolean;
  /** Makes the card clickable with focus styles */
  clickable?: boolean;
  /** Removes padding from the card */
  noPadding?: boolean;
  /** Content to render inside the card */
  children: React.ReactNode;
}

/**
 * Card Header component
 */
export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Title text */
  title?: React.ReactNode;
  /** Subtitle or description */
  subtitle?: React.ReactNode;
  /** Action element (e.g., button, menu) */
  action?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Card Body component
 */
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Card Footer component
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Aligns content to the right */
  alignRight?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border-subtle)',
    boxShadow: 'none',
  },
  elevated: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-lg)',
  },
  bordered: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    boxShadow: 'none',
  },
};

/**
 * Card component for grouping related content.
 *
 * Features:
 * - Default, elevated, and bordered variants
 * - Optional hover effect with lift animation
 * - Clickable mode with focus styles
 * - Composable with CardHeader, CardBody, CardFooter
 *
 * @example
 * ```tsx
 * <Card variant="elevated" hoverable>
 *   <Card.Header title="Session" subtitle="Active recording" />
 *   <Card.Body>
 *     Content goes here
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      clickable = false,
      noPadding = false,
      children,
      className,
      style,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (clickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
      onKeyDown?.(event);
    };

    const cardStyles: React.CSSProperties = {
      borderRadius: 'var(--card-radius)',
      padding: noPadding ? '0' : 'var(--card-padding)',
      transition: 'all var(--duration-moderate) var(--ease-out)',
      ...variantStyles[variant],
      ...(clickable && {
        cursor: 'pointer',
      }),
      ...style,
    };

    return (
      <div
        ref={ref}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={`teu-card teu-card--${variant} ${hoverable ? 'teu-card--hoverable' : ''} ${clickable ? 'teu-card--clickable' : ''} ${className || ''}`}
        style={cardStyles}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <style>
          {`
            .teu-card--hoverable:hover {
              transform: translateY(-2px);
              box-shadow: var(--shadow-xl);
              border-color: var(--color-border);
            }

            .teu-card--clickable:hover {
              border-color: var(--color-brand-primary);
            }

            .teu-card--clickable:focus-visible {
              outline: var(--ring-width) solid var(--ring-color);
              outline-offset: var(--ring-offset);
            }

            .teu-card--clickable:active {
              transform: scale(0.99);
            }
          `}
        </style>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header - Top section with title and optional actions
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className, style, ...props }, ref) => {
    const headerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-4)',
      ...style,
    };

    const titleContainerStyles: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleStyles: React.CSSProperties = {
      margin: 0,
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
      color: 'var(--color-text-primary)',
      lineHeight: 'var(--leading-tight)',
    };

    const subtitleStyles: React.CSSProperties = {
      margin: 0,
      marginTop: 'var(--space-1)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-muted)',
      lineHeight: 'var(--leading-normal)',
    };

    return (
      <div ref={ref} className={`teu-card__header ${className || ''}`} style={headerStyles} {...props}>
        {(title || subtitle) && (
          <div style={titleContainerStyles}>
            {title && <h3 style={titleStyles}>{title}</h3>}
            {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
          </div>
        )}
        {children}
        {action && <div className="teu-card__action">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Body - Main content area
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, style, ...props }, ref) => {
    const bodyStyles: React.CSSProperties = {
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-relaxed)',
      ...style,
    };

    return (
      <div ref={ref} className={`teu-card__body ${className || ''}`} style={bodyStyles} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * Card Footer - Bottom section for actions
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ alignRight = false, children, className, style, ...props }, ref) => {
    const footerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-4)',
      paddingTop: 'var(--space-4)',
      borderTop: '1px solid var(--color-border-subtle)',
      justifyContent: alignRight ? 'flex-end' : 'flex-start',
      ...style,
    };

    return (
      <div ref={ref} className={`teu-card__footer ${className || ''}`} style={footerStyles} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Attach subcomponents
const CardNamespace = Object.assign(Card, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export { CardNamespace as default };
