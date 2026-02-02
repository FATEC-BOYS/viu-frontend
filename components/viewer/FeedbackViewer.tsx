"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Mic,
  Square,
  Loader2,
  X,
  Volume2,
  FileText,
  MessageCircle,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAudioRecorder, formatElapsed } from "./hooks/useAudioRecorder";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Reply = {
  id: string;
  feedback_id: string;
  autor: { id: string; nome: string | null };
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  criado_em: string;
};

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
  commentMode?: boolean;
  onCommentModeChange?: (v: boolean) => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function avatarColor(str: string): string {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-violet-500", "bg-cyan-500", "bg-pink-500", "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FeedbackViewer({
  arte,
  initialFeedbacks,
  token,
  onAskIdentity,
  viewer,
  readOnly,
  commentMode: externalCommentMode,
  onCommentModeChange,
}: Props) {
  /* — State — */
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>(initialFeedbacks);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState<"none" | "text" | "audio">("none");
  const [pin, setPin] = useState<PinPosition>(null);
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);
  const [ttsPlaying, setTtsPlaying] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [showResolved, setShowResolved] = useState(true);
  const [internalCommentMode, setInternalCommentMode] = useState(false);

  // Zoom/pan
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  // Replies per feedback
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const imgContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackListRef = useRef<HTMLUListElement>(null);

  const recorder = useAudioRecorder();

  const commentModeActive = externalCommentMode ?? internalCommentMode;
  const setCommentMode = onCommentModeChange ?? setInternalCommentMode;

  const canComment = useMemo(() => !readOnly && !!viewer?.email, [readOnly, viewer]);

  /* — Keyboard shortcut: C to toggle comment mode — */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setCommentMode(!commentModeActive);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commentModeActive, setCommentMode]);

  /* — Filtered feedbacks — */
  const visibleFeedbacks = useMemo(() => {
    if (showResolved) return feedbacks;
    return feedbacks.filter((f) => f.status !== "RESOLVIDO" && f.status !== "ARQUIVADO");
  }, [feedbacks, showResolved]);

  const positionedFeedbacks = visibleFeedbacks.filter(
    (f) => f.posicao_x != null && f.posicao_y != null
  );

  /* — Click on image to place pin — */
  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!commentModeActive || !canComment || sending !== "none") return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
  }

  /* — Zoom — */
  function handleWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setScale((s) => Math.min(5, Math.max(0.5, s + (e.deltaY > 0 ? -0.15 : 0.15))));
  }

  function zoomIn() { setScale((s) => Math.min(5, s + 0.25)); }
  function zoomOut() { setScale((s) => Math.max(0.5, s - 0.25)); }
  function resetZoom() { setScale(1); setTranslate({ x: 0, y: 0 }); }

  /* — Pan — */
  function handleMouseDown(e: React.MouseEvent) {
    if (commentModeActive) return;
    if (scale <= 1) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning.current) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - panStart.current.x),
      y: translateStart.current.y + (e.clientY - panStart.current.y),
    });
  }
  function handleMouseUp() { isPanning.current = false; }

  /* — Navigate between pins — */
  function navigatePin(dir: "prev" | "next") {
    if (positionedFeedbacks.length === 0) return;
    const curIdx = activeFeedback
      ? positionedFeedbacks.findIndex((f) => f.id === activeFeedback)
      : -1;
    let nextIdx: number;
    if (dir === "next") {
      nextIdx = curIdx + 1 >= positionedFeedbacks.length ? 0 : curIdx + 1;
    } else {
      nextIdx = curIdx - 1 < 0 ? positionedFeedbacks.length - 1 : curIdx - 1;
    }
    const target = positionedFeedbacks[nextIdx];
    setActiveFeedback(target.id);
    scrollToFeedback(target.id);
  }

  function scrollToFeedback(id: string) {
    const el = feedbackListRef.current?.querySelector(`[data-feedback-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* — Send text feedback — */
  async function handleAddComment() {
    if (!viewer?.email) { onAskIdentity(); return; }
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
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        toast.error(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      if (pin) { created.posicao_x = pin.x; created.posicao_y = pin.y; }
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

  /* — Audio — */
  async function handleStartRecording() {
    if (!viewer?.email) { onAskIdentity(); return; }
    await recorder.start();
  }

  async function handleStopRecording() {
    const blob = await recorder.stop();
    if (!blob) return;
    await uploadAudioBlob(blob);
  }

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
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        toast.error(msg);
        return;
      }

      const created = (await res.json()) as FeedbackItem;
      if (pin) { created.posicao_x = pin.x; created.posicao_y = pin.y; }
      setFeedbacks((f) => [...f, created]);
      setPin(null);
      toast.success("Áudio enviado!");
      transcribeAudioFeedback(created.id, blob);
    } catch (e) {
      console.error("[FeedbackViewer] Erro ao enviar áudio:", e);
      toast.error("Não foi possível enviar o áudio.");
    } finally {
      setSending("none");
    }
  }

  async function transcribeAudioFeedback(feedbackId: string, blob: Blob) {
    try {
      setTranscribing(true);
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!res.ok) return;
      const { text } = await res.json();
      if (!text) return;
      setFeedbacks((prev) =>
        prev.map((f) => f.id === feedbackId ? { ...f, transcricao: text, conteudo: text } : f)
      );
      toast.success("Áudio transcrito automaticamente!");
    } catch (e) {
      console.warn("[transcribe] erro:", e);
    } finally {
      setTranscribing(false);
    }
  }

  /* — TTS — */
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
      if (!res.ok) { toast.error("Falha ao gerar áudio do texto."); setTtsPlaying(null); return; }
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setTtsPlaying(null); audioRef.current = null; };
      audio.play();
    } catch (e) {
      console.error("[TTS] erro:", e);
      toast.error("Não foi possível reproduzir o áudio.");
      setTtsPlaying(null);
    }
  }, [ttsPlaying]);

  /* — Resolve / reopen feedback — */
  async function toggleResolve(fb: FeedbackItem) {
    const newStatus = fb.status === "RESOLVIDO" ? "ABERTO" : "RESOLVIDO";
    try {
      const res = await fetch(`/api/feedbacks/${fb.id}/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conteudo: newStatus === "RESOLVIDO" ? "Marcado como resolvido" : "Reaberto",
          statusAfter: newStatus,
        }),
      });
      if (!res.ok) {
        toast.error("Não foi possível alterar o status.");
        return;
      }
      setFeedbacks((prev) =>
        prev.map((f) => f.id === fb.id ? { ...f, status: newStatus } : f)
      );
      toast.success(newStatus === "RESOLVIDO" ? "Feedback resolvido!" : "Feedback reaberto.");
    } catch {
      toast.error("Erro ao alterar status.");
    }
  }

  /* — Thread / replies — */
  async function loadReplies(feedbackId: string) {
    try {
      const res = await fetch(`/api/feedbacks/${feedbackId}/respostas`);
      if (!res.ok) return;
      const data = await res.json();
      setReplies((prev) => ({ ...prev, [feedbackId]: Array.isArray(data) ? data : [] }));
    } catch {}
  }

  function toggleThread(feedbackId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(feedbackId)) {
        next.delete(feedbackId);
      } else {
        next.add(feedbackId);
        if (!replies[feedbackId]) loadReplies(feedbackId);
      }
      return next;
    });
  }

  async function sendReply(feedbackId: string) {
    const text = (replyText[feedbackId] || "").trim();
    if (!text) return;
    try {
      setReplyLoading((p) => ({ ...p, [feedbackId]: true }));
      const res = await fetch(`/api/feedbacks/${feedbackId}/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: text }),
      });
      if (!res.ok) { toast.error("Erro ao responder."); return; }
      setReplyText((p) => ({ ...p, [feedbackId]: "" }));
      await loadReplies(feedbackId);
    } catch {
      toast.error("Erro ao enviar resposta.");
    } finally {
      setReplyLoading((p) => ({ ...p, [feedbackId]: false }));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-background/80 backdrop-blur-sm text-xs gap-2">
          <div className="flex items-center gap-1.5">
            {/* Comment mode toggle */}
            <Button
              size="sm"
              variant={commentModeActive ? "default" : "outline"}
              className="h-7 text-xs gap-1"
              onClick={() => setCommentMode(!commentModeActive)}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {commentModeActive ? "Comentando" : "Comentar"}
              <kbd className="ml-1 text-[9px] opacity-60 border rounded px-1">C</kbd>
            </Button>

            {/* Filter toggle */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => setShowResolved(!showResolved)}
              title={showResolved ? "Ocultar resolvidos" : "Mostrar resolvidos"}
            >
              {showResolved ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showResolved ? "Todos" : "Abertos"}
            </Button>

            {/* Pin navigation */}
            {positionedFeedbacks.length > 0 && (
              <div className="flex items-center gap-0.5 border rounded-md px-1">
                <button onClick={() => navigatePin("prev")} className="p-0.5 hover:bg-muted rounded" aria-label="Pin anterior">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] tabular-nums px-1">
                  {activeFeedback
                    ? `${positionedFeedbacks.findIndex((f) => f.id === activeFeedback) + 1}/${positionedFeedbacks.length}`
                    : `${positionedFeedbacks.length} pins`}
                </span>
                <button onClick={() => navigatePin("next")} className="p-0.5 hover:bg-muted rounded" aria-label="Próximo pin">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="p-1 hover:bg-muted rounded" title="Zoom out" aria-label="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] tabular-nums w-8 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="p-1 hover:bg-muted rounded" title="Zoom in" aria-label="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            {scale !== 1 && (
              <button onClick={resetZoom} className="p-1 hover:bg-muted rounded" title="Reset zoom" aria-label="Reset zoom">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Image container with zoom/pan */}
        <div
          ref={imgContainerRef}
          className={`relative w-full bg-muted overflow-hidden select-none ${
            commentModeActive ? "cursor-crosshair" : scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
          onClick={handleImageClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isPanning.current ? "none" : "transform 0.2s ease",
            }}
            className="relative"
          >
            <img
              src={arte.arquivo}
              alt={arte.nome}
              className="w-full h-auto max-h-[70vh] object-contain bg-background pointer-events-none"
              draggable={false}
            />

            {/* Pin markers — speech-bubble style with avatar */}
            {positionedFeedbacks.map((f) => {
              const isActive = activeFeedback === f.id;
              const isResolved = f.status === "RESOLVIDO";
              const initials = getInitials(f.autor_nome, f.autor_email);
              const color = avatarColor(f.autor_email || f.autor_nome || f.id);

              return (
                <Tooltip key={f.id}>
                  <TooltipTrigger asChild>
                    <button
                      data-pin-id={f.id}
                      className={`absolute z-10 -translate-x-1/2 -translate-y-full group
                        transition-all duration-200 ease-out
                        ${isActive ? "scale-110 z-20" : "hover:scale-105"}
                        ${isResolved ? "opacity-50" : ""}
                        animate-in fade-in zoom-in-75 duration-300`}
                      style={{ left: `${f.posicao_x}%`, top: `${f.posicao_y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFeedback(isActive ? null : f.id);
                        scrollToFeedback(f.id);
                      }}
                    >
                      {/* Bubble body */}
                      <div className={`relative flex items-center gap-1 rounded-full px-1 py-0.5 shadow-lg border-2
                        ${isResolved
                          ? "bg-green-100 border-green-400 dark:bg-green-950 dark:border-green-600"
                          : isActive
                          ? "bg-blue-100 border-blue-500 dark:bg-blue-950 dark:border-blue-400"
                          : "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                        }`}
                      >
                        {/* Avatar circle */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${color}`}>
                          {isResolved ? <Check className="h-3 w-3" /> : initials}
                        </div>
                        {/* Expand on active */}
                        {isActive && f.conteudo && f.conteudo !== "Áudio" && (
                          <span className="text-[10px] max-w-[120px] truncate pr-1">
                            {f.conteudo}
                          </span>
                        )}
                      </div>
                      {/* Tail / pointer */}
                      <div className={`w-2.5 h-2.5 rotate-45 -mt-1.5 ml-[calc(50%-5px)]
                        ${isResolved
                          ? "bg-green-100 border-b-2 border-r-2 border-green-400 dark:bg-green-950 dark:border-green-600"
                          : isActive
                          ? "bg-blue-100 border-b-2 border-r-2 border-blue-500 dark:bg-blue-950 dark:border-blue-400"
                          : "bg-white border-b-2 border-r-2 border-gray-300 dark:bg-gray-800 dark:border-gray-600"
                        }`}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs font-medium">{f.autor_nome || f.autor_email || "Anônimo"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {f.tipo === "AUDIO" ? (f.transcricao || "Áudio") : (f.conteudo || "(sem texto)")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Current pin being placed */}
            {pin && (
              <div
                className="absolute z-30 -translate-x-1/2 -translate-y-full animate-in zoom-in-50 fade-in duration-200"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="flex items-center gap-1 rounded-full px-1.5 py-0.5 shadow-lg border-2 bg-red-50 border-red-400 dark:bg-red-950 dark:border-red-500">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                    +
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rotate-45 -mt-1.5 ml-[calc(50%-5px)] bg-red-50 border-b-2 border-r-2 border-red-400 dark:bg-red-950 dark:border-red-500" />
              </div>
            )}
          </div>
        </div>

        {/* Pin indicator */}
        {pin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 border-b text-xs text-blue-700 dark:text-blue-300">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>
              Comentário posicionado em ({pin.x.toFixed(0)}%, {pin.y.toFixed(0)}%)
            </span>
            <button onClick={() => setPin(null)} className="ml-auto hover:text-red-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Comment box */}
        <div className="border-t p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Feedbacks
              <span className="ml-1.5 text-xs text-muted-foreground">({visibleFeedbacks.length})</span>
            </h3>
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

          {/* Input area */}
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
          <ul ref={feedbackListRef} className="mt-2 space-y-3">
            {visibleFeedbacks.map((fb) => {
              const isActive = activeFeedback === fb.id;
              const isResolved = fb.status === "RESOLVIDO";
              const isExpanded = expandedThreads.has(fb.id);
              const fbReplies = replies[fb.id] || [];
              const initials = getInitials(fb.autor_nome, fb.autor_email);
              const color = avatarColor(fb.autor_email || fb.autor_nome || fb.id);

              return (
                <li
                  key={fb.id}
                  data-feedback-id={fb.id}
                  className={`rounded-lg border p-3 transition-all duration-200 ${
                    isActive ? "ring-2 ring-blue-400 shadow-md" : ""
                  } ${isResolved ? "opacity-60 bg-muted/30" : ""}`}
                  onMouseEnter={() => fb.posicao_x != null ? setActiveFeedback(fb.id) : undefined}
                  onMouseLeave={() => setActiveFeedback(null)}
                  onClick={() => {
                    if (fb.posicao_x != null) setActiveFeedback(fb.id);
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${color}`}>
                        {initials}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {fb.autor_nome || fb.autor_email || "Anônimo"}
                      </span>
                      {fb.posicao_x != null && (
                        <MessageCircle className="h-3 w-3 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Resolve button */}
                      {!readOnly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleResolve(fb); }}
                              className={`p-1 rounded transition-colors ${
                                isResolved
                                  ? "text-green-500 hover:text-green-700 bg-green-50 dark:bg-green-950"
                                  : "text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950"
                              }`}
                            >
                              {isResolved ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {isResolved ? "Reabrir feedback" : "Marcar como resolvido"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <span suppressHydrationWarning className="text-[10px] text-muted-foreground">
                        {new Date(fb.criado_em).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  {fb.tipo === "AUDIO" ? (
                    <div className="mt-2 space-y-1.5">
                      <audio src={fb.arquivo || ""} controls className="w-full" />
                      {(fb.transcricao || fb.conteudo) && fb.conteudo !== "Áudio" && (
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
                      <p className={`text-sm whitespace-pre-wrap flex-1 ${isResolved ? "line-through" : ""}`}>
                        {fb.conteudo}
                      </p>
                      {fb.conteudo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTTS(fb.id, fb.conteudo); }}
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

                  {/* Footer: badge + thread toggle */}
                  <div className="mt-2 flex items-center justify-between">
                    <Badge
                      variant={
                        fb.status === "RESOLVIDO" ? "default"
                          : fb.status === "EM_ANALISE" ? "secondary"
                          : fb.status === "ARQUIVADO" ? "outline"
                          : "destructive"
                      }
                      className="text-[10px] uppercase"
                    >
                      {fb.status}
                    </Badge>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleThread(fb.id); }}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {isExpanded ? "Ocultar respostas" : "Respostas"}
                      {fbReplies.length > 0 && ` (${fbReplies.length})`}
                    </button>
                  </div>

                  {/* Thread / Replies */}
                  {isExpanded && (
                    <div className="mt-3 pl-3 border-l-2 border-muted space-y-2">
                      {fbReplies.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhuma resposta ainda.</p>
                      )}
                      {fbReplies.map((r) => (
                        <div key={r.id} className="text-xs">
                          <span className="font-medium">{r.autor?.nome ?? "—"}</span>
                          <span className="text-muted-foreground ml-1.5" suppressHydrationWarning>
                            {new Date(r.criado_em).toLocaleString()}
                          </span>
                          <p className="text-muted-foreground mt-0.5">{r.conteudo}</p>
                        </div>
                      ))}
                      {/* Reply input */}
                      {!readOnly && (
                        <div className="flex gap-1.5 mt-1">
                          <Input
                            className="h-7 text-xs"
                            placeholder="Responder..."
                            value={replyText[fb.id] || ""}
                            onChange={(e) => setReplyText((p) => ({ ...p, [fb.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") sendReply(fb.id); }}
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => sendReply(fb.id)}
                            disabled={replyLoading[fb.id] || !(replyText[fb.id] || "").trim()}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {visibleFeedbacks.length === 0 && (
              <li className="text-sm text-muted-foreground">
                {showResolved ? "Nenhum feedback ainda." : "Nenhum feedback aberto."}
              </li>
            )}
          </ul>
        </div>
      </div>
    </TooltipProvider>
  );
}
