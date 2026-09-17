"use client";

import Thumb from "@/components/layout/Thumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rotuloArte, rotuloTipoArte } from "@/lib/rotulos";
import { Plus, Send, ExternalLink } from "lucide-react";

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
      {/*
        Uma borda para a lista, com fio entre as artes. Era um cartão por arte,
        e cada um levava `card-interativo` — a classe cujo próprio comentário
        diz "aplicada onde o item é clicável". O cartão subia 2px e brilhava ao
        passar o mouse, prometendo um clique que não existia: a linha inteira
        não fazia nada. Agora faz o que o olho fazia, e o olho saiu.
      */}
      {rows.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3">
            {/*
              * `Thumb` em vez de `<Image>` cru: sem `unoptimized`, o next/image
              * recusa qualquer host fora do `remotePatterns` com "Invalid src
              * prop" — e isso não degrada, derruba a página inteira. O link do
              * R2 é assinado e pode mudar de domínio; uma miniatura que falha
              * tem que virar ícone, não tela de erro.
              */}
              {/*
                A metade esquerda é o botão, e os ícones ficam de irmãos: uma
                linha inteira como <button> não pode conter outros botões, e
                uma <li> com `onClick` o teclado não alcança.
              */}
              <button
                type="button"
                onClick={() => onPeek(a.id)}
                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
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
              </button>

              {/*
                * As ações estavam em `opacity-0 group-hover:opacity-100`: no
                * celular, onde não existe hover, elas simplesmente não existiam
                * — e no desktop ninguém descobre o que não aparece.
                *
                * `aria-label` além do `title`: um botão só de ícone precisa de
                * nome acessível, e tooltip não é nome.
                */}
              <div className="flex shrink-0 gap-0.5">
                {onNovaVersao && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Nova versão"
                    aria-label={`Nova versão de ${a.nome}`}
                    onClick={() => onNovaVersao(a.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                {onPedirAprovacao && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Solicitar aprovação"
                    aria-label={`Solicitar aprovação de ${a.nome}`}
                    onClick={() => onPedirAprovacao(a.id)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {onAbrir && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Abrir"
                    aria-label={`Abrir ${a.nome}`}
                    onClick={() => onAbrir(a.id)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Carregar mais */}
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={onLoadMore} variant="outline" disabled={loading}>
            {loading ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}

      {/* Uma linha: "não há nada" não merece a maior caixa da tela. */}
      {!rows.length && (
        <p className="py-6 text-sm text-muted-foreground">
          Nenhuma arte neste projeto ainda.
        </p>
      )}
    </div>
  );
}
