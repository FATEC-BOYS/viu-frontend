"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type AprovacaoChatItem = {
  id: string;
  tipo: "APROVOU" | "REJEITOU" | "COMENTOU" | "ENVIADO";
  autor: { id: string; nome: string; avatar?: string | null };
  mensagem?: string | null;
  criado_em: string; // ISO
  arteNome?: string;
  versao?: number;
};

export default function AprovacaoChatHistory({
  items,
  className,
}: {
  items: AprovacaoChatItem[];
  className?: string;
}) {
  if (!items?.length) {
    return (
      <div className="text-sm text-muted-foreground border rounded-xl p-6 text-center">
        Sem atividade ainda.
      </div>
    );
  }

  return (
    <Card className={cn("p-3 space-y-3", className)}>
      {items.map((it, idx) => {
        const isAprovar = it.tipo === "APROVOU";
        const isRejeitar = it.tipo === "REJEITOU";
        const isComent = it.tipo === "COMENTOU";
        const isEnviado = it.tipo === "ENVIADO";

        return (
          <div key={it.id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              {it.autor.avatar ? (
                <AvatarImage src={it.autor.avatar} alt={it.autor.nome} />
              ) : (
                <AvatarFallback className="text-[10px]">
                  {it.autor.nome.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate">{it.autor.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(it.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>

              <div
                className={cn(
                  "mt-1 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                  isAprovar && "bg-emerald-50 border-emerald-200",
                  isRejeitar && "bg-rose-50 border-rose-200",
                  isComent && "bg-muted",
                  isEnviado && "bg-blue-50 border-blue-200"
                )}
              >
                <span className="mt-0.5">
                  {isAprovar && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {isRejeitar && <XCircle className="h-4 w-4 text-rose-600" />}
                  {isComent && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                  {isEnviado && <Send className="h-4 w-4 text-blue-600" />}
                </span>

                <div className="min-w-0">
                  <div className="leading-snug">
                    {isAprovar && (
                      <span>
                        Aprovou {it.arteNome ? <strong>{it.arteNome}</strong> : "a arte"}
                        {it.versao ? <> (v{it.versao})</> : null}.
                      </span>
                    )}
                    {isRejeitar && (
                      <span>
                        Rejeitou {it.arteNome ? <strong>{it.arteNome}</strong> : "a arte"}
                        {it.versao ? <> (v{it.versao})</> : null}.
                      </span>
                    )}
                    {isComent && (
                      <span>
                        Comentou em {it.arteNome ? <strong>{it.arteNome}</strong> : "uma arte"}
                        {it.versao ? <> (v{it.versao})</> : null}.
                      </span>
                    )}
                    {isEnviado && (
                      <span>
                        Enviou para aprovação {it.arteNome ? <strong>{it.arteNome}</strong> : "a arte"}
                        {it.versao ? <> (v{it.versao})</> : null}.
                      </span>
                    )}
                  </div>

                  {it.mensagem && (
                    <div className="mt-1 text-sm break-words">
                      {it.mensagem}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* separador entre itens (não após o último) */}
            {idx < items.length - 1 ? <Separator className="opacity-0" /> : null}
          </div>
        );
      })}
    </Card>
  );
}
