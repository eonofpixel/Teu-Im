import React, { forwardRef, useRef, useCallback } from 'react';

/**
 * Button variant styles
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Button size options
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading spinner and disables interactions */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to display before the label */
  leftIcon?: React.ReactNode;
  /** Icon to display after the label */
  rightIcon?: React.ReactNode;
  /** Content to render inside the button */
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background-color: var(--color-brand-primary);
    color: white;
    border: 1px solid transparent;
  `,
  secondary: `
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  `,
  ghost: `
    background-color: transparent;
    color: var(--color-text-secondary);
    border: 1px solid transparent;
  `,
  danger: `
    background-color: var(--color-error);
    color: white;
    border: 1px solid transparent;
  `,
};

const variantHoverStyles: Record<ButtonVariant, string> = {
  primary: `
    background-color: var(--color-brand-hover);
  `,
  secondary: `
    background-color: var(--color-bg-elevated);
    border-color: var(--color-text-muted);
  `,
  ghost: `
    background-color: var(--color-bg-tertiary);
  `,
  danger: `
    background-color: var(--color-error-light);
  `,
};

const sizeStyles: Record<ButtonSize, { height: string; padding: string; fontSize: string; iconSize: string }> = {
  sm: {
    height: 'var(--button-height-sm)',
    padding: '0 var(--button-padding-sm)',
    fontSize: 'var(--text-sm)',
    iconSize: '1rem',
  },
  md: {
    height: 'var(--button-height-md)',
    padding: '0 var(--button-padding-md)',
    fontSize: 'var(--text-sm)',
    iconSize: '1.25rem',
  },
  lg: {
    height: 'var(--button-height-lg)',
    padding: '0 var(--button-padding-lg)',
    fontSize: 'var(--text-base)',
    iconSize: '1.5rem',
  },
};

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC<{ size: string }> = ({ size }) => (
  <svg
    className="button-spinner"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{
      animation: 'spin 1s linear infinite',
    }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.25"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Button component with multiple variants, sizes, and states.
 *
 * Features:
 * - Primary, secondary, ghost, and danger variants
 * - Three sizes: sm, md, lg
 * - Loading state with spinner
 * - Scale-on-press micro-interaction
 * - Ripple effect on click
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * <Button variant="secondary" loading>
 *   Saving...
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      onClick,
      style,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const isDisabled = disabled || loading;

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) return;

        // Create ripple effect
        const button = buttonRef.current;
        if (button) {
          const rect = button.getBoundingClientRect();
          const ripple = document.createElement('span');
          const diameter = Math.max(rect.width, rect.height);
          const radius = diameter / 2;

          ripple.style.width = ripple.style.height = `${diameter}px`;
          ripple.style.left = `${event.clientX - rect.left - radius}px`;
          ripple.style.top = `${event.clientY - rect.top - radius}px`;
          ripple.style.position = 'absolute';
          ripple.style.borderRadius = '50%';
          ripple.style.backgroundColor = 'currentColor';
          ripple.style.opacity = '0.2';
          ripple.style.transform = 'scale(0)';
          ripple.style.animation = 'ripple 0.5s ease-out forwards';
          ripple.style.pointerEvents = 'none';

          button.appendChild(ripple);

          setTimeout(() => {
            ripple.remove();
          }, 500);
        }

        onClick?.(event);
      },
      [isDisabled, onClick]
    );

    const sizeConfig = sizeStyles[size];

    const buttonStyle: React.CSSProperties = {
      // Base styles
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
      borderRadius: 'var(--radius-lg)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'all var(--duration-normal) var(--ease-out)',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      // Size-specific
      height: sizeConfig.height,
      padding: sizeConfig.padding,
      fontSize: sizeConfig.fontSize,
      // Full width
      width: fullWidth ? '100%' : 'auto',
      // Disabled opacity
      opacity: isDisabled ? 0.6 : 1,
      // Merge with variant styles (parsed from string)
      ...style,
    };

    // Add keyframe for ripple if not exists
    if (typeof document !== 'undefined' && !document.getElementById('button-ripple-keyframes')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'button-ripple-keyframes';
      styleSheet.textContent = `
        @keyframes ripple {
          to {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    return (
      <button
        ref={(el) => {
          buttonRef.current = el;
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        type="button"
        disabled={isDisabled}
        className={`teu-button teu-button--${variant} teu-button--${size} ${className || ''}`}
        onClick={handleClick}
        aria-busy={loading}
        aria-disabled={isDisabled}
        style={buttonStyle}
        {...props}
      >
        <style>
          {`
            .teu-button--primary {
              ${variantStyles.primary}
            }
            .teu-button--primary:hover:not(:disabled) {
              ${variantHoverStyles.primary}
            }
            .teu-button--primary:focus-visible {
              outline: var(--ring-width) solid var(--ring-color);
              outline-offset: var(--ring-offset);
            }
            .teu-button--primary:active:not(:disabled) {
              transform: scale(0.97);
            }

            .teu-button--secondary {
              ${variantStyles.secondary}
            }
            .teu-button--secondary:hover:not(:disabled) {
              ${variantHoverStyles.secondary}
            }
            .teu-button--secondary:focus-visible {
              outline: var(--ring-width) solid var(--ring-color);
              outline-offset: var(--ring-offset);
            }
            .teu-button--secondary:active:not(:disabled) {
              transform: scale(0.97);
            }

            .teu-button--ghost {
              ${variantStyles.ghost}
            }
            .teu-button--ghost:hover:not(:disabled) {
              ${variantHoverStyles.ghost}
            }
            .teu-button--ghost:focus-visible {
              outline: var(--ring-width) solid var(--ring-color);
              outline-offset: var(--ring-offset);
            }
            .teu-button--ghost:active:not(:disabled) {
              transform: scale(0.97);
            }

            .teu-button--danger {
              ${variantStyles.danger}
            }
            .teu-button--danger:hover:not(:disabled) {
              ${variantHoverStyles.danger}
            }
            .teu-button--danger:focus-visible {
              outline: var(--ring-width) solid var(--color-error);
              outline-offset: var(--ring-offset);
            }
            .teu-button--danger:active:not(:disabled) {
              transform: scale(0.97);
            }
          `}
        </style>

        {loading && (
          <LoadingSpinner size={sizeConfig.iconSize} />
        )}

        {!loading && leftIcon && (
          <span className="teu-button__icon teu-button__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <span className="teu-button__label" style={{ visibility: loading ? 'hidden' : 'visible' }}>
          {children}
        </span>

        {!loading && rightIcon && (
          <span className="teu-button__icon teu-button__icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
