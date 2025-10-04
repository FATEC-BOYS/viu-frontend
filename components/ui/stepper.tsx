"use client";
import { cn } from "@/lib/utils";

export function Stepper({
  steps, current,
}: { steps: { key: string; label: string }[]; current: number }) {
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs border",
                done && "bg-primary text-primary-foreground border-primary",
                active && "bg-primary/10 border-primary text-primary",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-sm", active ? "font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="mx-2 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
