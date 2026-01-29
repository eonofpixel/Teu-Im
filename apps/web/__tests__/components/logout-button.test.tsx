import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogoutButton } from '@/components/logout-button';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockSignOut = vi.fn();
vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render logout button with Korean text', () => {
    render(<LogoutButton />);

    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('should have accessible aria-label', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '로그아웃');
  });

  it('should call signOut and redirect on click', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValueOnce({ error: null });

    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: '로그아웃' });
    await user.click(button);

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should handle signOut errors gracefully', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValueOnce({ error: new Error('SignOut failed') });

    render(<LogoutButton />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockSignOut).toHaveBeenCalledOnce();
    // Should still redirect even on error
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should have proper styling classes', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'w-full',
      'rounded-lg',
      'px-3',
      'py-2',
      'text-left',
      'text-xs',
      'text-gray-400',
      'transition-colors',
      'hover:bg-gray-800',
      'hover:text-white'
    );
  });

  it('should have minimum height for accessibility', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-[44px]');
  });

  it('should have focus ring styles for keyboard navigation', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-indigo-500',
      'focus:ring-offset-2',
      'focus:ring-offset-gray-900'
    );
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValueOnce({ error: null });

    render(<LogoutButton />);

    const button = screen.getByRole('button');
    button.focus();

    // Press Enter
    await user.keyboard('{Enter}');

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
