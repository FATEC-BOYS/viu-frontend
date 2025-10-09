"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type FeedbackItem = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  status: string;
  criado_em: string;
  autor_nome?: string | null;
  autor_email?: string | null;
  arte_versao_id?: string | null;
};

type Aprovacao = {
  id: string;
  arte_versao_id: string;
  aprovador_nome?: string | null;
  aprovador_email?: string | null;
  aprovado_em?: string | null;
  visto_em?: string | null;
};

type Props = {
  arteId: string;
  versoes: { id: string | null; numero: number; criado_em: string; status: string | null }[];
  aprovacoesByVersao: Record<string, Aprovacao[]>;
  readOnly: boolean;
  viewer?: { email: string; nome?: string | null } | null;
  token: string;
  initialFeedbacks: FeedbackItem[];
};

export default function FeedbackPanel({
  arteId,
  versoes,
  aprovacoesByVersao,
  readOnly,
  viewer,
  token,
  initialFeedbacks,
}: Props) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialFeedbacks);
  const [loading, setLoading] = useState(false);

  async function loadFeedbacks() {
    try {
      if (!token) {
        console.warn("[FeedbackPanel] sem token — pulando fetch");
        return;
      }

      setLoading(true);

      const url = `/api/arte/${encodeURIComponent(arteId)}/feedbacks?token=${encodeURIComponent(
        token
      )}`;

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        let payload: any = null;
        try {
          payload = await res.json();
        } catch {
          try {
            payload = await res.text();
          } catch {}
        }
        console.error("[FeedbackPanel] fetch not ok", res.status, payload);
        setFeedbacks([]); // mantém a UI funcional
        return;
      }

      const data = (await res.json()) as FeedbackItem[];
      if (!Array.isArray(data)) {
        console.warn("[FeedbackPanel] resposta inesperada", data);
        setFeedbacks([]);
        return;
      }

      setFeedbacks(data);
    } catch (e) {
      console.error("[FeedbackPanel] erro geral no fetch:", e);
      setFeedbacks([]); // fallback seguro
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      loadFeedbacks();
    }, 30000);
    return () => clearInterval(interval);
  }, [arteId, token]);

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Versões & Feedbacks</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadFeedbacks}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "Atualizando..." : "Recarregar"}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-18rem)] pr-3">
          {versoes.map((v) => {
            const vId = v.id ?? "sem-id";
            const listaFeedbacks = feedbacks.filter((f) => f.arte_versao_id === v.id);
            const aprovacoes = aprovacoesByVersao[vId] ?? [];

            return (
              <div key={vId} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">
                    Versão {v.numero}
                    <span
                      suppressHydrationWarning
                      className="ml-2 text-xs text-muted-foreground"
                    >
                      {new Date(v.criado_em).toLocaleDateString()}
                    </span>
                  </h4>
                  <Badge
                    variant={
                      v.status === "APROVADO"
                        ? "default"
                        : v.status === "REJEITADO"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {v.status ?? "EM ANÁLISE"}
                  </Badge>
                </div>

                {/* Aprovadores */}
                {aprovacoes.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {aprovacoes.map((a) => (
                      <div
                        key={a.id}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>
                          {a.aprovador_nome || a.aprovador_email || "Aprovador desconhecido"}
                        </span>
                        <span suppressHydrationWarning>
                          {a.aprovado_em
                            ? "✅ " + new Date(a.aprovado_em).toLocaleDateString()
                            : a.visto_em
                            ? "👁️ " + new Date(a.visto_em).toLocaleDateString()
                            : "⏳ pendente"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedbacks */}
                <div className="space-y-2">
                  {listaFeedbacks.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum feedback nesta versão.
                    </p>
                  )}
                  {listaFeedbacks.map((f) => (
                    <div key={f.id} className="rounded-md border p-2">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium">
                          {f.autor_nome || f.autor_email || "Anônimo"}
                        </span>
                        <span
                          suppressHydrationWarning
                          className="text-[10px] text-muted-foreground"
                        >
                          {new Date(f.criado_em).toLocaleString()}
                        </span>
                      </div>

                      {f.tipo === "AUDIO" ? (
                        <audio
                          src={f.arquivo || ""}
                          controls
                          className="mt-1 w-full"
                        />
                      ) : (
                        <p className="text-xs mt-1 whitespace-pre-wrap">
                          {f.conteudo || "(sem texto)"}
                        </p>
                      )}

                      <div className="mt-1 flex justify-end">
                        <Badge
                          variant={
                            f.status === "RESOLVIDO"
                              ? "default"
                              : f.status === "EM_ANALISE"
                              ? "secondary"
                              : f.status === "ARQUIVADO"
                              ? "outline"
                              : "destructive"
                          }
                          className="text-[10px] uppercase"
                        >
                          {f.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
