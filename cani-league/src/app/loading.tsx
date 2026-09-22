export default function Loading() {
  return (
    <div className="animate-fade-in space-y-8 pb-12">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-white/[0.06] pb-6">
        <div className="h-4 w-32 rounded-md bg-white/[0.06] animate-pulse" />
        <div className="h-8 w-64 rounded-lg bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-96 max-w-full rounded-md bg-white/[0.04] animate-pulse" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40 p-4 backdrop-blur-md shadow-xs animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-white/[0.08]" />
              <div className="h-3 w-16 rounded bg-white/[0.06]" />
            </div>
            <div className="mt-3 h-7 w-24 rounded bg-white/[0.1]" />
          </div>
        ))}
      </div>

      {/* Content Skeleton (Tabs / Table / Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
          </div>
          <div className="h-9 w-48 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-card/30 p-6 backdrop-blur-md shadow-xs">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-white/[0.08] animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-white/[0.08] animate-pulse" />
                    <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-5 w-16 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-5 w-12 rounded bg-white/[0.06] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
