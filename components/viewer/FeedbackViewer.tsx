"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mic,
  Square,
  Loader2,
  MapPin,
  X,
  Volume2,
  FileText,
} from "lucide-react";
import { useAudioRecorder, formatElapsed } from "./hooks/useAudioRecorder";

export type FeedbackItem = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  transcricao?: string | null;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
  criado_em: string;
  autor_id?: string | null;
  autor_nome?: string | null;
  autor_email?: string | null;
  arte_versao_id?: string | null;
  posicao_x?: number | null;
  posicao_y?: number | null;
};

type ArteMin = {
  id: string;
  nome: string;
  arquivo: string;
  largura_px?: number | null;
  altura_px?: number | null;
};

type Viewer = { email: string; nome?: string | null };

type PinPosition = { x: number; y: number } | null;

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
  const [pin, setPin] = useState<PinPosition>(null);
  const [hoveredFeedback, setHoveredFeedback] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recorder = useAudioRecorder();

  const canComment = useMemo(() => !readOnly && !!viewer?.email, [readOnly, viewer]);

  // --- Click on image to place pin ---
  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canComment || sending !== "none") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
  }

  function clearPin() {
    setPin(null);
  }

  // --- Send text feedback ---
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
          posicao_x: pin?.x ?? null,
          posicao_y: pin?.y ?? null,
        }),
      });

      if (!res.ok) {
        let msg = "Erro ao criar feedback.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        toast.error(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      if (pin) {
        created.posicao_x = pin.x;
        created.posicao_y = pin.y;
      }
      setFeedbacks((f) => [...f, created]);
      setComment("");
      setPin(null);
      toast.success("Comentário enviado!");
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao criar feedback:", e);
      toast.error("Não foi possível enviar seu comentário.");
    } finally {
      setSending("none");
    }
  }

  // --- Audio recording (using proper hook, fixing the closure bug) ---
  async function handleStartRecording() {
    if (!viewer?.email) {
      onAskIdentity();
      return;
    }
    await recorder.start();
  }

  async function handleStopRecording() {
    const blob = await recorder.stop();
    if (!blob) return;
    await uploadAudioBlob(blob);
  }

  // --- Upload audio + transcribe ---
  async function uploadAudioBlob(blob: Blob) {
    try {
      setSending("audio");

      const fd = new FormData();
      fd.append("token", token);
      fd.append("arteId", arte.id);
      fd.append("email", viewer!.email);
      if (viewer!.nome) fd.append("nome", viewer!.nome!);
      if (pin) {
        fd.append("posicao_x", String(pin.x));
        fd.append("posicao_y", String(pin.y));
      }
      fd.append("file", blob, `gravacao_${Date.now()}.webm`);

      const res = await fetch("/api/feedbacks", { method: "POST", body: fd });

      if (!res.ok) {
        let msg = "Erro ao enviar áudio.";
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        toast.error(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      if (pin) {
        created.posicao_x = pin.x;
        created.posicao_y = pin.y;
      }
      setFeedbacks((f) => [...f, created]);
      setPin(null);
      toast.success("Áudio enviado!");

      // Auto-transcribe in background
      transcribeAudioFeedback(created.id, blob);
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao enviar áudio:", e);
      toast.error("Não foi possível enviar o áudio.");
    } finally {
      setSending("none");
    }
  }

  // --- STT: transcribe audio and update feedback ---
  async function transcribeAudioFeedback(feedbackId: string, blob: Blob) {
    try {
      setTranscribing(true);
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) {
        console.warn("[transcribe] falhou:", res.status);
        return;
      }

      const { text } = await res.json();
      if (!text) return;

      // Update the feedback in local state with transcription
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackId ? { ...f, transcricao: text, conteudo: text } : f
        )
      );
      toast.success("Áudio transcrito automaticamente!");
    } catch (e) {
      console.warn("[transcribe] erro:", e);
    } finally {
      setTranscribing(false);
    }
  }

  // --- TTS: text-to-speech for text feedbacks ---
  const handleTTS = useCallback(async (feedbackId: string, text: string) => {
    if (ttsPlaying === feedbackId) {
      // Stop current playback
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
    } catch (e) {
      console.error("[TTS] erro:", e);
      toast.error("Não foi possível reproduzir o áudio.");
      setTtsPlaying(null);
    }
  }, [ttsPlaying]);

  // Feedbacks with position (for pin markers on image)
  const positionedFeedbacks = feedbacks.filter(
    (f) => f.posicao_x != null && f.posicao_y != null
  );

  return (
    <div className="flex flex-col">
      {/* Arte visualization with click-to-comment */}
      <div
        ref={imgContainerRef}
        className="relative w-full bg-muted cursor-crosshair"
        onClick={handleImageClick}
      >
        <img
          src={arte.arquivo}
          alt={arte.nome}
          className="w-full h-auto max-h-[70vh] object-contain bg-background pointer-events-none select-none"
          draggable={false}
        />

        {/* Existing feedback pins */}
        {positionedFeedbacks.map((f, i) => (
          <button
            key={f.id}
            className={`absolute z-10 -translate-x-1/2 -translate-y-full transition-transform ${
              hoveredFeedback === f.id ? "scale-125" : ""
            }`}
            style={{ left: `${f.posicao_x}%`, top: `${f.posicao_y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              setHoveredFeedback(hoveredFeedback === f.id ? null : f.id);
            }}
            title={f.conteudo || `Feedback #${i + 1}`}
          >
            <MapPin
              className={`h-6 w-6 drop-shadow-md ${
                f.tipo === "AUDIO"
                  ? "text-purple-500 fill-purple-200"
                  : "text-blue-600 fill-blue-200"
              }`}
            />
            <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {i + 1}
            </span>
          </button>
        ))}

        {/* Current pin being placed */}
        {pin && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-full animate-bounce"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
          >
            <MapPin className="h-7 w-7 text-red-500 fill-red-200 drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Pin indicator */}
      {pin && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 border-b text-xs text-blue-700 dark:text-blue-300">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            Comentário posicionado em ({pin.x.toFixed(0)}%, {pin.y.toFixed(0)}%)
          </span>
          <button onClick={clearPin} className="ml-auto hover:text-red-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Comment box */}
      <div className="border-t p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Feedbacks</h3>
          {readOnly ? (
            <span className="text-xs text-muted-foreground">Somente leitura</span>
          ) : viewer?.email ? (
            <span className="text-xs text-muted-foreground">
              Comentando como {viewer.email}
            </span>
          ) : (
            <Button size="sm" variant="secondary" onClick={onAskIdentity}>
              Identificar para comentar
            </Button>
          )}
        </div>

        {/* Text + Audio input */}
        <div className={!canComment ? "opacity-60 pointer-events-none" : ""}>
          <Textarea
            placeholder={readOnly ? "Comentários desabilitados" : "Escreva um comentário…"}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {recorder.state === "idle" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartRecording}
                  disabled={!canComment || sending !== "none"}
                >
                  <Mic className="h-4 w-4 mr-1" />
                  Gravar áudio
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopRecording}
                  disabled={!canComment}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Parar ({formatElapsed(recorder.elapsedMs)})
                </Button>
              )}
              {sending === "audio" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Enviando…
                </span>
              )}
              {transcribing && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Transcrevendo…
                </span>
              )}
            </div>
            <Button
              onClick={handleAddComment}
              disabled={!canComment || !comment.trim() || sending !== "none"}
            >
              {sending === "text" ? "Enviando..." : "Enviar comentário"}
            </Button>
          </div>
          {recorder.permissionError && (
            <p className="text-xs text-destructive mt-1">{recorder.permissionError}</p>
          )}
        </div>

        {/* Feedback list */}
        <ul className="mt-2 space-y-3">
          {feedbacks.map((fb, i) => (
            <li
              key={fb.id}
              className={`rounded-md border p-3 transition-colors ${
                hoveredFeedback === fb.id ? "ring-2 ring-blue-400" : ""
              }`}
              onMouseEnter={() =>
                fb.posicao_x != null ? setHoveredFeedback(fb.id) : undefined
              }
              onMouseLeave={() => setHoveredFeedback(null)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {fb.posicao_x != null && (
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  {fb.autor_nome || fb.autor_email || "Anônimo"}
                </span>
                <span
                  suppressHydrationWarning
                  className="text-xs text-muted-foreground"
                >
                  {new Date(fb.criado_em).toLocaleString()}
                </span>
              </div>

              {fb.tipo === "AUDIO" ? (
                <div className="mt-2 space-y-1.5">
                  <audio src={fb.arquivo || ""} controls className="w-full" />
                  {/* Show transcription for audio */}
                  {(fb.transcricao || fb.conteudo) &&
                    fb.conteudo !== "Áudio" && (
                      <div className="flex items-start gap-1.5 text-xs bg-muted/50 rounded p-2">
                        <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="whitespace-pre-wrap text-muted-foreground">
                          {fb.transcricao || fb.conteudo}
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 mt-1">
                  <p className="text-sm whitespace-pre-wrap flex-1">{fb.conteudo}</p>
                  {/* TTS button for text feedbacks */}
                  {fb.conteudo && (
                    <button
                      onClick={() => handleTTS(fb.id, fb.conteudo)}
                      className={`shrink-0 p-1 rounded hover:bg-muted transition-colors ${
                        ttsPlaying === fb.id ? "text-blue-500 animate-pulse" : "text-muted-foreground"
                      }`}
                      title={ttsPlaying === fb.id ? "Parar áudio" : "Ouvir comentário"}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <div className="mt-2">
                <Badge
                  variant={
                    fb.status === "RESOLVIDO"
                      ? "default"
                      : fb.status === "EM_ANALISE"
                      ? "secondary"
                      : fb.status === "ARQUIVADO"
                      ? "outline"
                      : "destructive"
                  }
                  className="text-[10px] uppercase"
                >
                  {fb.status}
                </Badge>
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
