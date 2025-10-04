"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ImageIcon,
  Layers,
  MessageSquare,
  ListChecks,
  CheckCircle2,
  MailPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Tipos do feed */
export type AtividadeTipo =
  | "ARTE_CRIADA"
  | "ARTE_VERSAO"
  | "FEEDBACK"
  | "TAREFA_CRIADA"
  | "APROVACAO"
  | "CONVITE";

/** Referência para “ver no contexto” */
export type AtividadeRef =
  | { kind: "arte"; id: string }
  | { kind: "tarefa"; id: string }
  | { kind: "aprovacao"; id: string }
  | { kind: "convite"; id: string }
  | { kind: "projeto"; id: string };

/** Shape de um item do feed */
export type AtividadeItem = {
  id: string;
  tipo: AtividadeTipo;
  criado_em: string; // ISO
  autor: { id: string; nome: string; avatar?: string | null };
  ref: AtividadeRef;
  /** metadados específicos por tipo */
  meta?: {
    arteNome?: string;
    versao?: number;
    tarefaTitulo?: string;
    feedbackSnippet?: string;
    aprovacaoStatus?: "ENVIADA" | "APROVADA" | "REJEITADA" | "PENDENTE";
    conviteEmail?: string;
  };
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function AtividadeItemRow({
  item,
  onOpen,
  className,
}: {
  item: AtividadeItem;
  onOpen: (ref: AtividadeRef) => void;
  className?: string;
}) {
  const { autor, tipo, meta = {}, criado_em } = item;

  const Icon =
    tipo === "ARTE_CRIADA" ? ImageIcon :
    tipo === "ARTE_VERSAO" ? Layers :
    tipo === "FEEDBACK" ? MessageSquare :
    tipo === "TAREFA_CRIADA" ? ListChecks :
    tipo === "APROVACAO" ? CheckCircle2 :
    MailPlus;

  /** Frase humana por tipo */
  const frase = (() => {
    switch (tipo) {
      case "ARTE_CRIADA":
        return (
          <>
            <strong>{autor.nome}</strong> subiu a arte{" "}
            <strong>{meta.arteNome ?? "—"}</strong>.
          </>
        );
      case "ARTE_VERSAO":
        return (
          <>
            <strong>{autor.nome}</strong> enviou{" "}
            <strong>v{meta.versao ?? "?"}</strong> de{" "}
            <strong>{meta.arteNome ?? "—"}</strong>.
          </>
        );
      case "FEEDBACK":
        return (
          <>
            <strong>{autor.nome}</strong> comentou em{" "}
            <strong>{meta.arteNome ?? "uma arte"}</strong>
            {meta.versao ? <> (v{meta.versao})</> : null}.
          </>
        );
      case "TAREFA_CRIADA":
        return (
          <>
            <strong>{autor.nome}</strong> criou a tarefa{" "}
            <strong>{meta.tarefaTitulo ?? "—"}</strong>.
          </>
        );
      case "APROVACAO":
        return (
          <>
            <strong>{autor.nome}</strong>{" "}
            {meta.aprovacaoStatus === "APROVADA"
              ? "aprovou"
              : meta.aprovacaoStatus === "REJEITADA"
              ? "rejeitou"
              : meta.aprovacaoStatus === "ENVIADA"
              ? "enviou para aprovação"
              : "atualizou a aprovação de"}{" "}
            <strong>{meta.arteNome ?? "—"}</strong>
            {meta.versao ? <> (v{meta.versao})</> : null}.
          </>
        );
      case "CONVITE":
        return (
          <>
            <strong>{autor.nome}</strong> convidou{" "}
            <strong>{meta.conviteEmail ?? "—"}</strong> para o projeto.
          </>
        );
      default:
        return <>{autor.nome} fez uma ação.</>;
    }
  })();

  /** Badge auxiliar para status de aprovação */
  const approvalBadge =
    tipo === "APROVACAO" && meta.aprovacaoStatus ? (
      <Badge
        variant="outline"
        className={cn(
          "rounded-full text-[11px]",
          meta.aprovacaoStatus === "APROVADA" && "border-emerald-300 text-emerald-700",
          meta.aprovacaoStatus === "REJEITADA" && "border-rose-300 text-rose-700",
          meta.aprovacaoStatus === "ENVIADA" && "border-blue-300 text-blue-700",
          meta.aprovacaoStatus === "PENDENTE" && "border-amber-300 text-amber-800"
        )}
      >
        {meta.aprovacaoStatus.toLowerCase()}
      </Badge>
    ) : null;

  return (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <Avatar className="h-8 w-8 mt-0.5">
        {autor.avatar ? (
          <AvatarImage src={autor.avatar} alt={autor.nome} />
        ) : (
          <AvatarFallback className="text-[10px]">
            {autor.nome.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{timeAgo(criado_em)}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{new Date(criado_em).toLocaleString("pt-BR")}</span>
        </div>

        <div className="mt-1 text-sm leading-5">
          {frase} {approvalBadge ? <span className="ml-2">{approvalBadge}</span> : null}
        </div>

        {tipo === "FEEDBACK" && meta.feedbackSnippet && (
          <div className="mt-1 text-sm border rounded-md p-2 bg-muted">
            {meta.feedbackSnippet}
          </div>
        )}

        <div className="mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onOpen(item.ref)}
          >
            Ver no contexto
          </Button>
        </div>
      </div>
    </div>
  );
}
