"use client";

import { cn } from "@/lib/utils";

export default function ProgressoBar({
  aprovadas,
  total,
  caption,
  onClick,
  className,
}: {
  aprovadas: number;
  total: number;
  caption?: string;
  onClick?: () => void;     // <- breakdown ao clicar
  className?: string;
}) {
  const pct = total > 0 ? Math.round((aprovadas / total) * 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "h-2 w-full rounded-full bg-muted overflow-hidden",
          onClick && "cursor-pointer"
        )}
        role={onClick ? "button" : undefined}
        onClick={onClick}
        aria-label={onClick ? "Ver breakdown de progresso" : undefined}
      >
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{aprovadas}/{total} aprovadas</span>
        <span>{pct}% {caption ? `• ${caption}` : ""}</span>
      </div>
    </div>
  );
}
