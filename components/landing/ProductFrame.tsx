'use client'

import { Mic } from 'lucide-react'

/**
 * Representação abstrata do produto: uma arte com pontos marcados e a coluna
 * de comentários ao lado.
 *
 * Propositalmente sem texto nem nomes — são formas. Um mock com conteúdo
 * inventado envelhece mal e passa a parecer dado real de alguém.
 */

const ALTURAS_ONDA = [7, 12, 9, 16, 11, 18, 8, 14, 10, 6, 13, 9]

function LinhaComentario({ comAudio = false }: { comAudio?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <span aria-hidden className="mt-0.5 size-6 shrink-0 rounded-full bg-foreground/10" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span aria-hidden className="block h-2 w-16 rounded-full bg-foreground/15" />
        {comAudio ? (
          <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/60 px-2 py-1.5">
            <Mic aria-hidden className="size-3 shrink-0 text-primary" />
            <span aria-hidden className="flex items-end gap-[2px]">
              {ALTURAS_ONDA.map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-[2px] rounded-full bg-primary/45"
                />
              ))}
            </span>
          </span>
        ) : (
          <>
            <span aria-hidden className="block h-2 w-full rounded-full bg-foreground/8" />
            <span aria-hidden className="block h-2 w-3/5 rounded-full bg-foreground/8" />
          </>
        )}
      </div>
    </div>
  )
}

function Pino({
  numero,
  className,
}: {
  numero: number
  className: string
}) {
  return (
    <span
      aria-hidden
      className={`absolute grid size-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-4 ring-primary/15 ${className}`}
    >
      {numero}
    </span>
  )
}

export default function ProductFrame() {
  return (
    <div
      role="img"
      aria-label="Ilustração da interface do VIU: uma arte com dois pontos de comentário marcados e a coluna de feedbacks ao lado, um deles em áudio."
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_40px_-24px_rgba(0,0,0,0.25)]"
    >
      <div aria-hidden className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
        <span className="size-2 rounded-full bg-foreground/10" />
        <span className="size-2 rounded-full bg-foreground/10" />
        <span className="size-2 rounded-full bg-foreground/10" />
      </div>

      <div className="grid sm:grid-cols-[1fr_240px]">
        {/* Área da arte */}
        <div className="relative aspect-[4/3] bg-muted/40 p-6 sm:aspect-auto sm:min-h-[300px]">
          <div className="relative h-full w-full rounded-lg border border-border/70 bg-background">
            <Pino numero={1} className="left-[22%] top-[28%]" />
            <Pino numero={2} className="left-[64%] top-[62%]" />
          </div>
        </div>

        {/* Coluna de feedbacks */}
        <div className="space-y-4 border-t border-border/60 p-5 sm:border-l sm:border-t-0">
          <LinhaComentario />
          <LinhaComentario comAudio />
          <LinhaComentario />
        </div>
      </div>
    </div>
  )
}
