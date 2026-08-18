"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Volume2, FileText, MapPin } from "lucide-react";

type FeedbackItem = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  transcricao?: string | null;
  status: string;
  criado_em: string;
  autor_nome?: string | null;
  autor_email?: string | null;
  arte_versao_id?: string | null;
  posicao_x?: number | null;
  posicao_y?: number | null;
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
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTTS = useCallback(async (feedbackId: string, text: string) => {
    if (ttsPlaying === feedbackId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setTtsPlaying(null);
      return;
    }
    try {
      setTtsPlaying(feedbackId);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "nova" }),
      });
      if (!res.ok) {
        toast.error("Falha ao gerar áudio do texto.");
        setTtsPlaying(null);
        return;
      }
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTtsPlaying(null);
        audioRef.current = null;
      };
      audio.play();
    } catch {
      toast.error("Não foi possível reproduzir o áudio.");
      setTtsPlaying(null);
    }
  }, [ttsPlaying]);

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
                        <span className="text-xs font-medium flex items-center gap-1">
                          {f.posicao_x != null && (
                            <MapPin className="h-3 w-3 text-blue-500" />
                          )}
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
                        <div className="mt-1 space-y-1">
                          <audio
                            src={f.arquivo || ""}
                            controls
                            className="w-full"
                          />
                          {(f.transcricao || f.conteudo) &&
                            f.conteudo !== "Áudio" && (
                              <div className="flex items-start gap-1 text-[11px] bg-muted/50 rounded p-1.5">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                  {f.transcricao || f.conteudo}
                                </p>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1 mt-1">
                          <p className="text-xs whitespace-pre-wrap flex-1">
                            {f.conteudo || "(sem texto)"}
                          </p>
                          {f.conteudo && (
                            <button
                              onClick={() => handleTTS(f.id, f.conteudo)}
                              className={`shrink-0 p-0.5 rounded hover:bg-muted transition-colors ${
                                ttsPlaying === f.id
                                  ? "text-blue-500 animate-pulse"
                                  : "text-muted-foreground"
                              }`}
                              title={
                                ttsPlaying === f.id
                                  ? "Parar áudio"
                                  : "Ouvir comentário"
                              }
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="mt-1 flex justify-end">
                        <Badge
                          variant={f.status === "RESOLVIDO" ? "default" : "destructive"}
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
