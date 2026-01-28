/**
 * Reusable loading skeleton primitives.
 *
 * These components render animated placeholder blocks that match the
 * dimensions of the content they stand in for. Use them in Suspense
 * boundaries or conditional loading states throughout the dashboard.
 */

/** A single animated skeleton bar. */
export function SkeletonBar({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`bg-gray-800 rounded animate-pulse ${className}`}
    />
  );
}

/** Card-shaped skeleton for dashboard stat cards. */
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-800 rounded mb-3" />
      <div className="h-7 w-32 bg-gray-800 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-800 rounded" />
    </div>
  );
}

/** Full-width chart placeholder skeleton. */
export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
      <div className="h-4 w-36 bg-gray-800 rounded mb-4" />
      <div className="h-48 w-full bg-gray-800 rounded-lg" />
    </div>
  );
}

/** Analytics dashboard full-page skeleton. */
export function AnalyticsPageSkeleton() {
  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
        <span className="text-gray-700">›</span>
        <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
        <span className="text-gray-700">›</span>
        <div className="h-3 w-12 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Chart */}
      <ChartSkeleton />

      {/* Language breakdown */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-28 bg-gray-800 rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-20 bg-gray-800 rounded" />
              <div className="flex-1 h-4 bg-gray-800 rounded" />
              <div className="h-4 w-10 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings page skeleton. */
export function SettingsPageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-6 w-24 bg-gray-800 rounded" />
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <div className="h-4 w-32 bg-gray-800 rounded" />
        <div className="h-10 w-full bg-gray-800 rounded-lg" />
        <div className="h-4 w-48 bg-gray-800 rounded" />
      </div>
    </div>
  );
}

/** Generic table/list skeleton with configurable row count. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 animate-pulse">
      <div className="p-4 border-b border-gray-800">
        <div className="h-4 w-32 bg-gray-800 rounded" />
      </div>
      <div className="divide-y divide-gray-800">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-800 rounded-full" />
            <div className="flex-1">
              <div className="h-3 w-40 bg-gray-800 rounded mb-1.5" />
              <div className="h-3 w-24 bg-gray-800 rounded" />
            </div>
            <div className="h-3 w-16 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
