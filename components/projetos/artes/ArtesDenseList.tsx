"use client";

import Thumb from "@/components/layout/Thumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { rotuloArte, rotuloTipoArte } from "@/lib/rotulos";
import { cn } from "@/lib/utils";
import { Eye, Plus, Send, ExternalLink } from "lucide-react";

export type ArteListItem = {
  id: string;
  nome: string;
  tipo: string;
  versao: number;
  status: string;
  criado_em: string;
  autor?: { id: string; nome: string } | null;
  preview_url?: string | null; // thumbnail da última versão
};

export default function ArtesDenseList({
  rows,
  total,
  loading,
  onLoadMore,
  onPeek,
  onNovaVersao,
  onPedirAprovacao,
  onAbrir,
}: {
  rows: ArteListItem[];
  total: number;
  loading: boolean;
  onLoadMore: () => void;
  onPeek: (arteId: string) => void;
  onNovaVersao?: (arteId: string) => void;
  onPedirAprovacao?: (arteId: string) => void;
  onAbrir?: (arteId: string) => void;
}) {
  const hasMore = rows.length < total;

  return (
    <div className="space-y-3">
      {rows.map((a) => (
        <Card
          key={a.id}
          className={cn(
            "p-2 group border card-interativo"
          )}
        >
          <div className="flex items-center gap-3">
            {/*
              * `Thumb` em vez de `<Image>` cru: sem `unoptimized`, o next/image
              * recusa qualquer host fora do `remotePatterns` com "Invalid src
              * prop" — e isso não degrada, derruba a página inteira. O link do
              * R2 é assinado e pode mudar de domínio; uma miniatura que falha
              * tem que virar ícone, não tela de erro.
              */}
            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
              <Thumb src={a.preview_url} alt={a.nome} sizes="48px" iconClassName="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{a.nome}</span>
                {/* `EM_ANALISE` era mostrado cru, com underscore e em caixa alta. */}
                <Badge variant="outline" className="shrink-0 rounded-full text-[11px] font-normal">
                  {rotuloArte(a.status)}
                </Badge>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                v{a.versao} · {rotuloTipoArte(a.tipo)} · {a.autor?.nome ?? "—"} ·{" "}
                {new Date(a.criado_em).toLocaleDateString("pt-BR")}
              </div>
            </div>

            {/*
              * As ações estavam em `opacity-0 group-hover:opacity-100`: no
              * celular, onde não existe hover, elas simplesmente não existiam
              * — e no desktop ninguém descobre o que não aparece. Ficam
              * visíveis, discretas, e ganham peso ao passar o mouse.
              */}
            <div className="flex gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon" title="Prever" onClick={() => onPeek(a.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              {onNovaVersao && (
                <Button variant="ghost" size="icon" title="Nova versão" onClick={() => onNovaVersao(a.id)}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {onPedirAprovacao && (
                <Button variant="ghost" size="icon" title="Solicitar aprovação" onClick={() => onPedirAprovacao(a.id)}>
                  <Send className="h-4 w-4" />
                </Button>
              )}
              {onAbrir && (
                <Button variant="ghost" size="icon" title="Abrir" onClick={() => onAbrir(a.id)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Carregar mais */}
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} variant="outline" disabled={loading}>
            {loading ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}

      {!rows.length && (
        <div className="text-sm text-muted-foreground border rounded-xl p-6 text-center">
          Sem artes por aqui — que tal subir a primeira? ✨
        </div>
      )}
    </div>
  );
}
