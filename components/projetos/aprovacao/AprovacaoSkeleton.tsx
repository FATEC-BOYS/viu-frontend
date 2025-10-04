"use client";

export default function AprovacaoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-56 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-[96px_1fr]">
              <div className="h-24 bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                <div className="h-6 w-24 bg-muted rounded animate-pulse mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
