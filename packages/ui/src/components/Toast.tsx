import React, {
  forwardRef,
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

/**
 * Toast variant types
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast position options
 */
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Toast item data
 */
export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast component props
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Toast variant */
  variant: ToastVariant;
  /** Main title */
  title: string;
  /** Optional description */
  description?: string;
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when toast should close */
  onClose?: () => void;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast context type
 */
interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook to access toast context
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Variant styles configuration
 */
const variantConfig: Record<
  ToastVariant,
  { bg: string; border: string; icon: string; progress: string }
> = {
  success: {
    bg: 'var(--color-bg-secondary)',
    border: 'var(--color-success)',
    icon: 'var(--color-success)',
    progress: 'var(--color-success)',
  },
  error: {
    bg: 'var(--color-bg-secondary)',
    border: 'var(--color-error)',
    icon: 'var(--color-error)',
    progress: 'var(--color-error)',
  },
  warning: {
    bg: 'var(--color-bg-secondary)',
    border: 'var(--color-warning)',
    icon: 'var(--color-warning)',
    progress: 'var(--color-warning)',
  },
  info: {
    bg: 'var(--color-bg-secondary)',
    border: 'var(--color-info)',
    icon: 'var(--color-info)',
    progress: 'var(--color-info)',
  },
};

/**
 * Variant icons
 */
const VariantIcon: React.FC<{ variant: ToastVariant }> = ({ variant }) => {
  const iconProps = { width: 20, height: 20, fill: 'none', 'aria-hidden': true };

  switch (variant) {
    case 'success':
      return (
        <svg {...iconProps} viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6.5 10L9 12.5L13.5 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'error':
      return (
        <svg {...iconProps} viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg {...iconProps} viewBox="0 0 20 20">
          <path
            d="M10 3L18 17H2L10 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 8V11M10 14V14.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'info':
      return (
        <svg {...iconProps} viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M10 9V14M10 6V6.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

/**
 * Close icon
 */
const CloseIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M12 4L4 12M4 4l8 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Single Toast component with auto-dismiss and progress bar.
 *
 * @example
 * ```tsx
 * <Toast
 *   variant="success"
 *   title="Session saved"
 *   description="Your recording has been saved successfully."
 *   onClose={() => {}}
 *   duration={5000}
 * />
 * ```
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      variant,
      title,
      description,
      duration = 5000,
      onClose,
      action,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(100);
    const startTimeRef = useRef<number>(Date.now());
    const remainingTimeRef = useRef<number>(duration);
    const animationRef = useRef<number>();

    const config = variantConfig[variant];

    const handleClose = useCallback(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose?.();
      }, 200);
    }, [onClose]);

    // Progress animation
    useEffect(() => {
      if (duration <= 0 || isPaused) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        const newProgress = (remaining / duration) * 100;

        setProgress(newProgress);

        if (remaining <= 0) {
          handleClose();
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      startTimeRef.current = Date.now();
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [duration, isPaused, handleClose]);

    const handleMouseEnter = () => {
      setIsPaused(true);
      remainingTimeRef.current = (progress / 100) * duration;
    };

    const handleMouseLeave = () => {
      setIsPaused(false);
      startTimeRef.current = Date.now();
    };

    const toastStyles: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      width: 'var(--toast-max-width)',
      maxWidth: '100%',
      padding: 'var(--space-4)',
      backgroundColor: config.bg,
      borderRadius: 'var(--radius-lg)',
      borderLeft: `3px solid ${config.border}`,
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      animation: isExiting ? 'toast-exit 0.2s ease-in forwards' : 'toast-enter 0.3s ease-out',
      ...style,
    };

    const iconStyles: React.CSSProperties = {
      flexShrink: 0,
      color: config.icon,
      marginTop: '2px',
    };

    const contentStyles: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const titleStyles: React.CSSProperties = {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
      color: 'var(--color-text-primary)',
      lineHeight: 'var(--leading-snug)',
    };

    const descriptionStyles: React.CSSProperties = {
      margin: 0,
      marginTop: 'var(--space-1)',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-muted)',
      lineHeight: 'var(--leading-relaxed)',
    };

    const closeButtonStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.5rem',
      height: '1.5rem',
      padding: 0,
      color: 'var(--color-text-muted)',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
      flexShrink: 0,
    };

    const actionButtonStyles: React.CSSProperties = {
      marginTop: 'var(--space-2)',
      padding: 'var(--space-1) var(--space-2)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
      color: config.icon,
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
    };

    const progressStyles: React.CSSProperties = {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: '2px',
      width: `${progress}%`,
      backgroundColor: config.progress,
      transition: isPaused ? 'none' : 'width 100ms linear',
    };

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={`teu-toast teu-toast--${variant} ${className || ''}`}
        style={toastStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <style>
          {`
            @keyframes toast-enter {
              from {
                opacity: 0;
                transform: translateX(100%);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }

            @keyframes toast-exit {
              from {
                opacity: 1;
                transform: translateX(0);
              }
              to {
                opacity: 0;
                transform: translateX(100%);
              }
            }

            .teu-toast__close:hover {
              color: var(--color-text-primary);
              background-color: var(--color-bg-tertiary);
            }

            .teu-toast__action:hover {
              background-color: var(--color-bg-tertiary);
            }

            @media (prefers-reduced-motion: reduce) {
              .teu-toast {
                animation: none !important;
              }
            }
          `}
        </style>

        <span style={iconStyles}>
          <VariantIcon variant={variant} />
        </span>

        <div style={contentStyles}>
          <p style={titleStyles}>{title}</p>
          {description && <p style={descriptionStyles}>{description}</p>}
          {action && (
            <button
              type="button"
              className="teu-toast__action"
              style={actionButtonStyles}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          type="button"
          className="teu-toast__close"
          style={closeButtonStyles}
          onClick={handleClose}
          aria-label="Dismiss notification"
        >
          <CloseIcon />
        </button>

        {duration > 0 && <div style={progressStyles} aria-hidden="true" />}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/**
 * Toast container props
 */
export interface ToastContainerProps {
  /** Position of toast stack */
  position?: ToastPosition;
  /** Maximum number of toasts to show */
  maxToasts?: number;
}

/**
 * Position styles
 */
const positionStyles: Record<ToastPosition, React.CSSProperties> = {
  'top-left': { top: 'var(--space-4)', left: 'var(--space-4)', alignItems: 'flex-start' },
  'top-center': { top: 'var(--space-4)', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
  'top-right': { top: 'var(--space-4)', right: 'var(--space-4)', alignItems: 'flex-end' },
  'bottom-left': { bottom: 'var(--space-4)', left: 'var(--space-4)', alignItems: 'flex-start' },
  'bottom-center': { bottom: 'var(--space-4)', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
  'bottom-right': { bottom: 'var(--space-4)', right: 'var(--space-4)', alignItems: 'flex-end' },
};

/**
 * Toast Container - renders toast stack at specified position
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const { toasts, removeToast } = useToast();

  const visibleToasts = toasts.slice(-maxToasts);

  const containerStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 'var(--z-toast)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    pointerEvents: 'none',
    ...positionStyles[position],
  };

  const toastWrapperStyles: React.CSSProperties = {
    pointerEvents: 'auto',
  };

  return (
    <div className="teu-toast-container" style={containerStyles} aria-label="Notifications">
      {visibleToasts.map((toast) => (
        <div key={toast.id} style={toastWrapperStyles}>
          <Toast
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            action={toast.action}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * Toast Provider - manages toast state
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <App />
 *   <ToastContainer position="bottom-right" />
 * </ToastProvider>
 * ```
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export default Toast;
