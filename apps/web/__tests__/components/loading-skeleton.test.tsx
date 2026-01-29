import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SkeletonBar,
  StatCardSkeleton,
  ChartSkeleton,
  AnalyticsPageSkeleton,
  SettingsPageSkeleton,
  ListSkeleton,
} from '@/components/loading-skeleton';

describe('SkeletonBar', () => {
  it('should render with default classes', () => {
    const { container } = render(<SkeletonBar />);
    const bar = container.firstChild as HTMLElement;

    expect(bar).toHaveClass('bg-gray-800', 'rounded', 'animate-pulse');
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonBar className="h-4 w-24" />);
    const bar = container.firstChild as HTMLElement;

    expect(bar).toHaveClass('h-4', 'w-24', 'bg-gray-800', 'rounded', 'animate-pulse');
  });
});

describe('StatCardSkeleton', () => {
  it('should render card structure', () => {
    const { container } = render(<StatCardSkeleton />);

    expect(container.querySelector('.rounded-xl.border.border-gray-800')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should have three skeleton bars for title, value, and label', () => {
    const { container } = render(<StatCardSkeleton />);
    const bars = container.querySelectorAll('.bg-gray-800.rounded');

    expect(bars.length).toBe(3);
  });
});

describe('ChartSkeleton', () => {
  it('should render chart container', () => {
    const { container } = render(<ChartSkeleton />);

    expect(container.querySelector('.rounded-xl.border.border-gray-800')).toBeInTheDocument();
  });

  it('should have title and chart area skeletons', () => {
    const { container } = render(<ChartSkeleton />);

    // Should have title skeleton and chart area skeleton
    const titleBar = container.querySelector('.h-4.w-36.bg-gray-800.rounded');
    const chartArea = container.querySelector('.h-48.w-full.bg-gray-800.rounded-lg');

    expect(titleBar).toBeInTheDocument();
    expect(chartArea).toBeInTheDocument();
  });
});

describe('AnalyticsPageSkeleton', () => {
  it('should render breadcrumb skeleton', () => {
    const { container } = render(<AnalyticsPageSkeleton />);

    // Check for breadcrumb separators (›)
    expect(container.textContent).toContain('›');
  });

  it('should render 4 stat card skeletons', () => {
    const { container } = render(<AnalyticsPageSkeleton />);

    // Grid container with 4 cards
    const grid = container.querySelector('.grid.grid-cols-2.sm\\:grid-cols-4');
    expect(grid).toBeInTheDocument();

    const cards = container.querySelectorAll('.rounded-xl.border.border-gray-800.bg-gray-900.p-5');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('should render chart skeleton', () => {
    const { container } = render(<AnalyticsPageSkeleton />);

    // Chart has height class h-48
    const chartArea = container.querySelector('.h-48.w-full.bg-gray-800.rounded-lg');
    expect(chartArea).toBeInTheDocument();
  });

  it('should render language breakdown section with 3 items', () => {
    const { container } = render(<AnalyticsPageSkeleton />);

    // Language breakdown section has space-y-3
    const languageSection = container.querySelector('.space-y-3');
    const items = languageSection?.querySelectorAll('.flex.items-center.gap-3');

    expect(items?.length).toBe(3);
  });
});

describe('SettingsPageSkeleton', () => {
  it('should render settings layout', () => {
    const { container } = render(<SettingsPageSkeleton />);

    expect(container.querySelector('.max-w-2xl.space-y-6')).toBeInTheDocument();
  });

  it('should have animated pulse', () => {
    const { container } = render(<SettingsPageSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render form field skeleton', () => {
    const { container } = render(<SettingsPageSkeleton />);

    // Form input field with height h-10
    const inputSkeleton = container.querySelector('.h-10.w-full.bg-gray-800');
    expect(inputSkeleton).toBeInTheDocument();
  });
});

describe('ListSkeleton', () => {
  it('should render default 4 rows', () => {
    const { container } = render(<ListSkeleton />);

    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(4);
  });

  it('should render custom number of rows', () => {
    const { container } = render(<ListSkeleton rows={7} />);

    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(7);
  });

  it('should render with table structure', () => {
    const { container } = render(<ListSkeleton />);

    // Header section
    expect(container.querySelector('.border-b.border-gray-800')).toBeInTheDocument();

    // Each row has avatar, text, and badge
    const firstRow = container.querySelector('.divide-y > div');
    expect(firstRow?.querySelector('.rounded-full')).toBeInTheDocument(); // Avatar
  });

  it('should have accessibility for loading state', () => {
    const { container } = render(<ListSkeleton />);

    // All skeleton elements should have appropriate visual styling
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render zero rows when rows=0', () => {
    const { container } = render(<ListSkeleton rows={0} />);

    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(0);
  });

  it('should have consistent styling across all rows', () => {
    const { container } = render(<ListSkeleton rows={3} />);

    const rows = container.querySelectorAll('.divide-y > div');
    rows.forEach(row => {
      // Each row should have padding and flex layout
      expect(row).toHaveClass('p-4', 'flex', 'items-center', 'gap-4');
    });
  });
});
