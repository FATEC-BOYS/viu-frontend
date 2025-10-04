"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NarrativaContagens = {
  artesAtivas: number;
  artesAprovadas: number;
  artesPendentes: number;
  tarefasUrgentes: number;
  aprovacoesVencendoHoje: number;
};

export type NarrativaSegmento =
  | "ARTES_ATIVAS"
  | "ARTES_APROVADAS"
  | "ARTES_PENDENTES"
  | "TAREFAS_URGENTES"
  | "APROVACOES_HOJE";

export default function ProjetoNarrativaBar({
  contagens,
  onClick,
  className,
}: {
  contagens: NarrativaContagens;
  onClick: (segmento: NarrativaSegmento) => void;
  className?: string;
}) {
  const c = contagens;

  return (
    <div className={cn("text-sm rounded-xl border p-3 bg-background/60", className)}>
      <span className="text-muted-foreground">Estado do projeto: </span>
      <Button variant="link" className="px-1 h-auto" onClick={() => onClick("ARTES_ATIVAS")}>
        {c.artesAtivas} artes ativas
      </Button>
      ,
      <Button variant="link" className="px-1 h-auto" onClick={() => onClick("ARTES_APROVADAS")}>
        {c.artesAprovadas} aprovadas
      </Button>
      ,
      <Button variant="link" className="px-1 h-auto" onClick={() => onClick("ARTES_PENDENTES")}>
        {c.artesPendentes} pendentes
      </Button>
      ;
      <Button variant="link" className="px-1 h-auto" onClick={() => onClick("TAREFAS_URGENTES")}>
        {c.tarefasUrgentes} tarefas urgentes
      </Button>
      ;
      <Button variant="link" className="px-1 h-auto" onClick={() => onClick("APROVACOES_HOJE")}>
        {c.aprovacoesVencendoHoje} aprovações vencendo hoje
      </Button>
      .
    </div>
  );
}
