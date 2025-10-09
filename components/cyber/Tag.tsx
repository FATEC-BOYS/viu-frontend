// components/cyber/Tag.tsx
import { cn } from "@/lib/utils";
export function Tag({ children, tone="neutral", className }:{
  children: React.ReactNode; tone?: "neutral"|"accent"|"warn"|"danger"; className?: string
}) {
  const map = {
    neutral: "border border-[hsl(var(--cy-border))] text-[hsl(var(--cy-muted))] bg-[hsl(var(--cy-surface-2))]",
    accent:  "border border-transparent text-black bg-[hsl(var(--cy-accent))]",
    warn:    "border border-amber-500/30 text-amber-200 bg-amber-500/10",
    danger:  "border border-red-500/30 text-red-200 bg-red-500/10",
  };
  return (
    <span className={cn("viu-caps inline-flex items-center gap-1 px-2 py-1 rounded-md", map[tone], className)}>
      {children}
    </span>
  );
}
