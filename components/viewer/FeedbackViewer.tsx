"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type FeedbackItem = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
  criado_em: string;
  autor_id?: string | null;
  autor_nome?: string | null;
  autor_email?: string | null;
  arte_versao_id?: string | null;
};

type ArteMin = {
  id: string;
  nome: string;
  arquivo: string;
  largura_px?: number | null;
  altura_px?: number | null;
};

type Viewer = { email: string; nome?: string | null };

type Props = {
  arte: ArteMin;
  initialFeedbacks: FeedbackItem[];
  token: string;
  onAskIdentity: () => void;
  viewer?: Viewer | null;
  readOnly?: boolean;
};

export default function FeedbackViewer({
  arte,
  initialFeedbacks,
  token,
  onAskIdentity,
  viewer,
  readOnly,
}: Props) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialFeedbacks);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState<"none" | "text" | "audio">("none");
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<BlobPart[]>([]);

  const canComment = useMemo(() => !readOnly && !!viewer?.email, [readOnly, viewer]);

  async function handleAddComment() {
    if (!viewer?.email) {
      onAskIdentity();
      return;
    }

    const payload = comment.trim();
    if (!payload) return;

    try {
      setSending("text");
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          token,
          arteId: arte.id,
          tipo: "TEXTO",
          conteudo: payload,
          viewer: { email: viewer.email, nome: viewer.nome ?? null },
        }),
      });

      if (!res.ok) {
        let msg = "Erro ao criar feedback.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        alert(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      setFeedbacks((f) => [...f, created]);
      setComment("");
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao criar feedback:", e);
      alert("Não foi possível enviar seu comentário.");
    } finally {
      setSending("none");
    }
  }

  async function startRecording() {
    if (!viewer?.email) {
      onAskIdentity();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      setChunks([]);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) setChunks((cs) => [...cs, e.data]);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        await uploadAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecorder(mr);
      setRecording(true);
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao iniciar gravação:", e);
      alert("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    if (recorder && recording) {
      recorder.stop();
      setRecording(false);
      setRecorder(null);
    }
  }

  async function uploadAudioBlob(blob: Blob) {
    try {
      setSending("audio");
      const fd = new FormData();
      fd.append("token", token);
      fd.append("arteId", arte.id);
      fd.append("email", viewer!.email);
      if (viewer!.nome) fd.append("nome", viewer!.nome!);
      fd.append("file", blob, `gravacao_${Date.now()}.webm`);

      const res = await fetch("/api/feedbacks", { method: "POST", body: fd });

      if (!res.ok) {
        let msg = "Erro ao enviar áudio.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        alert(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      setFeedbacks((f) => [...f, created]);
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao enviar áudio:", e);
      alert("Não foi possível enviar o áudio.");
    } finally {
      setSending("none");
    }
  }

  return (
    <div className="flex flex-col">
      {/* Visualização da arte */}
      <div className="relative w-full bg-muted">
        <img
          src={arte.arquivo}
          alt={arte.nome}
          className="w-full h-auto max-h-[70vh] object-contain bg-background"
          draggable={false}
        />
      </div>

      {/* Caixa de comentário */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Feedbacks</h3>
          {readOnly ? (
            <span className="text-xs text-muted-foreground">Somente leitura</span>
          ) : viewer?.email ? (
            <span className="text-xs text-muted-foreground">Comentando como {viewer.email}</span>
          ) : (
            <Button size="sm" variant="secondary" onClick={onAskIdentity}>
              Identificar para comentar
            </Button>
          )}
        </div>

        {/* Texto */}
        <div className={!canComment ? "opacity-60 pointer-events-none" : ""}>
          <Textarea
            placeholder={readOnly ? "Comentários desabilitados" : "Escreva um comentário…"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            {!recording ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={startRecording}
                disabled={!canComment || sending !== "none"}
              >
                Gravar áudio
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRecording}
                disabled={!canComment}
              >
                Parar gravação
              </Button>
            )}
            <Button
              onClick={handleAddComment}
              disabled={!canComment || !comment.trim() || sending !== "none"}
            >
              {sending === "text" ? "Enviando..." : "Enviar comentário"}
            </Button>
          </div>
        </div>

        {/* Lista de feedbacks */}
        <ul className="mt-2 space-y-3">
          {feedbacks.map((fb) => (
            <li key={fb.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {fb.autor_nome || fb.autor_email || "Anônimo"}
                </span>
                <span suppressHydrationWarning className="text-xs text-muted-foreground">
                  {new Date(fb.criado_em).toLocaleString()}
                </span>
              </div>

              {fb.tipo === "AUDIO" ? (
                <audio src={fb.arquivo || ""} controls className="mt-2 w-full" />
              ) : (
                <p className="text-sm mt-1 whitespace-pre-wrap">{fb.conteudo}</p>
              )}

              <div className="mt-2">
                <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {fb.status}
                </span>
              </div>
            </li>
          ))}
          {feedbacks.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum feedback ainda.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
