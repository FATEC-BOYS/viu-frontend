"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Calendar as CalendarIcon,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
} from "lucide-react";
import {
  daysDiffFromToday,
  formatDateBR,
  prioridadeLabel,
  statusLabel,
} from "@/lib/tarefas";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  prazo: string | null;
  criado_em: string;
  atualizado_em: string;
  projeto: { nome: string; cliente: { nome: string } } | null;
  responsavel: { id: string; nome: string };
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { Icon: React.ComponentType<any>; variant: "default" | "secondary" | "outline" }
  > = {
    PENDENTE: { Icon: Circle, variant: "secondary" },
    EM_ANDAMENTO: { Icon: Clock, variant: "default" },
    CONCLUIDA: { Icon: CheckCircle2, variant: "default" },
    CANCELADA: { Icon: AlertTriangle, variant: "outline" },
  };
  const cfg = map[status] ?? { Icon: Circle, variant: "outline" as const };
  const { Icon } = cfg;
  return (
    <Badge variant={cfg.variant} className="gap-1">
      <Icon className="size-3" />
      {statusLabel[status] ?? status}
    </Badge>
  );
}

function PrioridadePill({ prioridade }: { prioridade: string }) {
  const className =
    prioridade === "ALTA"
      ? "bg-orange-100 text-orange-900 border-orange-200"
      : prioridade === "MEDIA"
      ? "bg-neutral-200 text-neutral-800 border-neutral-300"
      : "bg-emerald-100 text-emerald-800 border-emerald-200";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${className}`}
    >
      {prioridadeLabel[prioridade] ?? prioridade}
    </span>
  );
}

export function TaskCard({
  tarefa,
  onOpen,
}: {
  tarefa: Tarefa;
  onOpen: (t: Tarefa) => void;
}) {
  const d = daysDiffFromToday(tarefa.prazo);
  const overdue = d !== null && d < 0;
  const urgent = d !== null && d >= 0 && d <= 3 && tarefa.status !== "CONCLUIDA";

  const leftBorder =
    tarefa.status === "CONCLUIDA"
      ? "border-l-emerald-500"
      : overdue
      ? "border-l-red-500"
      : urgent
      ? "border-l-orange-500"
      : "border-l-neutral-300";

  return (
    <Card
      onClick={() => onOpen(tarefa)}
      className={`group hover:shadow-md transition-shadow cursor-pointer border-l-4 ${leftBorder}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Lado esquerdo (texto) */}
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle
              title={tarefa.titulo}
              className="text-base leading-snug line-clamp-2 break-words hyphens-auto"
            >
              {tarefa.titulo}
            </CardTitle>

            {tarefa.projeto && (
              <div className="space-y-1 min-w-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderOpen className="size-3 shrink-0" />
                  <span className="truncate">{tarefa.projeto.nome}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Cliente: {tarefa.projeto.cliente.nome}
                </p>
              </div>
            )}
          </div>

          {/* Lado direito (badges) */}
          <div className="flex flex-col items-end gap-2 shrink-0 max-w-[40%]">
            <StatusBadge status={tarefa.status} />
            <PrioridadePill prioridade={tarefa.prioridade} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-3 break-words hyphens-auto">
            {tarefa.descricao}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="size-3 shrink-0" />
              Responsa
            </div>
            <p className="font-medium truncate">{tarefa.responsavel.nome}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="size-3 shrink-0" />
              Prazo
            </div>
            <p
              className={`font-medium ${
                overdue ? "text-red-600" : urgent ? "text-orange-600" : ""
              }`}
            >
              {formatDateBR(tarefa.prazo)}
              {overdue && ` (${Math.abs(d!)} dia(s) atrasada)`}
              {urgent && !overdue && ` (${d} dia(s))`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
