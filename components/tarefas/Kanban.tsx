"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { TaskCard, Tarefa } from "./TaskCard";
import { cn } from "@/lib/utils";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

type Columns = Record<string, Tarefa[]>;

export function KanbanBoard({
  groups,
  onOpen,
  onMove, // (taskId, from, to, toIndex) -> persistência externa
  className,
}: {
  groups: Record<string, Tarefa[]>;
  onOpen: (t: Tarefa) => void;
  onMove?: (taskId: string, from: string, to: string, toIndex: number) => void;
  className?: string;
}) {
  const titles: Record<string, string> = {
    PENDENTE: "Pendentes",
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDA: "Concluídas",
    CANCELADA: "Canceladas",
  };
  const cols = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] as const;

  // estado local para ordem dentro das colunas (independe do sort global)
  const [columns, setColumns] = React.useState<Columns>(() => clone(groups));
  React.useEffect(() => setColumns(clone(groups)), [groups]);

  function clone(src: Record<string, Tarefa[]>): Columns {
    const out: Columns = {};
    for (const k of Object.keys(src)) out[k] = [...(src[k] ?? [])];
    return out;
  }

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const from = source.droppableId;
    const to = destination.droppableId;

    // snapshots (não mutar state diretamente)
    const fromArr = columns[from] ? [...columns[from]] : [];
    const toArr = to === from ? fromArr : columns[to] ? [...columns[to]] : [];

    // remove do origem
    const [moved] = fromArr.splice(source.index, 1);
    if (!moved) return;

    // insere no destino
    toArr.splice(destination.index, 0, moved);

    // aplica no estado
    setColumns((prev) => ({
      ...prev,
      [from]: fromArr,
      [to]: toArr,
    }));

    // chama o callback fora do setState (evita warning de update durante render)
    if (onMove && (from !== to || source.index !== destination.index)) {
      queueMicrotask(() => onMove(draggableId, from, to, destination.index));
    }
  }

  return (
    <div className={cn("overflow-x-auto -mx-2 px-2 pb-2", className)}>
      <DragDropContext onDragEnd={onDragEnd}>
        {/* faixa horizontal de colunas */}
        <div className="flex gap-4 min-w-full">
          {cols.map((col) => (
            <div
              key={col}
              className={cn(
                "flex-none w-[320px] sm:w-[360px] lg:w-[400px] xl:w-[420px]",
                "rounded-lg border bg-card shadow-sm"
              )}
            >
              {/* header simples */}
              <div className="p-3 border-b flex items-center justify-between">
                <div className="font-medium text-sm">{titles[col]}</div>
                <Badge variant={col === "CONCLUIDA" ? "default" : "secondary"}>
                  {columns[col]?.length ?? 0}
                </Badge>
              </div>

              {/* área droppable da coluna */}
              <Droppable droppableId={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-3 space-y-3 transition-colors",
                      snapshot.isDraggingOver ? "bg-muted/40" : "bg-transparent"
                    )}
                  >
                    {(columns[col] ?? []).map((t, idx) => (
                      <Draggable key={t.id} draggableId={t.id} index={idx}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={cn(
                              "w-full",
                              dragSnapshot.isDragging ? "rotate-[0.2deg]" : ""
                            )}
                          >
                            <TaskCard tarefa={t} onOpen={onOpen} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
