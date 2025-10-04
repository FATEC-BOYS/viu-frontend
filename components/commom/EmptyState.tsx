"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EmptyState({
  title,
  desc,
  ctaLabel,
  onCta,
  illustrationUrl,
  className,
}: {
  title: string;
  desc?: string;
  ctaLabel?: string;
  onCta?: () => void;
  illustrationUrl?: string; // opcional (ou use um SVG local)
  className?: string;
}) {
  return (
    <div className={cn("border rounded-xl p-8 text-center grid place-items-center bg-background/60", className)}>
      <div className="max-w-md space-y-3">
        {illustrationUrl ? (
          <div className="mx-auto opacity-80">
            <Image src={illustrationUrl} alt="" width={180} height={120} className="mx-auto" />
          </div>
        ) : (
          <div className="mx-auto h-16 w-16 rounded-full bg-muted" />
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
        {ctaLabel && onCta && (
          <div className="pt-2">
            <Button onClick={onCta}>{ctaLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
