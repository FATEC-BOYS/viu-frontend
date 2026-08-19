"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Estado vazio padrão.
 *
 * Existia um EmptyState em components/commom/ que nenhuma tela importava — cada
 * uma escrevia o seu, e havia telas com dois tratamentos diferentes ao mesmo
 * tempo (uma caixa tracejada e um texto solto). Este substitui aquele.
 *
 * O ícone é o mesmo da entidade em questão, para o vazio não parecer erro.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="max-w-sm space-y-3">
        {Icon && (
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-1">
          <h3 className="font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actionLabel && onAction && (
          <Button onClick={onAction} size="sm" className="mt-1">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
