'use client'

import { Upload, Link2, Check } from 'lucide-react'
import Reveal from './Reveal'

/**
 * Três passos, três verbos.
 *
 * O terceiro era "Aprovação." — substantivo no meio de dois imperativos, e
 * quem lê em diagonal tropeça. Os passos também ganharam número: aqui a ordem
 * é informação, porque é a sequência real de quem usa o produto.
 *
 * `scroll-mt` compensa a altura do header fixo: sem isso a âncora do
 * "Ver como funciona" para com o título escondido atrás da barra.
 */
const PASSOS = [
  {
    icone: Upload,
    titulo: 'Envie',
    texto: 'Organize suas artes por projeto. Cada ajuste vira uma versão, com histórico.',
    cor: 'bg-pastel-lavanda',
  },
  {
    icone: Link2,
    titulo: 'Compartilhe',
    texto: 'Um link só. Seu cliente abre, comenta e some — sem criar conta, sem instalar nada.',
    cor: 'bg-pastel-pessego',
  },
  {
    icone: Check,
    titulo: 'Aprove',
    texto: 'Comentário no ponto exato, áudio quando for mais rápido, e o aceite com data e hora.',
    cor: 'bg-pastel-menta',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            Do arquivo ao aceite, em três passos
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            É o mesmo caminho que você já faz hoje — só que sem as partes que se perdem no meio.
          </p>
        </Reveal>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {PASSOS.map(({ icone: Icone, titulo, texto, cor }, i) => (
            <Reveal key={titulo} delay={i * 0.08}>
              <li className="relative">
                <div className="flex items-center gap-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${cor}`}>
                    <Icone aria-hidden className="size-5 text-foreground/75" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold tracking-[-0.02em]">{titulo}</h3>
                <p className="mt-2.5 text-pretty leading-relaxed text-muted-foreground">{texto}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
