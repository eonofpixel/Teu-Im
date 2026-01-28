import React, { forwardRef, useId, useState } from 'react';

/**
 * Input size options
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input component props
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message - when set, input shows error state */
  error?: string;
  /** Size of the input */
  size?: InputSize;
  /** Icon to display at the start of the input */
  leftIcon?: React.ReactNode;
  /** Icon or element to display at the end of the input */
  rightElement?: React.ReactNode;
  /** Makes the input take full width */
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, { height: string; fontSize: string; padding: string }> = {
  sm: {
    height: 'var(--input-height-sm)',
    fontSize: 'var(--text-sm)',
    padding: 'var(--space-2) var(--space-3)',
  },
  md: {
    height: 'var(--input-height-md)',
    fontSize: 'var(--text-sm)',
    padding: 'var(--space-2-5) var(--space-3)',
  },
  lg: {
    height: 'var(--input-height-lg)',
    fontSize: 'var(--text-base)',
    padding: 'var(--space-3) var(--space-4)',
  },
};

/**
 * Input component with label, error state, and helper text.
 *
 * Features:
 * - Three sizes: sm, md, lg
 * - Label and helper text support
 * - Error state with validation message
 * - Focus ring animation
 * - Left icon and right element slots
 * - Full accessibility with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   helperText="We'll never share your email"
 * />
 *
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      leftIcon,
      rightElement,
      fullWidth = false,
      disabled,
      className,
      style,
      id: providedId,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(event);
    };

    const hasError = Boolean(error);
    const sizeConfig = sizeStyles[size];

    const containerStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1-5)',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: 'var(--font-sans)',
      ...style,
    };

    const labelStyles: React.CSSProperties = {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
      color: hasError ? 'var(--color-error-light)' : 'var(--color-text-secondary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    };

    const inputWrapperStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const inputStyles: React.CSSProperties = {
      width: '100%',
      height: sizeConfig.height,
      padding: sizeConfig.padding,
      paddingLeft: leftIcon ? 'calc(var(--space-3) + 1.25rem + var(--space-2))' : sizeConfig.padding.split(' ')[1],
      paddingRight: rightElement ? 'calc(var(--space-3) + 1.25rem + var(--space-2))' : sizeConfig.padding.split(' ')[1],
      fontSize: sizeConfig.fontSize,
      fontFamily: 'inherit',
      color: 'var(--color-text-primary)',
      backgroundColor: 'var(--color-bg-secondary)',
      border: `1px solid ${hasError ? 'var(--color-error)' : isFocused ? 'var(--color-border-focus)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-lg)',
      outline: 'none',
      transition: 'all var(--duration-normal) var(--ease-out)',
      cursor: disabled ? 'not-allowed' : 'text',
      opacity: disabled ? 0.6 : 1,
    };

    const iconStyles: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: hasError ? 'var(--color-error)' : 'var(--color-text-muted)',
      pointerEvents: 'none',
    };

    const helperStyles: React.CSSProperties = {
      fontSize: 'var(--text-xs)',
      color: hasError ? 'var(--color-error-light)' : 'var(--color-text-muted)',
      margin: 0,
    };

    return (
      <div className={`teu-input ${className || ''}`} style={containerStyles}>
        {label && (
          <label htmlFor={inputId} style={labelStyles}>
            {label}
          </label>
        )}

        <div style={inputWrapperStyles}>
          {leftIcon && (
            <span
              style={{
                ...iconStyles,
                left: 'var(--space-3)',
              }}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              [helperText && helperId, error && errorId].filter(Boolean).join(' ') || undefined
            }
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={inputStyles}
            className="teu-input__field"
            {...props}
          />

          {rightElement && (
            <span
              style={{
                ...iconStyles,
                right: 'var(--space-3)',
                pointerEvents: 'auto',
              }}
            >
              {rightElement}
            </span>
          )}
        </div>

        {(helperText || error) && (
          <p
            id={error ? errorId : helperId}
            role={error ? 'alert' : undefined}
            style={helperStyles}
          >
            {error || helperText}
          </p>
        )}

        <style>
          {`
            .teu-input__field::placeholder {
              color: var(--color-text-muted);
            }

            .teu-input__field:hover:not(:disabled):not(:focus) {
              border-color: var(--color-text-muted);
            }

            .teu-input__field:focus {
              box-shadow: 0 0 0 3px var(--color-brand-subtle);
            }

            .teu-input__field[aria-invalid="true"]:focus {
              box-shadow: 0 0 0 3px var(--color-error-subtle);
            }
          `}
        </style>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
