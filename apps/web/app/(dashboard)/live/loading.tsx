/**
 * Loading skeleton for the live interpretation page.
 * Displays placeholder content while the page is being fetched or rendered.
 */
export default function LiveLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Project header skeleton */}
      <div className="flex items-center gap-3 animate-pulse">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-800" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-32 bg-gray-800 rounded" />
          <div className="h-3 w-24 bg-gray-800 rounded" />
        </div>
      </div>

      {/* Main control card skeleton */}
      <div className="rounded-3xl border border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-gray-900/30 p-8 animate-pulse">
        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-gray-800" />
          <div className="h-3 w-16 bg-gray-800 rounded" />
        </div>

        {/* Big circular button placeholder */}
        <div className="flex flex-col items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-800" />
          <div className="h-3 w-24 bg-gray-800 rounded" />
        </div>

        {/* Keyboard hint */}
        <div className="h-3 w-48 bg-gray-800 rounded mx-auto" />
      </div>

      {/* Transcription panels skeleton */}
      <div className="space-y-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-gray-800 rounded" />
          <div className="min-h-[100px] rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5">
            <div className="h-3 w-full bg-gray-800 rounded mb-2" />
            <div className="h-3 w-3/4 bg-gray-800 rounded" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-16 bg-gray-800 rounded" />
          <div className="min-h-[100px] rounded-2xl bg-gray-900/50 border border-gray-800/50 p-5">
            <div className="h-3 w-full bg-gray-800 rounded mb-2" />
            <div className="h-3 w-2/3 bg-gray-800 rounded" />
          </div>
        </div>
      </div>

      {/* Audience share section skeleton */}
      <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 overflow-hidden animate-pulse">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-gray-800" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-800 rounded" />
              <div className="h-2 w-32 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="w-5 h-5 rounded bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
