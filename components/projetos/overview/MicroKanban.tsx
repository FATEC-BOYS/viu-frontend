"use client";

import type { TarefasKanban, TarefaCard } from "@/lib/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Col({
  title,
  items,
  total,
  onAbrir,
  onNovo,
}: {
  title: string;
  items: TarefaCard[];
  total: number;
  onAbrir: (id: string) => void;
  onNovo?: () => void;
}) {
  const restante = Math.max(total - items.length, 0);

  return (
    <Card className="h-full">
      <CardContent className="p-3 space-y-2">
        {/*
          * Altura fixa no cabeçalho: só a primeira coluna tinha o botão
          * "+ Nova", e a altura dele empurrava o título dessa coluna para
          * baixo — as três ficavam desalinhadas entre si.
          */}
        <div className="flex h-8 items-center justify-between">
          <div className="text-xs font-medium">{title}</div>
          {onNovo && (
            <Button size="sm" variant="ghost" className="h-7" onClick={onNovo}>
              + Nova
            </Button>
          )}
        </div>

        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className={cn(
                "rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted transition-colors"
              )}
              onClick={() => onAbrir(t.id)}
            >
              <div className="font-medium line-clamp-1">{t.titulo}</div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t.responsavel_nome ?? "—"}</span>
                <span>{t.prazo ? new Date(t.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
              </div>
            </li>
          ))}
          {restante > 0 && (
            <li className="text-xs text-muted-foreground px-1">+{restante} mais</li>
          )}
          {items.length === 0 && (
            <li className="text-xs text-muted-foreground px-1">Sem tarefas</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function MicroKanban({
  kanban,
  onNovo,
  onAbrir,
}: {
  kanban: TarefasKanban;
  /**
   * Opcional de propósito: enquanto não existe uma tela de criar tarefa, o
   * botão não aparece. Um botão que só avisa que não funciona continua sendo
   * uma promessa quebrada, e ocupa o lugar de uma que funcione.
   */
  onNovo?: () => void;
  onAbrir: (id: string) => void;
}) {
  /**
   * Três cartões repetindo "Sem tarefas" ocupavam metade da Visão Geral para
   * dizer uma coisa só. Projeto sem tarefa nenhuma merece uma linha, não um
   * quadro vazio em triplicado.
   */
  const vazio =
    kanban.pendente.total === 0 &&
    kanban.em_andamento.total === 0 &&
    kanban.concluida.total === 0;

  if (vazio) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-center gap-1 p-4">
          <p className="text-sm font-medium">Nenhuma tarefa neste projeto</p>
          <p className="text-xs text-muted-foreground">
            Tarefas ajudam a lembrar o que falta antes de mandar para o cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Col
        title="Pendente"
        items={kanban.pendente.top}
        total={kanban.pendente.total}
        onAbrir={onAbrir}
        onNovo={onNovo}
      />
      <Col
        title="Em andamento"
        items={kanban.em_andamento.top}
        total={kanban.em_andamento.total}
        onAbrir={onAbrir}
      />
      <Col
        title="Concluída"
        items={kanban.concluida.top}
        total={kanban.concluida.total}
        onAbrir={onAbrir}
      />
    </div>
  );
}
