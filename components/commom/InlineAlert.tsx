"use client";

import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "success" | "warn" | "error" | "info";

export default function InlineAlert({
  tone = "info",
  title,
  description,
  actions,
  className,
}: {
  tone?: Tone;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const icon =
    tone === "success" ? <CheckCircle2 className="h-4 w-4" /> :
    tone === "warn" ? <AlertTriangle className="h-4 w-4" /> :
    tone === "error" ? <XCircle className="h-4 w-4" /> :
    <Info className="h-4 w-4" />;

  const toneClasses = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-rose-50 text-rose-800 border-rose-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  }[tone];

  return (
    <div
      role="status"
      className={cn(
        "w-full rounded-lg border p-3 text-sm flex items-start gap-2",
        toneClasses,
        className
      )}
    >
      <span aria-hidden className="mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <div className="font-medium">{title}</div>}
        {description && <div className="opacity-90">{description}</div>}
      </div>
      {actions ? <div className="shrink-0 flex gap-2">{actions}</div> : null}
    </div>
  );
}
