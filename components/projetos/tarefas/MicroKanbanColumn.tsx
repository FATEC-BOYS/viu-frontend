"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TarefaCard } from "@/lib/projects"; // id, titulo, responsavel_nome?, prazo?

export default function MicroKanbanColumn({
  title,
  items,
  total,
  onDrop,
  onOpen,
}: {
  title: string;
  items: TarefaCard[];
  total: number;
  onDrop: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // necessário pra permitir drop
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsOver(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const id = e.dataTransfer.getData("text/artefact-id") || e.dataTransfer.getData("text/plain");
      if (id) onDrop(id);
    },
    [onDrop]
  );

  const restante = Math.max(total - items.length, 0);

  return (
    <Card
      className={cn(
        "h-full transition-all",
        isOver && "ring-2 ring-primary/40 ring-offset-1"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label={`Coluna ${title}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium">{title}</div>
          <div className="text-[10px] text-muted-foreground">{total}</div>
        </div>

        <ul className="space-y-2 min-h-[8px]">
          {items.map((t) => (
            <li
              key={t.id}
              draggable
              onDragStart={(e) => {
                // id em dois mimetypes (alguns navegadores ignoram custom)
                e.dataTransfer.setData("text/artefact-id", t.id);
                e.dataTransfer.setData("text/plain", t.id);
              }}
              onClick={() => onOpen(t.id)}
              className={cn(
                "rounded-lg border p-2 text-sm cursor-grab active:cursor-grabbing",
                "hover:bg-muted transition-colors"
              )}
              role="button"
              aria-label={`Abrir tarefa ${t.titulo}`}
            >
              <div className="font-medium line-clamp-1">{t.titulo}</div>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{t.responsavel_nome ?? "—"}</span>
                <span>{t.prazo ? new Date(t.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
              </div>
            </li>
          ))}

          {items.length === 0 && (
            <li className="text-xs text-muted-foreground px-1">Sem tarefas</li>
          )}
          {restante > 0 && (
            <li className="text-xs text-muted-foreground px-1">+{restante} mais</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
