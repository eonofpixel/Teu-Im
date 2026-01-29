/**
 * Loading skeleton for the settings page.
 * Displays placeholder content while the page is being fetched or rendered.
 */
export default function SettingsLoading() {
  return (
    <div className="max-w-xl space-y-6">
      {/* Page header skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="h-6 w-24 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-800 rounded" />
      </div>

      {/* Profile section skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-24 bg-gray-800 rounded mb-1" />
        <div className="h-3 w-40 bg-gray-800 rounded mb-4" />

        <div className="space-y-4">
          {/* Profile image */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gray-800" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-2 w-24 bg-gray-800 rounded" />
            </div>
          </div>

          {/* Name field */}
          <div>
            <div className="h-3 w-12 bg-gray-800 rounded mb-1.5" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>

          {/* Email field */}
          <div>
            <div className="h-3 w-16 bg-gray-800 rounded mb-1.5" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>

          {/* Save button */}
          <div className="h-9 w-16 bg-gray-800 rounded-lg" />
        </div>
      </div>

      {/* API section skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-20 bg-gray-800 rounded mb-1" />
        <div className="h-3 w-56 bg-gray-800 rounded mb-4" />

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-3 w-48 bg-gray-800 rounded" />
            </div>
            <div className="w-5 h-5 rounded bg-gray-800" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-20 bg-gray-800 rounded-lg" />
            <div className="h-9 w-20 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Language section skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-28 bg-gray-800 rounded mb-1" />
        <div className="h-3 w-52 bg-gray-800 rounded mb-4" />

        <div className="space-y-4">
          <div>
            <div className="h-3 w-24 bg-gray-800 rounded mb-1.5" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>
          <div>
            <div className="h-3 w-24 bg-gray-800 rounded mb-1.5" />
            <div className="h-10 w-full bg-gray-800 rounded-lg" />
          </div>
          <div className="h-9 w-16 bg-gray-800 rounded-lg" />
        </div>
      </div>

      {/* Notification section skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-20 bg-gray-800 rounded mb-1" />
        <div className="h-3 w-40 bg-gray-800 rounded mb-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-2 w-48 bg-gray-800 rounded" />
            </div>
            <div className="h-5 w-9 bg-gray-800 rounded-full" />
          </div>
          <div className="border-t border-gray-800" />
          <div className="flex items-center justify-between py-2">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-2 w-40 bg-gray-800 rounded" />
            </div>
            <div className="h-5 w-9 bg-gray-800 rounded-full" />
          </div>
          <div className="h-9 w-16 bg-gray-800 rounded-lg" />
        </div>
      </div>

      {/* Account section skeleton */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
        <div className="h-4 w-20 bg-gray-800 rounded mb-1" />
        <div className="h-3 w-36 bg-gray-800 rounded mb-4" />

        <div className="flex gap-3 flex-wrap">
          <div className="h-9 w-28 bg-gray-800 rounded-lg" />
          <div className="h-9 w-20 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
