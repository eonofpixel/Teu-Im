/**
 * @teu-im/ui - Shared UI Component Library
 *
 * A comprehensive design system providing:
 * - Design tokens (CSS custom properties)
 * - Reusable React components
 * - Animation utilities
 * - Custom hooks
 * - Language constants
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════════
// STYLES - Import these in your app's entry point
// ═══════════════════════════════════════════════════════════════════════════

// Design tokens (CSS variables)
import './styles/tokens.css';

// Animation utilities
import './styles/animations.css';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Button - Primary interaction element
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

// Card - Content container with variants
export { Card, CardHeader, CardBody, CardFooter } from './components/Card';
export type { CardProps, CardVariant, CardHeaderProps, CardBodyProps, CardFooterProps } from './components/Card';

// Input - Form input with validation states
export { Input } from './components/Input';
export type { InputProps, InputSize } from './components/Input';

// Badge - Status indicators
export { Badge } from './components/Badge';
export type { BadgeProps, BadgeStatus, BadgeSize } from './components/Badge';

// EmptyState - Placeholder for empty content
export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

// LoadingSkeleton - Loading placeholders with shimmer
export { LoadingSkeleton, SkeletonPresets } from './components/LoadingSkeleton';
export type { LoadingSkeletonProps, SkeletonVariant } from './components/LoadingSkeleton';

// Modal - Dialog overlay
export { Modal } from './components/Modal';
export type { ModalProps, ModalSize } from './components/Modal';

// Toast - Notification system
export {
  Toast,
  ToastContainer,
  ToastProvider,
  useToast,
} from './components/Toast';
export type {
  ToastProps,
  ToastVariant,
  ToastPosition,
  ToastItem,
  ToastContainerProps,
} from './components/Toast';

// AnimatedPresence - Enter/exit animations
export { AnimatedPresence } from './components/AnimatedPresence';

// Transition - Simple transition wrapper
export { Transition } from './components/Transition';

// ConnectionIndicator - Connection status indicator
export { ConnectionIndicator } from './components/ConnectionIndicator';
export type { ConnectionStatus } from './components/ConnectionIndicator';

// SuccessCheckmark - Animated success indicator
export { SuccessCheckmark } from './components/SuccessCheckmark';

// StreamingText - Real-time word-by-word text reveal
export { StreamingText, StreamingTextSimple } from './components/StreamingText';
export type { StreamingTextProps, StreamingTextSimpleProps, StreamingSpeed } from './components/StreamingText';

// StatefulButton - Context-aware session action button
export { StatefulButton } from './components/StatefulButton';
export type { StatefulButtonProps, SessionState } from './components/StatefulButton';

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

// useShake - Error feedback animation
export { useShake } from './hooks/useShake';

// useRipple - Button ripple effect
export { useRipple } from './hooks/useRipple';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Language utilities
export {
  SUPPORTED_LANGUAGES,
  getLanguage,
  getLanguageName,
  getLanguageNativeName,
  getLanguageFlag,
  getLanguageDirection,
  isLanguageSupported,
  getLanguageOptions,
  getLanguagePairDisplay,
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  COMMON_LANGUAGE_PAIRS,
} from './constants/languages';
export type { Language, LanguageCode } from './constants/languages';
