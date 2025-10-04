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
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">{title}</div>
          {onNovo && (
            <Button size="sm" variant="ghost" onClick={onNovo}>
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
  onNovo: () => void;
  onAbrir: (id: string) => void;
}) {
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
