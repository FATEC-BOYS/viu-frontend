"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin, SendHorizonal, X } from "lucide-react";
import AudioRecorder from "./AudioRecorder";

type Arte = {
  id: string;
  arquivo: string;         // URL resolvida no server
  largura_px?: number | null;
  altura_px?: number | null;
  versao: number;
  nome: string;
  status?: string | null;
  tipo?: string | null;
};

type Feedback = {
  id: string;
  conteudo: string | null;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  posicao_x: number | null;
  posicao_y: number | null;
  posicao_x_abs?: number | null; // ignore se não usa absolutos
  posicao_y_abs?: number | null;
  status: string | null;
  criado_em: string;
  autor_id?: string | null;
  autor_externo_id?: string | null;
  arte_versao_id: number;
};

export default function FeedbackViewer({
  arte,
  initialFeedbacks,
  readOnly,
  token,
}: {
  arte: Arte;
  initialFeedbacks: Feedback[];
  readOnly: boolean;
  token: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);

  // identidade do visitante (preenchida pelo IdentityGate e salva no localStorage)
  const [viewer, setViewer] = useState<{ email: string; nome?: string | null } | null>(null);

  // carregar identidade do localStorage e marcar “visto” na chegada
  useEffect(() => {
    const raw = localStorage.getItem("viu.viewer");
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (v?.email) setViewer(v);
      } catch {}
    }
  }, []);

  useEffect(() => {
    async function autoSeen() {
      if (!viewer) return;
      // marca "viu" (sem aprovar)
      await supabase.rpc("viewer_mark_seen_and_approve", {
        p_token: token,
        p_arte_id: arte.id,
        p_email: viewer.email,
        p_aprovar: null,
      });
    }
    autoSeen();
  }, [viewer, token, arte.id]);

  // estado de “composer” para pins
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    percentX: number;
    percentY: number;
    text: string;
    open: boolean;
  } | null>(null);

  const openComposerAt = useCallback((clientX: number, clientY: number) => {
    if (readOnly) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const percentX = Math.max(0, Math.min(1, x / rect.width));
    const percentY = Math.max(0, Math.min(1, y / rect.height));

    setDraft({
      x,
      y,
      percentX,
      percentY,
      text: "",
      open: true,
    });
  }, [readOnly]);

  function closeDraft() {
    setDraft(null);
  }

  async function sendText() {
    if (!viewer || !draft || !draft.text.trim() || readOnly) return;
    const { data, error } = await supabase.rpc("viewer_add_feedback", {
      p_token: token,
      p_arte_id: arte.id,
      p_email: viewer.email,
      p_conteudo: draft.text.trim(),
      p_tipo: "TEXTO",
      p_arquivo: null,
      p_posicao_x: draft.percentX,
      p_posicao_y: draft.percentY,
    });
    if (error) {
      console.error(error);
      return;
    }
    setFeedbacks((prev) => [data as any, ...prev]);
    setDraft(null);
  }

  async function handleAudioUploaded(publicUrl: string, storagePath: string) {
    if (!viewer || !draft || readOnly) return;
    const { data, error } = await supabase.rpc("viewer_add_feedback", {
      p_token: token,
      p_arte_id: arte.id,
      p_email: viewer.email,
      p_conteudo: null,
      p_tipo: "AUDIO",
      p_arquivo: storagePath, // guardo path interno; no render dá pra usar o publicUrl
      p_posicao_x: draft.percentX,
      p_posicao_y: draft.percentY,
    });
    if (error) {
      console.error(error);
      return;
    }
    // Salvo com o path, mas anexo a URL pública para player imediato
    setFeedbacks((prev) => [
      { ...(data as any), arquivo: publicUrl },
      ...prev,
    ]);
    setDraft(null);
  }

  // pins (por versão atual primeiro; se quiser mostrar de outras versões, ajuste filtro)
  const pins = useMemo(() => {
    return feedbacks
      .filter((f) => f.arte_versao_id === arte.versao && f.posicao_x != null && f.posicao_y != null)
      .map((f, i) => ({
        id: f.id,
        index: i + 1,
        xPct: (f.posicao_x || 0),
        yPct: (f.posicao_y || 0),
        tipo: f.tipo,
        arquivo: f.arquivo,
        conteudo: f.conteudo,
      }));
  }, [feedbacks, arte.versao]);

  return (
    <div className="space-y-3">
      {/* barra topo (status/versão) */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">v{arte.versao}</Badge>
        {arte.status && <Badge variant="outline">{arte.status}</Badge>}
        {arte.tipo && <Badge variant="outline">{arte.tipo}</Badge>}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" /> Clique para marcar um ponto
        </div>
      </div>

      {/* canvas da arte */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border bg-muted"
        onClick={(e) => openComposerAt(e.clientX, e.clientY)}
      >
        {/* imagem/preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={arte.arquivo}
          alt={arte.nome}
          className="w-full h-auto block select-none"
          draggable={false}
        />

        {/* pins existentes */}
        {pins.map((p) => (
          <button
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${p.xPct * 100}%`, top: `${p.yPct * 100}%` }}
            onClick={(e) => { e.stopPropagation(); /* futuro: abrir popover do pin */ }}
          >
            <span className="grid place-items-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow ring-2 ring-background">
              {p.index}
            </span>
          </button>
        ))}

        {/* composer no ponto clicado */}
        {draft?.open && (
          <div
            className="absolute z-10 w-[min(280px,80vw)] rounded-md border bg-background shadow-xl"
            style={{
              left: `min(calc(${draft.percentX * 100}% + 8px), calc(100% - 300px))`,
              top: `min(calc(${draft.percentY * 100}% + 8px), calc(100% - 220px))`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b text-xs text-muted-foreground flex items-center justify-between">
              Posição: {(draft.percentX * 100).toFixed(0)}% × {(draft.percentY * 100).toFixed(0)}%
              <button className="p-1 hover:text-foreground" onClick={closeDraft}><X className="h-3.5 w-3.5" /></button>
            </div>
            <div className="p-2 space-y-2">
              <Textarea
                placeholder={readOnly ? "Link em modo leitura" : "Escreva um comentário…"}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                disabled={readOnly || !viewer}
              />
              <div className="flex items-center justify-between">
                <AudioRecorder
                  arteId={arte.id}
                  disabled={readOnly || !viewer}
                  onUploaded={handleAudioUploaded}
                />
                <Button
                  size="sm"
                  onClick={sendText}
                  disabled={readOnly || !viewer || !draft.text.trim()}
                >
                  <SendHorizonal className="h-4 w-4 mr-1" />
                  Enviar
                </Button>
              </div>
              {!viewer && (
                <p className="text-[11px] text-muted-foreground">
                  Você precisa se identificar no modal para enviar.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* lista curta dos últimos feedbacks desta versão (visual) */}
      <div className="rounded-lg border p-3">
        <p className="text-sm font-medium mb-2">Últimos comentários (v{arte.versao})</p>
        <div className="space-y-2">
          {feedbacks
            .filter((f) => f.arte_versao_id === arte.versao)
            .slice(0, 6)
            .map((f) => (
              <div key={f.id} className="text-sm">
                <span className="text-[11px] text-muted-foreground mr-2">
                  {new Date(f.criado_em).toLocaleString("pt-BR")}
                </span>
                {f.tipo === "AUDIO" && f.arquivo ? (
                  <audio src={f.arquivo} controls className="w-full max-w-xs align-middle" />
                ) : (
                  <span className="whitespace-pre-wrap align-middle">{f.conteudo || "—"}</span>
                )}
                {f.posicao_x != null && f.posicao_y != null && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    <MapPin className="h-3 w-3 mr-1" />
                    {(f.posicao_x * 100).toFixed(0)}% × {(f.posicao_y * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            ))}

          {feedbacks.filter((f) => f.arte_versao_id === arte.versao).length === 0 && (
            <p className="text-xs text-muted-foreground">Ainda não há comentários nesta versão.</p>
          )}
        </div>
      </div>
    </div>
  );
}
