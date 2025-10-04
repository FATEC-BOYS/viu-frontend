"use client";

import { cn } from "@/lib/utils";

export default function SkeletonList({
  rows = 6,
  avatar = false,
  lines = 2,
  className,
}: {
  rows?: number;
  avatar?: boolean;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          {avatar && <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />}
          <div className="flex-1 grid gap-2">
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
            {Array.from({ length: lines }).map((_, j) => (
              <div key={j} className="h-3 w-full bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
