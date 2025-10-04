"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import AtividadeItemRow, {
  type AtividadeItem,
  type AtividadeRef,
} from "./AtividadeItemRow";

export default function AtividadeFeed({
  rows,
  total,
  loading,
  onLoadMore,
  onOpen,
}: {
  rows: AtividadeItem[];
  total: number;
  loading: boolean;
  onLoadMore: () => void;
  onOpen: (ref: AtividadeRef) => void;
}) {
  const hasMore = rows.length < total;

  if (!rows.length && loading) {
    return (
      <Card className="p-4 grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-40 bg-muted rounded mb-2" />
            <div className="h-3 w-full bg-muted rounded" />
          </div>
        ))}
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground border rounded-xl p-6 text-center">
        Sem atividade por aqui — assim que rolar algo, aparece neste feed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="p-2">
        {rows.map((item) => (
          <AtividadeItemRow key={item.id} item={item} onOpen={onOpen} />
        ))}
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…</> : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}
