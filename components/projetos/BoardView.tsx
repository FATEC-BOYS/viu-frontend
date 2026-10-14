"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import PeopleStack from "./PeopleStack";
import type { Projeto } from "@/lib/projects";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motivoDaRecusa } from "@/lib/transicoesDoProjeto";

type Status = Projeto["status"];

/**
 * Como o quadro chama cada status.
 *
 * Exportado porque a recusa de um arrasto precisa falar com estas palavras: a
 * mensagem dizia "Fechado" (o rótulo de `lib/rotulos`) sobre uma coluna
 * escrita "Concluído", e a tela se contradizia sozinha.
 */
export const TITLES: Record<Status, string> = {
  RASCUNHO: "Aguardando aceite",
  EM_ANDAMENTO: "Em andamento",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

/** O rótulo da coluna, para quem precisa citá-la fora daqui. */
export const rotuloDaColuna = (s: Status) => TITLES[s] ?? s;

// Projeto cancelado não vira coluna — ele sai do fluxo de trabalho, e uma
// coluna vazia permanente só ocupa espaço no quadro.
const COLS: Status[] = ["RASCUNHO", "EM_ANDAMENTO", "PAUSADO", "CONCLUIDO"];

export default function BoardView({
  projects,
  onMove, // (projectId, fromStatus, toStatus)
  onOpen, // opcional: abrir painel/modal ao clicar
}: {
  projects: Projeto[];
  onMove?: (id: string, from: Status, to: Status) => void;
  onOpen?: (p: Projeto) => void;
}) {
  /*
   * Qual cartão está sendo arrastado — e, por consequência, quais colunas
   * podem recebê-lo.
   *
   * Sem isto, toda coluna aceitava todo cartão e o produto só dizia "não"
   * depois: "Aguardando aceite" nem virava requisição (o validador do front
   * conhecia 3 dos 5 status) e sair de "Concluído" levava 500 do servidor —
   * nos dois casos a pessoa lia "Não consegui mover, desfazendo…" e o cartão
   * voltava sozinho, sem nunca saber por quê.
   *
   * `dataTransfer` não serve para isso: durante o `dragover` o navegador
   * esconde os dados por segurança, e é justamente no `dragover` que se decide
   * aceitar ou não o drop. Então o quadro guarda a origem no `dragstart`.
   */
  const [arrastando, setArrastando] = React.useState<{ id: string; de: Status } | null>(null);

  // grupos por status
  const groups = React.useMemo(() => {
    const g: Record<Status, Projeto[]> = {
      RASCUNHO: [],
      EM_ANDAMENTO: [],
      PAUSADO: [],
      CONCLUIDO: [],
      CANCELADO: [],
    };
    for (const p of projects) g[p.status as Status]?.push(p);
    return g;
  }, [projects]);

  return (
    <div className="overflow-x-auto -mx-2 px-2 pb-2">
      {/* faixa horizontal, sem esmagar colunas */}
      <div className="flex gap-4 min-w-full">
        {COLS.map((status) => {
          const recusa = arrastando ? motivoDaRecusa(arrastando.de, status, rotuloDaColuna) : null;
          return (
            <DroppableColumn
              key={status}
              status={status}
              title={TITLES[status]}
              count={groups[status]?.length ?? 0}
              recusa={recusa}
              onDropCard={(dragId, from) => {
                if (onMove && from !== status) onMove(dragId, from, status);
              }}
            >
              {(groups[status] ?? []).map((p) => (
                <DraggableCard
                  key={p.id}
                  p={p}
                  onClick={() => onOpen?.(p)}
                  onInicio={() => setArrastando({ id: p.id, de: p.status as Status })}
                  onFim={() => setArrastando(null)}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>
    </div>
  );
}

/* ========================= Column (droppable) ========================= */

function DroppableColumn({
  status,
  title,
  count,
  recusa,
  onDropCard,
  children,
}: {
  status: Status;
  title: string;
  count: number;
  /**
   * Por que esta coluna não pode receber o cartão que está na mão — ou `null`
   * quando pode, e `null` também quando não há nada sendo arrastado.
   */
  recusa: string | null;
  onDropCard: (dragId: string, from: Status) => void;
  children: React.ReactNode;
}) {
  const [over, setOver] = React.useState(false);

  const onDragOver = (e: React.DragEvent) => {
    /*
     * `preventDefault` é o que AUTORIZA o drop. Não chamá-lo faz o navegador
     * mostrar o cursor de "não dá" e o `drop` nunca acontecer — a recusa vira
     * a própria mão da pessoa, antes de qualquer requisição.
     */
    if (!recusa) e.preventDefault();
    setOver(true);
  };
  const onDragLeave = () => setOver(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    // Sem `preventDefault` no `dragover` o drop não chega aqui. A guarda fica
    // porque um navegador que mude isso não deve virar uma gravação inválida.
    if (recusa) return;
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

      <div
        className={cn(
          "p-3 space-y-3 transition-colors",
          over && !recusa && "bg-muted/50",
          over && recusa && "bg-muted/20",
        )}
      >
        {/*
          O cursor diz "não dá"; esta linha diz por que. As duas aparecem no
          mesmo instante em que a pessoa tenta, que é quando a pergunta existe.
        */}
        {over && recusa && (
          <p className="text-xs text-muted-foreground border border-dashed rounded-md p-2">{recusa}</p>
        )}
        {children}
      </div>
    </div>
  );
}

/* ========================= Card (draggable) ========================= */

function DraggableCard({
  p,
  onClick,
  onInicio,
  onFim,
}: {
  p: Projeto;
  onClick?: () => void;
  onInicio?: () => void;
  onFim?: () => void;
}) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", p.id);
    e.dataTransfer.setData("x-from-status", p.status); // coluna de origem
    e.dataTransfer.effectAllowed = "move";
    onInicio?.();
  };

  return (
    <div
      id={p.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => onFim?.()}
      onClick={onClick}
      className="rounded-lg border p-3 bg-background cursor-grab active:cursor-grabbing card-interativo"
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
