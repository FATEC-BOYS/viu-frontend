// app/l/[token]/viewer/FeedbackViewer.tsx
"use client";

import { useRef, useState, useMemo } from "react";
import clsx from "clsx";
import { saveFeedback } from "../_actions"; // server action abaixo

type Arte = {
  id: string;
  nome: string; 
  arquivo: string; // URL preview
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
  status: "ABERTO"|"EM_ANALISE"|"RESOLVIDO"|"ARQUIVADO";
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

  const canPin = !readOnly;

  function clientToImageCoords(e: React.MouseEvent) {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return null;

    const rect = img.getBoundingClientRect();
    const xAbs = e.clientX - rect.left;
    const yAbs = e.clientY - rect.top;

    const clampedX = Math.max(0, Math.min(xAbs, rect.width));
    const clampedY = Math.max(0, Math.min(yAbs, rect.height));

    const xRel = rect.width > 0 ? clampedX / rect.width : 0;
    const yRel = rect.height > 0 ? clampedY / rect.height : 0;

    // absolutos em px considerando o tamanho exibido (não o natural)
    return {
      rel: { x: Number(xRel.toFixed(6)), y: Number(yRel.toFixed(6)) },
      abs: { x: Math.round(clampedX), y: Math.round(clampedY) },
    };
  }

  async function handleClick(e: React.MouseEvent) {
    if (!canPin) return;
    const coords = clientToImageCoords(e);
    if (!coords) return;

    const conteudo = window.prompt("Descreva o feedback (objetivo, impacto e sugestão):");
    if (!conteudo) return;

    const payload = {
      token,
      arteId: arte.id,
      conteudo,
      tipo: "TEXTO" as const,
      posicao_x: coords.rel.x,
      posicao_y: coords.rel.y,
      posicao_x_abs: coords.abs.x,
      posicao_y_abs: coords.abs.y,
    };

    const created = await saveFeedback(payload);
    if (created) setFeedbacks((prev) => [created, ...prev]);
  }

  // posição do pin: usa % para manter alinhado mesmo com zoom/resize
  function pinStyle(f: Feedback) {
    const left = (Number(f.posicao_x ?? 0) * 100).toFixed(4) + "%";
    const top = (Number(f.posicao_y ?? 0) * 100).toFixed(4) + "%";
    return { left, top, transform: "translate(-50%, -100%)" };
  }

  return (
    <div className="border rounded-xl p-3 bg-white">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="text-sm text-muted-foreground">
          Clique na arte para marcar um ponto e deixar feedback.
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>–</button>
          <div className="text-sm w-10 text-center">{Math.round(zoom * 100)}%</div>
          <button className="px-2 py-1 border rounded" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>+</button>
          <button className="px-2 py-1 border rounded" onClick={() => setZoom(1)}>Fit</button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-auto max-h-[70vh] overflow-auto bg-neutral-50 rounded-lg flex items-center justify-center"
        style={{ padding: 12 }}
      >
        <div
          className="relative"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <img
            ref={imgRef}
            src={arte.arquivo}
            alt={arte.nome}
            className="max-w-[min(80vw,960px)] h-auto rounded shadow"
            onClick={handleClick}
            draggable={false}
          />

          {/* pins */}
          {feedbacks.map((f, i) => (
            (f.posicao_x != null && f.posicao_y != null) && (
              <div
                key={f.id}
                className={clsx(
                  "absolute z-10 -translate-x-1/2 -translate-y-full",
                  "px-2 py-1 text-xs rounded-full bg-black/80 text-white"
                )}
                style={pinStyle(f)}
                title={f.conteudo}
              >
                {feedbacks.length - i}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
