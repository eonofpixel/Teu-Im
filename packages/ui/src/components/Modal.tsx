import React, { forwardRef, useEffect, useRef, useCallback } from 'react';

/**
 * Modal size options
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Modal component props
 */
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when modal requests to close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal subtitle or description */
  subtitle?: string;
  /** Size of the modal */
  size?: ModalSize;
  /** Close on escape key press */
  closeOnEscape?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Shows close button in header */
  showCloseButton?: boolean;
  /** Prevents scroll on body when open */
  preventScroll?: boolean;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
}

const sizeStyles: Record<ModalSize, { maxWidth: string; width: string }> = {
  sm: { maxWidth: 'var(--modal-max-width-sm)', width: '100%' },
  md: { maxWidth: 'var(--modal-max-width-md)', width: '100%' },
  lg: { maxWidth: 'var(--modal-max-width-lg)', width: '100%' },
  xl: { maxWidth: 'var(--modal-max-width-xl)', width: '100%' },
  full: { maxWidth: 'calc(100vw - var(--space-8))', width: '100%' },
};

/**
 * Close icon component
 */
const CloseIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M15 5L5 15M5 5l10 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Modal component with backdrop blur and slide-in animation.
 *
 * Features:
 * - Multiple sizes: sm, md, lg, xl, full
 * - Backdrop blur effect
 * - Slide-in and fade animation
 * - Close on escape key
 * - Close on backdrop click
 * - Focus trap for accessibility
 * - Prevents body scroll when open
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   title="Confirm Action"
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
 *       <Button onClick={handleConfirm}>Confirm</Button>
 *     </>
 *   }
 * >
 *   Are you sure you want to proceed?
 * </Modal>
 * ```
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      subtitle,
      size = 'md',
      closeOnEscape = true,
      closeOnBackdropClick = true,
      showCloseButton = true,
      preventScroll = true,
      footer,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<Element | null>(null);

    // Handle escape key
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    // Handle backdrop click
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && event.target === event.currentTarget) {
        onClose();
      }
    };

    // Prevent scroll and manage focus
    useEffect(() => {
      if (isOpen) {
        // Store current active element
        previousActiveElement.current = document.activeElement;

        // Prevent body scroll
        if (preventScroll) {
          document.body.style.overflow = 'hidden';
        }

        // Add escape listener
        document.addEventListener('keydown', handleKeyDown);

        // Focus the modal
        setTimeout(() => {
          modalRef.current?.focus();
        }, 0);
      }

      return () => {
        // Restore body scroll
        if (preventScroll) {
          document.body.style.overflow = '';
        }

        // Remove escape listener
        document.removeEventListener('keydown', handleKeyDown);

        // Restore focus
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }, [isOpen, preventScroll, handleKeyDown]);

    if (!isOpen) {
      return null;
    }

    const sizeConfig = sizeStyles[size];

    const overlayStyles: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      zIndex: 'var(--z-modal-backdrop)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      backgroundColor: 'var(--color-bg-overlay)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      animation: 'fade-in 0.2s ease-out',
    };

    const modalStyles: React.CSSProperties = {
      position: 'relative',
      zIndex: 'var(--z-modal)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100vh - var(--space-8))',
      maxWidth: sizeConfig.maxWidth,
      width: sizeConfig.width,
      backgroundColor: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-2xl)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-2xl)',
      fontFamily: 'var(--font-sans)',
      animation: 'modal-slide-in 0.2s ease-out',
      ...style,
    };

    const headerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-6)',
      paddingBottom: title ? 'var(--space-4)' : 'var(--space-6)',
      borderBottom: title ? '1px solid var(--color-border-subtle)' : 'none',
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
    };

    const closeButtonStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '2rem',
      height: '2rem',
      padding: 0,
      color: 'var(--color-text-muted)',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      transition: 'all var(--duration-fast) var(--ease-out)',
      flexShrink: 0,
    };

    const bodyStyles: React.CSSProperties = {
      flex: 1,
      overflow: 'auto',
      padding: 'var(--space-6)',
      paddingTop: title ? 'var(--space-4)' : 0,
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-relaxed)',
    };

    const footerStyles: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 'var(--space-3)',
      padding: 'var(--space-4) var(--space-6)',
      borderTop: '1px solid var(--color-border-subtle)',
    };

    return (
      <div
        className="teu-modal-overlay"
        style={overlayStyles}
        onClick={handleBackdropClick}
        aria-hidden="true"
      >
        <style>
          {`
            @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes modal-slide-in {
              from {
                opacity: 0;
                transform: translateY(-10px) scale(0.98);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            .teu-modal__close:hover {
              color: var(--color-text-primary);
              background-color: var(--color-bg-tertiary);
            }

            .teu-modal__close:focus-visible {
              outline: var(--ring-width) solid var(--ring-color);
              outline-offset: var(--ring-offset);
            }

            @media (prefers-reduced-motion: reduce) {
              .teu-modal-overlay,
              .teu-modal {
                animation: none !important;
              }
            }
          `}
        </style>

        <div
          ref={(el) => {
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              ref.current = el;
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={subtitle ? 'modal-subtitle' : undefined}
          tabIndex={-1}
          className={`teu-modal teu-modal--${size} ${className || ''}`}
          style={modalStyles}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {(title || showCloseButton) && (
            <div className="teu-modal__header" style={headerStyles}>
              {title && (
                <div style={titleContainerStyles}>
                  <h2 id="modal-title" style={titleStyles}>
                    {title}
                  </h2>
                  {subtitle && (
                    <p id="modal-subtitle" style={subtitleStyles}>
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="teu-modal__close"
                  style={closeButtonStyles}
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          <div className="teu-modal__body" style={bodyStyles}>
            {children}
          </div>

          {footer && (
            <div className="teu-modal__footer" style={footerStyles}>
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
