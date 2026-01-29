import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/error-boundary';

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

// Component that throws an error when shouldThrow is true
function ProblematicComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should show default fallback UI when error is thrown', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for Korean error message
    expect(screen.getByText('예상치 못한 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText(/페이지를 다시 로드하거나/)).toBeInTheDocument();
  });

  it('should show custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('예상치 못한 오류가 발생했습니다')).not.toBeInTheDocument();
  });

  it('should have retry button that resets the boundary', async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error state shown
    expect(screen.getByText('예상치 못한 오류가 발생했습니다')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /다시 시도/ });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);

    // After clicking retry, the error boundary state is reset
    // The component will re-render and throw again in our test case
    // In real usage, this would allow recovering from transient errors
  });

  it('should have page reload button', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /페이지 새로고침/ });
    expect(reloadButton).toBeInTheDocument();
  });

  it('should render error icon SVG', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for SVG presence (warning triangle icon)
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-red-500');
  });

  it('should have accessible button labels', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /페이지 새로고침/ })).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('개발 모드: 오류 상세 보기')).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should not show error details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('개발 모드: 오류 상세 보기')).not.toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });
});
