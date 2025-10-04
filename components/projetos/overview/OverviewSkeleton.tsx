"use client";

import SkeletonList from "@/components/commom/SkeletonList";

export default function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Resumo cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-4">
            <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Proximos passos + Kanban compacto */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-xl p-4">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <SkeletonList rows={5} lines={1} />
        </div>
        <div className="border rounded-xl p-4">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-3">
                <SkeletonList rows={3} lines={1} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
