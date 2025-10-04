"use client";

import { Button } from "@/components/ui/button";
import { Upload, Send, Flag, type LucideIcon } from "lucide-react";

export type EstadoCTA = "CRIAR_ARTE" | "PEDIR_APROVACAO" | "CONCLUIR";

const MAP: Record<EstadoCTA, { label: string; Icon: LucideIcon }> = {
  CRIAR_ARTE: { label: "Subir nova arte", Icon: Upload },
  PEDIR_APROVACAO: { label: "Pedir aprovação", Icon: Send },
  CONCLUIR: { label: "Concluir projeto", Icon: Flag },
};

export default function CTAContextual({
  estado,
  onClick,
  className,
}: {
  estado: EstadoCTA;
  onClick: () => void;
  className?: string;
}) {
  const { label, Icon } = MAP[estado];

  return (
    <div className={className}>
      <Button onClick={onClick} className="gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </div>
  );
}
