"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import PeopleStack from "./PeopleStack";
import type { Projeto } from "@/lib/projects";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Status = Projeto["status"]; // "EM_ANDAMENTO" | "PAUSADO" | "CONCLUIDO"

const TITLES: Record<Status, string> = {
  EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
};

const COLS: Status[] = ["EM_ANDAMENTO", "PAUSADO", "CONCLUIDO"];

export default function BoardView({
  projects,
  onMove, // (projectId, fromStatus, toStatus)
  onOpen, // opcional: abrir painel/modal ao clicar
}: {
  projects: Projeto[];
  onMove?: (id: string, from: Status, to: Status) => void;
  onOpen?: (p: Projeto) => void;
}) {
  // grupos por status
  const groups = React.useMemo(() => {
    const g: Record<Status, Projeto[]> = {
      EM_ANDAMENTO: [],
      PAUSADO: [],
      CONCLUIDO: [],
    };
    for (const p of projects) g[p.status as Status]?.push(p);
    return g;
  }, [projects]);

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      {/* faixa horizontal, sem esmagar colunas */}
      <div className="flex gap-4 min-w-full">
        {COLS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            title={TITLES[status]}
            count={groups[status]?.length ?? 0}
            onDropCard={(dragId, from) => {
              if (onMove && from !== status) onMove(dragId, from, status);
            }}
          >
            {(groups[status] ?? []).map((p) => (
              <DraggableCard key={p.id} p={p} onClick={() => onOpen?.(p)} />
            ))}
          </DroppableColumn>
        ))}
      </div>
    </div>
  );
}

/* ========================= Column (droppable) ========================= */

function DroppableColumn({
  status,
  title,
  count,
  onDropCard,
  children,
}: {
  status: Status;
  title: string;
  count: number;
  onDropCard: (dragId: string, from: Status) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = React.useState(false);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // permite drop
    setOver(true);
  };
  const onDragLeave = () => setOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    const dragId = e.dataTransfer.getData("text/plain");
    const from = (e.dataTransfer.getData("x-from-status") || "") as Status;
    if (!dragId || !from) return;
    onDropCard(dragId, from);
  };

  return (
    <div
      className={cn(
        "flex-none w-[320px] sm:w-[360px] lg:w-[400px] xl:w-[420px]",
        "rounded-xl border bg-background"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-status={status}
    >
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant={status === "CONCLUIDO" ? "default" : "secondary"}>{count}</Badge>
      </div>

      <div className={cn("p-3 space-y-3 transition-colors", over ? "bg-muted/50" : "bg-transparent")}>
        {children}
      </div>
    </div>
  );
}

/* ========================= Card (draggable) ========================= */

function DraggableCard({
  p,
  onClick,
}: {
  p: Projeto;
  onClick?: () => void;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", p.id);
    e.dataTransfer.setData("x-from-status", p.status); // coluna de origem
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      id={p.id}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="rounded-lg border p-3 bg-background hover:shadow-sm cursor-grab active:cursor-grabbing"
      title={p.nome}
      role="button"
    >
      <div className="text-sm font-medium line-clamp-1">{p.nome}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <PeopleStack
          designer={p.designer ? { nome: p.designer.nome } : undefined}
          cliente={p.cliente ? { nome: p.cliente.nome } : undefined}
        />
        <span className="ml-2">
          {p.prazo ? format(parseISO(p.prazo), "P", { locale: ptBR }) : "—"}
        </span>
      </div>
    </div>
  );
}
