import { ListSkeleton } from "@/components/loading-skeleton";

/**
 * Next.js App Router loading UI for the dashboard route group.
 * Displayed while any page within (dashboard)/ is being fetched or rendered.
 */
export default function DashboardLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Header placeholder */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 animate-pulse">
          <div className="h-6 w-24 bg-gray-800 rounded" />
          <div className="h-4 w-40 bg-gray-800 rounded" />
        </div>
        <div className="h-9 w-32 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Content placeholder */}
      <ListSkeleton rows={3} />
    </div>
  );
}
