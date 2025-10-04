"use client";

import { cn } from "@/lib/utils";

export default function ChipFilter({
  label,
  selected,
  onToggle,
  className,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "px-3 py-1.5 text-xs rounded-full border transition-colors",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted border-muted-foreground/20",
        className
      )}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
