"use client";

export default function ArtesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="h-28 bg-muted animate-pulse" />
            <div className="p-3">
              <div className="h-3 w-2/3 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
