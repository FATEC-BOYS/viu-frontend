'use client'

import { MousePointerClick, Mic, History, FileCheck2 } from 'lucide-react'
import Reveal from './Reveal'

/**
 * Quatro cartões idênticos, com ícone laranja e título em negrito, davam o
 * mesmo peso a tudo — e o laranja, que é a cor da ação no produto, aparecia
 * quatro vezes sem nada para clicar.
 *
 * Aqui viram uma lista de dois em dois, com o argumento antes do rótulo: quem
 * lê em diagonal pega a frase que interessa, não o substantivo.
 */
const DIFERENCIAIS = [
  {
    icone: MousePointerClick,
    titulo: 'Comentário no ponto exato',
    texto: 'Acaba o “muda aquele negócio ali”. O cliente clica onde está o problema.',
  },
  {
    icone: Mic,
    titulo: 'Áudio junto da versão',
    texto: 'A voz do cliente fica salva ao lado da arte certa — não perdida numa conversa.',
  },
  {
    icone: History,
    titulo: 'Histórico de versões',
    texto: 'Cada ajuste vira uma versão. Dá para ver o que mudou, quando e a pedido de quem.',
  },
  {
    icone: FileCheck2,
    titulo: 'Aprovação com data e hora',
    texto: 'O “pode seguir” vira registro. É o que você mostra quando a cobrança vem depois.',
  },
]

export default function Differentials() {
  return (
    <section className="border-t border-border/60 bg-muted/40 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            O que muda no seu dia
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }, i) => (
            <Reveal key={titulo} delay={i * 0.06}>
              <div className="border-t-2 border-foreground/85 pt-5">
                <div className="flex items-center gap-2.5">
                  <Icone aria-hidden className="size-[18px] text-foreground/60" strokeWidth={1.75} />
                  <h3 className="text-base font-semibold tracking-[-0.01em]">{titulo}</h3>
                </div>
                <p className="mt-2.5 text-pretty leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
