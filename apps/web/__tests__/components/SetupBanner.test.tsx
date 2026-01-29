import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupBanner } from '@/components/SetupBanner';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase client
const mockGetUser = vi.fn();

// Default chain that returns empty/null to prevent unhandled rejections
const createMockChain = (data: unknown = null, count: number = 0) => ({
  eq: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data }),
    then: vi.fn().mockResolvedValue({ count }),
  }),
  single: vi.fn().mockResolvedValue({ data }),
});

const mockFromResults: Array<ReturnType<typeof createMockChain>> = [];

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => mockFromResults.shift() || createMockChain()),
    })),
  }),
}));

describe('SetupBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFromResults.length = 0;
  });

  it('should show nothing while loading', () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    const { container } = render(<SetupBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when setup is complete', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // API key check - has key
    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: 'test-key' } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    // Projects count check - has projects
    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 1 }),
      single: vi.fn(),
    });

    const { container } = render(<SetupBanner />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    }, { timeout: 2000 });
  });

  it('should render when API key is missing', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: null } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 1 }),
      single: vi.fn(),
    });

    render(<SetupBanner />);

    await waitFor(() => {
      expect(screen.getByText('시작하기')).toBeInTheDocument();
    });

    expect(screen.getByText('Soniox API 키 등록')).toBeInTheDocument();
  });

  it('should render when no projects exist', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: 'test-key' } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
      single: vi.fn(),
    });

    render(<SetupBanner />);

    await waitFor(() => {
      expect(screen.getByText('시작하기')).toBeInTheDocument();
    });

    expect(screen.getByText('프로젝트 생성')).toBeInTheDocument();
  });

  it('should show progress counter', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: 'test-key' } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
      single: vi.fn(),
    });

    render(<SetupBanner />);

    await waitFor(() => {
      expect(screen.getByText('1/2')).toBeInTheDocument();
    });
  });

  it('should dismiss banner when close button is clicked', async () => {
    const user = userEvent.setup();
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: null } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
      single: vi.fn(),
    });

    const { container } = render(<SetupBanner />);

    await waitFor(() => {
      expect(screen.getByText('시작하기')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: '닫기' });
    await user.click(closeButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should have accessible close button', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: null } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
      single: vi.fn(),
    });

    render(<SetupBanner />);

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: '닫기' });
      expect(closeButton).toBeInTheDocument();
    });
  });

  it('should render setup instructions text', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    mockFromResults.push({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { soniox_api_key: null } }),
        then: vi.fn(),
      }),
      single: vi.fn(),
    });

    mockFromResults.push({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
      single: vi.fn(),
    });

    render(<SetupBanner />);

    await waitFor(() => {
      expect(screen.getByText('실시간 통역을 시작하려면 아래 단계를 완료하세요')).toBeInTheDocument();
    });
  });
});
