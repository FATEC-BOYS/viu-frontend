'use client'

import { Check, Mic } from 'lucide-react'

/**
 * O momento que define o produto: um comentário preso a um ponto exato da arte.
 *
 * Antes isto era uma caixa cinza com dois pontos laranjas e barras no lugar do
 * texto — deliberadamente abstrato, para "não envelhecer". O preço foi alto:
 * quem chega no site não descobre o que o VIU faz. Numa landing page de um
 * produto visual, a demonstração é o argumento; forma cinza não argumenta.
 *
 * O conteúdo é fictício e assumidamente exemplo — nome de cliente inventado,
 * frase de revisão como as que aparecem no produto. É o que toda vitrine de
 * software faz, e é honesto desde que ninguém apresente isso como dado real.
 */

const ALTURAS_ONDA = [7, 12, 9, 16, 11, 18, 8, 14, 10, 6, 13, 9, 15, 8]

function Pino({ numero, className }: { numero: number; className: string }) {
  return (
    <span
      aria-hidden
      className={`absolute grid size-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-4 ring-primary/20 ${className}`}
    >
      {numero}
    </span>
  )
}

export default function ProductFrame() {
  return (
    <div
      role="img"
      aria-label="Ilustração da interface do VIU: uma arte com dois pontos comentados, a coluna de feedbacks ao lado com um comentário de texto, um áudio e a arte aprovada."
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_20px_60px_-30px_rgba(0,0,0,0.35)]"
    >
      <div aria-hidden className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="size-2 rounded-full bg-foreground/10" />
        <span className="size-2 rounded-full bg-foreground/10" />
        <span className="size-2 rounded-full bg-foreground/10" />
        <span className="ml-2 truncate text-[11px] text-muted-foreground">
          Identidade Visual — TechStart · Logo v2
        </span>
      </div>

      <div className="grid sm:grid-cols-[1fr_260px]">
        {/* Área da arte: um cartaz qualquer, sugerido por formas. A arte real de
            quem usa entra aqui, e por isso o entorno é neutro. */}
        <div className="relative bg-muted/40 p-5 sm:p-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border/70 bg-background">
            <div aria-hidden className="flex h-full flex-col justify-between p-6">
              <div className="space-y-2.5">
                <span className="block h-2.5 w-14 rounded-full bg-foreground/10" />
                <span className="block h-7 w-3/5 rounded-md bg-foreground/[0.14]" />
                <span className="block h-7 w-2/5 rounded-md bg-foreground/[0.09]" />
              </div>
              <div className="flex items-end justify-between">
                <span className="size-12 rounded-lg bg-primary/15" />
                <div className="space-y-1.5">
                  <span className="block h-1.5 w-24 rounded-full bg-foreground/8" />
                  <span className="block h-1.5 w-16 rounded-full bg-foreground/8" />
                </div>
              </div>
            </div>
            <Pino numero={1} className="left-[24%] top-[26%]" />
            <Pino numero={2} className="left-[66%] top-[64%]" />
          </div>
        </div>

        {/* Coluna de feedbacks */}
        <div className="space-y-3.5 border-t border-border/60 p-4 sm:border-l sm:border-t-0">
          <div className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-pastel-lavanda text-[9px] font-semibold text-foreground/70"
            >
              JS
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium">
                João Santos <span className="font-normal text-muted-foreground">· ponto 1</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                A fonte está perfeita, mas o ícone poderia ser um pouco maior.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-pastel-pessego text-[9px] font-semibold text-foreground/70"
            >
              JS
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium">
                João Santos <span className="font-normal text-muted-foreground">· ponto 2</span>
              </p>
              <span className="mt-1 flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/60 px-2 py-1.5">
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
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">0:14</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-pastel-menta/25 px-2.5 py-2">
            <span
              aria-hidden
              className="grid size-5 shrink-0 place-items-center rounded-full bg-pastel-menta"
            >
              <Check className="size-3 text-foreground/70" />
            </span>
            <p className="text-[11px] leading-snug">
              <span className="font-medium">Aprovada</span>{' '}
              <span className="text-muted-foreground">por João Santos, 10/09</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
