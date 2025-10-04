"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { formatDateBR, prioridadeLabel, statusLabel } from "@/lib/tarefas";
import type { Tarefa } from "./TaskCard";

export function TaskSheet({
  open,
  onOpenChange,
  tarefa,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tarefa: Tarefa | null;
}) {
  // ids para a11y (aria-labelledby / aria-describedby)
  const titleId = React.useId();
  const descId = React.useId();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // scroll suave, padding consistente e header “grudado”
        className="w-full sm:max-w-xl p-0 overflow-y-auto"
        // se seu Sheet manual aceitar, dá pra amarrar aria aqui:
        // aria-labelledby={titleId}
        // aria-describedby={descId}
      >
        {tarefa ? (
          <>
            {/* Header fixo no topo do sheet */}
            <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SheetHeader className="px-6 py-4">
                <SheetTitle
                  id={titleId}
                  title={tarefa.titulo}
                  className="pr-8 text-base leading-snug line-clamp-2 break-words hyphens-auto"
                >
                  {tarefa.titulo}
                </SheetTitle>

                <SheetDescription id={descId}>
                  {tarefa.projeto ? (
                    <span className="mt-1 flex items-center gap-2 text-sm">
                      <FolderOpen className="size-4 shrink-0" />
                      <span className="truncate">
                        {tarefa.projeto.nome}
                        {tarefa.projeto?.cliente?.nome
                          ? ` — Cliente: ${tarefa.projeto.cliente.nome}`
                          : ""}
                      </span>
                    </span>
                  ) : (
                    "Sem projeto — tudo bem, a gente se encontra 😉"
                  )}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-5 space-y-6">
              {/* status + prioridade */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {statusLabel[tarefa.status] ?? tarefa.status}
                </Badge>
                <Badge>{prioridadeLabel[tarefa.prioridade] ?? tarefa.prioridade}</Badge>
              </div>

              {/* descrição */}
              {tarefa.descricao && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Brief</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words hyphens-auto">
                    {tarefa.descricao}
                  </p>
                </div>
              )}

              {/* infos rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="min-w-0">
                  <div className="text-muted-foreground">Responsa</div>
                  <div className="font-medium truncate">
                    {tarefa.responsavel?.nome || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Prazo</div>
                  <div className="font-medium">
                    {formatDateBR(tarefa.prazo)}
                  </div>
                </div>
              </div>

              {/* rodapé meta */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                Criada em {formatDateBR(tarefa.criado_em)} • Atualizada em{" "}
                {formatDateBR(tarefa.atualizado_em)}
              </div>
            </div>
          </>
        ) : (
          // estado vazio (ex.: abriu o sheet sem tarefa)
          <div className="px-6 py-10 text-sm text-muted-foreground">
            Nenhuma tarefa selecionada.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
