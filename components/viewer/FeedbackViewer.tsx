"use client";

import Link from "next/link";
import { rotuloFeedback } from "@/lib/rotulos";
import { api } from "@/lib/api";
import { podeComentar } from "@/lib/viewerApi";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

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
  Maximize2,
  RotateCcw,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { paraFeedbackItem, type FeedbackItem } from "./types";
// Reexportado porque o tipo nasceu aqui e há quem importe daqui; some
// em runtime, então não arrasta nada do módulo cliente junto.
export type { FeedbackItem };
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
  viewer?: Viewer | null;
  readOnly?: boolean;
  commentMode?: boolean;
  onCommentModeChange?: (v: boolean) => void;
  /**
   * Há sessão? Não é o mesmo que `canComment`.
   *
   * Sem sessão, a área de escrita não fica desabilitada: ela NÃO EXISTE.
   * Campo desabilitado ainda é campo — está no DOM, aceita preenchimento por
   * script e sugere que existe um caminho de escrita sem conta. Aqui não
   * existe: `POST /links/:token/feedbacks` e `POST /feedbacks` passam os dois
   * por `authenticate`, e o autor sai da sessão. A tela passa a dizer a mesma
   * coisa que o servidor: sem conta, só leitura e uma porta para entrar.
   */
  temSessao?: boolean;
  /** Para onde mandar quem precisa entrar — já com a volta para esta arte. */
  urlDeLogin?: string | null;
  /** Para onde mandar quem ainda não tem conta — também com a volta. */
  urlDeCadastro?: string | null;
  /** Painel de aprovações, quando o visitante tem conta. Entra como aba da trilha. */
  aprovacoes?: React.ReactNode;
  /**
   * Barra "é a sua vez", quando há decisão pendente de quem está olhando.
   *
   * Entra acima da alça da gaveta e só no celular: no desktop a coluna lateral
   * já mostra o painel inteiro. Vem de fora porque quem sabe se há pendência é
   * o ViewerShell — este componente não fala com a rota de aprovações.
   */
  decisao?: React.ReactNode;
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
  viewer,
  readOnly,
  commentMode: externalCommentMode,
  onCommentModeChange,
  temSessao = false,
  urlDeLogin = null,
  urlDeCadastro = null,
  aprovacoes = null,
  decisao = null,
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
  /*
   * A imagem não carregou.
   *
   * A moldura só ganha tamanho pelo `onLoad` — a tabela de artes não guarda
   * dimensão —, então uma imagem que falha deixa uma caixa de 0x0. A barra
   * seguia dizendo "Clique na arte" e o clique não fazia nada: tela morta sem
   * uma palavra de explicação. Dizer o que houve é o mínimo; marcar um ponto
   * numa imagem que não apareceu não teria sentido de qualquer forma.
   */
  const [imagemFalhou, setImagemFalhou] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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

  /*
   * A imagem pode ter falhado ANTES de o React pendurar o `onError`.
   *
   * O HTML vem do servidor e o navegador começa a baixar na hora; se o erro
   * acontece antes da hidratação, o evento já passou e o handler nunca roda —
   * foi o que aconteceu ao testar com a URL assinada devolvendo 403. O que
   * sobra para saber é o estado do próprio elemento: `complete` com
   * `naturalWidth` zero significa que não veio imagem nenhuma.
   */
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth === 0) setImagemFalhou(true);
  }, [arte.arquivo]);

  const recorder = useAudioRecorder();

  /*
   * A proporção da arte, que dá à moldura o tamanho exato da imagem.
   *
   * Os pins são guardados em porcentagem, e quem define o sistema de
   * coordenadas é a caixa da imagem. Antes a imagem era `w-full h-auto`, então
   * caixa e container coincidiam por acaso. Num canvas centralizado deixam de
   * coincidir — sobram faixas vazias dos lados — e medir o clique no container
   * jogaria o pin para outro lugar. Com `aspect-ratio` a moldura encolhe junto
   * com a imagem e as duas continuam sendo a mesma caixa.
   */
  const [razao, setRazao] = useState<number | null>(
    arte.largura_px && arte.altura_px ? arte.largura_px / arte.altura_px : null,
  );
  /*
   * O tamanho da arte na tela, em pixels.
   *
   * Tentar resolver isto só com CSS não funciona: `aspect-ratio` precisa de uma
   * dimensão definida para derivar a outra, e uma moldura que encolhe junto com
   * a imagem não tem nenhuma das duas — o resultado é uma caixa de altura zero.
   * E `max-height: 100%` dentro de um pai de altura automática é ignorado pela
   * própria regra de porcentagem.
   *
   * Medir a área e calcular o encaixe resolve de vez, e de quebra é o que faz o
   * "encaixar na tela" ser verdade em vez de só voltar o zoom para 100%.
   */
  const areaRef = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState<{ w: number; h: number } | null>(null);
  const [trilhaAberta, setTrilhaAberta] = useState(false);
  const [abaTrilha, setAbaTrilha] = useState<"comentarios" | "aprovacoes">("comentarios");

  const commentModeActive = externalCommentMode ?? internalCommentMode;
  const setCommentMode = onCommentModeChange ?? setInternalCommentMode;

  const canComment = useMemo(
    () => temSessao && !readOnly && !!viewer?.email,
    [temSessao, readOnly, viewer],
  );

  /* — Encaixe da arte na área disponível — */
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !razao) return;

    function medir() {
      const el = areaRef.current;
      if (!el || !razao) return;
      const dispW = el.clientWidth;
      const dispH = el.clientHeight;
      if (dispW <= 0 || dispH <= 0) return;
      // Cabe pela largura ou pela altura — o que apertar primeiro manda.
      const w = Math.min(dispW, dispH * razao);
      setCaixa({ w, h: w / razao });
    }

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(area);
    return () => observador.disconnect();
  }, [razao]);

  /* — Keyboard shortcut: C to toggle comment mode — */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      /*
       * Escape vem ANTES da guarda de campo de texto, de propósito.
       *
       * A guarda existe para a tecla `C` não ligar o modo comentário no meio
       * de uma palavra. Escape é o contrário: é escrevendo que se desiste, e
       * engoli-lo ali deixava a pessoa sem saída com o cursor no campo.
       */
      if (e.key === "Escape") {
        if (pin) { setPin(null); setComment(""); return; }
        if (commentModeActive) setCommentMode(false);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        alternarModoComentario();
        return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commentModeActive, setCommentMode, pin]);

  /*
   * Sair do modo comentário leva a marcação junto.
   *
   * Antes o botão só alternava o modo: a marcação continuava pendurada,
   * invisível na barra, e grudava no próximo comentário que a pessoa
   * escrevesse sem querer marcar nada.
   */
  function alternarModoComentario() {
    if (commentModeActive) { setPin(null); setComment(""); }
    setCommentMode(!commentModeActive);
  }

  /* — Filtered feedbacks — */
  const visibleFeedbacks = useMemo(() => {
    if (showResolved) return feedbacks;
    return feedbacks.filter((f) => f.status !== "RESOLVIDO");
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
    // Comentar exige conta: Feedback.autorId é obrigatório e o autor sai do
    // token. Ler pelo link segue público.
    if (!podeComentar()) {
      toast.error("Entre na sua conta para comentar nesta arte.");
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

      // O backend responde no envelope { message, data, success } — sem
      // desembrulhar, o envelope inteiro entrava na lista como se fosse o
      // feedback, e a tela morria lendo campo de um objeto que não existia.
      const corpo = await res.json();
      const created = paraFeedbackItem(corpo?.data ?? corpo);
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

      // O backend responde no envelope { message, data, success } — sem
      // desembrulhar, o envelope inteiro entrava na lista como se fosse o
      // feedback, e a tela morria lendo campo de um objeto que não existia.
      const corpo = await res.json();
      const created = paraFeedbackItem(corpo?.data ?? corpo);
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
    // Resolver não é uma resposta na thread: o backend guarda o estado em
    // resolvidoEm e expõe /resolver e /reabrir.
    const resolvido = fb.status === "RESOLVIDO";
    const acao = resolvido ? "reabrir" : "resolver";
    const novo = resolvido ? "ABERTO" : "RESOLVIDO";
    setFeedbacks((prev) =>
      prev.map((x) => (x.id === fb.id ? { ...x, status: novo } : x)),
    );
    try {
      await api.put(`/feedbacks/${fb.id}/${acao}`, {});
    } catch {
      toast.error("Não foi possível alterar o status do comentário.");
      setFeedbacks((prev) =>
        prev.map((x) => (x.id === fb.id ? { ...x, status: fb.status } : x)),
      );
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

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const abertos = visibleFeedbacks.length;

  /* A barra flutua sobre a arte em vez de ocupar uma faixa acima dela: numa
     mesa de trabalho o controle atrapalha o menos possível o que se olha. */
  const barra = (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-background/90 p-1 shadow-lg backdrop-blur">
        {/* Sem sessão o botão não fica cinza: ele sai. Marcar ponto na arte só
            serve para escrever, e escrever exige conta. */}
        {temSessao && (
          <>
            <Button
              size="sm"
              variant={commentModeActive ? "default" : "ghost"}
              className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs"
              onClick={alternarModoComentario}
              /* Sem imagem não há onde marcar: a moldura tem tamanho zero e o
                 clique cai no vazio. Melhor o botão dizer isso. */
              disabled={!canComment || imagemFalhou}
              title={imagemFalhou ? "A arte não carregou — não há onde marcar" : undefined}
            >
              <MessageCircle className="h-4 w-4" />
              {commentModeActive ? "Clique na arte" : "Comentar"}
              <kbd className="ml-0.5 hidden rounded border px-1 text-[9px] opacity-60 lg:inline">C</kbd>
            </Button>

            <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
          </>
        )}

        <button onClick={zoomOut} className="shrink-0 rounded-full p-1.5 hover:bg-muted" title="Diminuir" aria-label="Diminuir zoom">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-10 shrink-0 text-center text-[11px] tabular-nums">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="shrink-0 rounded-full p-1.5 hover:bg-muted" title="Aumentar" aria-label="Aumentar zoom">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={resetZoom} className="shrink-0 rounded-full p-1.5 hover:bg-muted" title="Encaixar na tela" aria-label="Encaixar na tela">
          <Maximize2 className="h-4 w-4" />
        </button>

        {imagemFalhou && (
          <span className="shrink-0 whitespace-nowrap px-2 text-[11px] text-destructive">
            A arte não carregou
          </span>
        )}

        {positionedFeedbacks.length > 0 && (
          <>
            <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />
            <button onClick={() => navigatePin("prev")} className="shrink-0 rounded-full p-1.5 hover:bg-muted" aria-label="Marcação anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
              {activeFeedback
                ? `${positionedFeedbacks.findIndex((f) => f.id === activeFeedback) + 1}/${positionedFeedbacks.length}`
                : `${positionedFeedbacks.length} na arte`}
            </span>
            <button onClick={() => navigatePin("next")} className="shrink-0 rounded-full p-1.5 hover:bg-muted" aria-label="Próxima marcação">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  /*
   * O compositor é UM só, montado em dois lugares.
   *
   * Com marcação ele nasce no pin: é para lá que a pessoa está olhando, e é o
   * que qualquer ferramenta de revisão faz. Sem marcação segue no rodapé da
   * trilha, que é onde cabe um comentário sobre a arte inteira.
   *
   * Escrever dois seria mais fácil e garantiria divergência: dois campos, dois
   * gravadores, dois caminhos de envio para manter iguais para sempre.
   */
  const compositor = (
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
                <div className="flex items-center gap-2">
                  {/* Desistir precisa estar ao lado de enviar. Antes a única
                      saída era um X no rodapé da trilha — que no celular é
                      gaveta fechada, e aí não havia saída nenhuma. */}
                  {pin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPin(null); setComment(""); }}
                      disabled={sending !== "none"}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    size={pin ? "sm" : "default"}
                    onClick={handleAddComment}
                    disabled={!canComment || !comment.trim() || sending !== "none"}
                  >
                    {sending === "text" ? "Enviando..." : pin ? "Enviar" : "Enviar comentário"}
                  </Button>
                </div>
              </div>
              {recorder.permissionError && (
                <p className="text-xs text-destructive mt-1">{recorder.permissionError}</p>
              )}
            </div>
  );

  const porta = (
              <div className="rounded-lg border border-dashed p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Comentar nesta arte precisa de conta.
                </p>
                {/*
                  Duas portas, não uma.
                  
                  Só o login estava aqui, e login é porta para quem JÁ tem
                  chave. Quem recebe o link no WhatsApp e nunca usou o VIU lia
                  "precisa de conta" e não tinha para onde ir. O servidor não
                  exige vínculo com o projeto — "quem autorizou foi o token" —,
                  então criar conta ali mesmo e voltar para a arte sempre
                  funcionou; faltava oferecer.
                */}
                <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
                  <Button asChild size="sm">
                    <Link href={urlDeCadastro ?? "/cadastro"}>Criar conta</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={urlDeLogin ?? "/login"}>Já tenho conta</Link>
                  </Button>
                </div>
              </div>
  );

  const canvas = (
    <div
      ref={imgContainerRef}
      className={`relative min-h-0 flex-1 select-none overflow-hidden bg-canvas lg:h-full ${
        commentModeActive ? "cursor-crosshair" : scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div ref={areaRef} className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        {/* A moldura É a caixa da imagem — ver o comentário de `caixa`. */}
        <div
          data-arte-moldura
          className="relative shadow-2xl ring-1 ring-black/10"
          style={{
            width: caixa?.w,
            height: caixa?.h,
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isPanning.current ? "none" : "transform 0.2s ease",
          }}
          onClick={handleImageClick}
        >
          <img
            src={arte.arquivo}
            alt={arte.nome}
            onLoad={(e) => {
              const el = e.currentTarget;
              if (el.naturalWidth && el.naturalHeight) {
                setRazao(el.naturalWidth / el.naturalHeight);
                setImagemFalhou(false);
              }
            }}
            ref={imgRef}
            onError={() => setImagemFalhou(true)}
            className="block h-full w-full"
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
                        : "bg-popover border-border"
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
                        : "bg-popover border-b-2 border-r-2 border-border"
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
              <div className="flex items-center gap-1 rounded-full px-1.5 py-0.5 shadow-lg border-2 bg-red-50 dark:bg-red-950/40 border-red-400 dark:bg-red-950 dark:border-red-500">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white">
                  +
                </div>
              </div>
              <div className="w-2.5 h-2.5 rotate-45 -mt-1.5 ml-[calc(50%-5px)] bg-red-50 dark:bg-red-950/40 border-b-2 border-r-2 border-red-400 dark:bg-red-950 dark:border-red-500" />
            </div>
          )}

          {/*
            O compositor, ancorado no ponto marcado.

            Ancorar pelo lado oposto quando a marcação cai na metade direita ou
            inferior é o que impede o cartão de sair pela borda — o canvas
            recorta o que passa, e um compositor recortado não tem como ser
            enviado nem cancelado.

            A escala inversa existe porque o cartão mora dentro da moldura, que
            é quem recebe o zoom: sem ela o texto dobraria de tamanho junto com
            a arte. E as duas paradas de propagação impedem que escrever vire
            mover o pin (clique) ou arrastar a arte (mousedown).
          */}
          {pin && temSessao && (() => {
            /*
             * O cartão é preso à MOLDURA, não ao ponto.
             *
             * Ancorá-lo só pelo lado da marcação estourava a borda: 288px
             * ancorados a 60% de uma moldura de 362px começam em -55px, e num
             * telefone "Escreva um comentário" aparecia cortado como "eva um
             * comentário", com o "Gravar áudio" pela metade. Centralizar no pin
             * e depois prender nas bordas mantém o cartão inteiro e ainda ao
             * lado da marcação.
             *
             * Na vertical basta trocar de lado: na metade de baixo o cartão
             * sobe, e aí nunca passa do rodapé.
             */
            const larguraMoldura = caixa?.w ?? 0;
            const largura = Math.min(288, larguraMoldura || 288);
            const esquerda = Math.max(
              0,
              Math.min(
                (pin.x / 100) * larguraMoldura - largura / 2,
                larguraMoldura - largura,
              ),
            );
            const acima = pin.y > 55;
            return (
              <div
                className="absolute z-40 rounded-lg border bg-background p-2.5 shadow-xl"
                style={{
                  left: esquerda,
                  width: largura,
                  ...(acima ? { bottom: `${100 - pin.y}%` } : { top: `${pin.y}%` }),
                  /* O cartão mora dentro da moldura, que é quem recebe o zoom:
                     sem a escala inversa o texto dobraria junto com a arte. */
                  transform: `scale(${1 / scale})`,
                  transformOrigin: `left ${acima ? "bottom" : "top"}`,
                }}
                /* Escrever não pode virar mover o pin (clique) nem arrastar a
                   arte (mousedown). */
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {compositor}
              </div>
            );
          })()}
        </div>
      </div>

      {barra}
    </div>
  );

  const trilha = (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {aprovacoes && (
        <div className="flex shrink-0 gap-1 border-b p-2">
          {(["comentarios", "aprovacoes"] as const).map((aba) => (
            <button
              key={aba}
              onClick={() => setAbaTrilha(aba)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                abaTrilha === aba ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {aba === "comentarios" ? "Comentários" : "Aprovações"}
            </button>
          ))}
        </div>
      )}

      {aprovacoes && abaTrilha === "aprovacoes" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{aprovacoes}</div>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
              Comentários <span className="tabular-nums">({abertos})</span>
            </h2>
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              title={showResolved ? "Esconder resolvidos" : "Mostrar resolvidos"}
            >
              {showResolved ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showResolved ? "Todos" : "Abertos"}
            </button>
          </div>

          {/* A lista rola e o campo de escrever fica ancorado embaixo, como em
              qualquer conversa: antes o campo vinha primeiro e empurrava os
              comentários para fora da vista. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
                                    ? "text-green-500 hover:text-green-700 bg-green-50 dark:bg-green-950/40 dark:bg-green-950"
                                    : "text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:bg-green-950/40 dark:hover:bg-green-950"
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
                        <span
                          className="text-[10px] text-muted-foreground"
                          title={
                            fb.versao_numero == null
                              ? "Comentário anterior ao registro de versão"
                              : `Feito sobre a versão ${fb.versao_numero}`
                          }
                        >
                          {fb.versao_numero == null ? "sem versão" : `v${fb.versao_numero}`}
                        </span>
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
                        variant={fb.status === "RESOLVIDO" ? "default" : "secondary"}
                        className="text-[10px] uppercase"
                      >
                        {rotuloFeedback(fb.status)}
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
                  {showResolved ? "Nenhum comentário ainda." : "Nenhum comentário em aberto."}
                </li>
              )}
            </ul>
          </div>

          <div className="shrink-0 space-y-2 border-t p-3">
            {!temSessao ? (
              porta
            ) : pin ? (
              /* Com marcação o compositor está sobre a arte, ao lado do pin —
                 repeti-lo aqui daria dois campos disputando o mesmo texto. */
              <p className="text-center text-xs text-muted-foreground">
                Escrevendo na marcação, sobre a arte.
              </p>
            ) : (
              compositor
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {/* Desktop: arte e trilha lado a lado. Celular: arte em cima e a trilha
          numa gaveta, para a arte não virar uma tarja no topo de um formulário. */}
      <div className="flex h-full min-h-0 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        {canvas}

        <aside className="hidden min-h-0 border-l lg:flex lg:h-full lg:flex-col">{trilha}</aside>

        {decisao}

        {/* A alça da gaveta, só no celular. */}
        <button
          onClick={() => setTrilhaAberta(true)}
          className="flex shrink-0 items-center justify-between gap-2 border-t bg-card px-4 py-3 text-sm lg:hidden"
        >
          <span className="flex items-center gap-2 font-medium">
            <MessageCircle className="h-4 w-4" />
            Comentários
            <span className="tabular-nums text-muted-foreground">({abertos})</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {canComment ? "toque para escrever" : "toque para ler"}
          </span>
        </button>

        <Drawer open={trilhaAberta} onOpenChange={setTrilhaAberta}>
          {/* `DrawerContent` vem como `grid gap-4 p-6`: a grade dava uma faixa
              vazia acima do conteúdo e o respiro interno brigava com a trilha,
              que já tem o próprio espaçamento. Coluna flex e sem padding. */}
          <DrawerContent className="flex h-[80dvh] flex-col gap-0 p-0 lg:hidden">
            <DrawerTitle className="sr-only">Comentários da arte</DrawerTitle>
            <div className="min-h-0 flex-1 overflow-hidden">{trilha}</div>
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
