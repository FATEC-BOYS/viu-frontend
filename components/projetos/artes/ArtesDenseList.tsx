"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
            "p-2 group transition-all hover:shadow-sm border"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
              {a.preview_url ? (
                <Image src={a.preview_url} alt={a.nome} fill className="object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">
                  sem preview
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium truncate">{a.nome}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  v{a.versao} • {a.status}
                </div>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {a.tipo} • {a.autor?.nome ?? "—"} • {new Date(a.criado_em).toLocaleDateString("pt-BR")}
              </div>
            </div>

            {/* Ações no hover */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
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
