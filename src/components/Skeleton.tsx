"use client";

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-700/50 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-700/50 rounded w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700/50 rounded w-1/4 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 bg-gray-700/50 rounded w-20" />
            <div className="h-4 bg-gray-700/50 rounded w-16" />
            <div className="h-4 bg-gray-700/50 rounded w-12" />
            <div className="h-4 bg-gray-700/50 rounded flex-1" />
            <div className="h-4 bg-gray-700/50 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="h-5 bg-gray-700/50 rounded w-1/3 mb-4" />
      <div className="h-[300px] bg-gray-700/30 rounded" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} />
    </>
  );
}

export function JournalSkeleton() {
  return <SkeletonTable rows={10} />;
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} />
    </div>
  );
}
