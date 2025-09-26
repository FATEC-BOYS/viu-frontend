"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { createGuestUser, saveFeedback } from "../_actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Arte = {
  id: string;
  nome: string;
  arquivo: string;
  largura_px?: number | null;
  altura_px?: number | null;
};

type Feedback = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  posicao_x: number | null;
  posicao_y: number | null;
  posicao_x_abs: number | null;
  posicao_y_abs: number | null;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
  criado_em: string;
  autor_id: string;
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks);
  const [zoom, setZoom] = useState(1);

  // composer
  const [open, setOpen] = useState(false);
  const [composer, setComposer] = useState({
    xRel: 0,
    yRel: 0,
    xAbs: 0,
    yAbs: 0,
    text: "",
  });
  const [guest, setGuest] = useState({ nome: "", email: "" });

  const canPin = !readOnly;

  function toImageCoords(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const xAbs = e.clientX - rect.left;
    const yAbs = e.clientY - rect.top;
    const cx = Math.max(0, Math.min(rect.width, xAbs));
    const cy = Math.max(0, Math.min(rect.height, yAbs));
    const xRel = rect.width > 0 ? cx / rect.width : 0;
    const yRel = rect.height > 0 ? cy / rect.height : 0;
    return {
      rel: { x: Number(xRel.toFixed(6)), y: Number(yRel.toFixed(6)) },
      abs: { x: Math.round(cx), y: Math.round(cy) },
    };
  }

  async function ensureAuthorId(): Promise<string | null> {
    const k = "viu-author-id";
    const existing = localStorage.getItem(k);
    if (existing) return existing;

    if (!guest.nome.trim() || !guest.email.trim()) {
      toast.error("Informe nome e e-mail para comentar.");
      return null;
    }
    const created = await createGuestUser({ nome: guest.nome.trim(), email: guest.email.trim() });
    if (!created) {
      toast.error("Não foi possível criar seu perfil. Tente novamente.");
      return null;
    }
    localStorage.setItem(k, created.id);
    return created.id;
  }

  function pinStyle(f: { posicao_x: number | null; posicao_y: number | null }) {
    const left = (Number(f.posicao_x ?? 0) * 100).toFixed(4) + "%";
    const top = (Number(f.posicao_y ?? 0) * 100).toFixed(4) + "%";
    return { left, top, transform: "translate(-50%, -100%)" };
    // usando % para acompanhar zoom/resize
  }

  async function handleImageClick(e: React.MouseEvent) {
    if (!canPin) return;
    const coords = toImageCoords(e);
    if (!coords) return;
    setComposer({
      xRel: coords.rel.x,
      yRel: coords.rel.y,
      xAbs: coords.abs.x,
      yAbs: coords.abs.y,
      text: "",
    });
    setOpen(true);
  }

  async function submitFeedback() {
    const authorId = await ensureAuthorId();
    if (!authorId) return;

    const payload = {
      token,
      arteId: arte.id,
      conteudo: composer.text.trim(),
      tipo: "TEXTO" as const,
      posicao_x: composer.xRel,
      posicao_y: composer.yRel,
      posicao_x_abs: composer.xAbs,
      posicao_y_abs: composer.yAbs,
      authorId,
    };
    const created = await saveFeedback(payload);
    if (created) {
      setFeedbacks((prev) => [created as Feedback, ...prev]);
      toast.success("Feedback enviado. Valeu!");
      setOpen(false);
    } else {
      toast.error("Falha ao salvar. Tente novamente.");
    }
  }

  return (
    <div className="border rounded-2xl p-3 bg-white">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="text-sm text-muted-foreground">
          Clique na arte para marcar um ponto e comentar.
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>–</Button>
          <div className="text-sm w-10 text-center">{Math.round(zoom * 100)}%</div>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>+</Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}>Fit</Button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto max-h-[70vh] overflow-auto bg-neutral-50 rounded-xl flex items-center justify-center p-3"
      >
        <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <img
            ref={imgRef}
            src={arte.arquivo}
            alt={arte.nome}
            className="max-w-[min(80vw,960px)] h-auto rounded-lg shadow"
            onClick={handleImageClick}
            draggable={false}
          />

          {feedbacks.map((f, i) =>
            f.posicao_x != null && f.posicao_y != null ? (
              <div
                key={f.id}
                className={clsx(
                  "absolute z-10 -translate-x-1/2 -translate-y-full",
                  "px-2 py-1 text-xs rounded-full bg-black/80 text-white shadow"
                )}
                style={pinStyle(f)}
                title={f.conteudo}
              >
                {feedbacks.length - i}
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Composer elegante */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Novo feedback</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Seu nome"
                value={guest.nome}
                onChange={(e) => setGuest((g) => ({ ...g, nome: e.target.value }))}
              />
              <Input
                placeholder="Seu e-mail"
                type="email"
                value={guest.email}
                onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Descreva o problema, impacto e sugestão…"
              rows={4}
              value={composer.text}
              onChange={(e) => setComposer((c) => ({ ...c, text: e.target.value }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submitFeedback} disabled={!composer.text.trim()}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
