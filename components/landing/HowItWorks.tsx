'use client'

import { Upload, Link2, Check } from 'lucide-react'
import Reveal from './Reveal'

/**
 * `scroll-mt` compensa a altura do header fixo: sem isso a âncora do
 * "Ver demonstração" para com o título escondido atrás da barra.
 */
const PASSOS = [
  {
    icone: Upload,
    titulo: 'Envie.',
    texto: 'Organize suas artes por projeto. Crie versões conforme o trabalho evolui.',
  },
  {
    icone: Link2,
    titulo: 'Compartilhe.',
    texto: 'Envie um único link. Seu cliente não precisa criar conta nem aprender nada novo.',
  },
  {
    icone: Check,
    titulo: 'Aprovação.',
    texto:
      'Receba comentários visuais, áudios integrados e registre a aprovação final oficialmente.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-24 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-3 md:gap-10">
          {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
            <Reveal key={titulo} delay={i * 0.08}>
              <span className="grid size-11 place-items-center rounded-xl border border-border/70 bg-card text-foreground">
                <Icone aria-hidden className="size-[18px]" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em]">{titulo}</h3>
              <p className="mt-2.5 text-pretty leading-relaxed text-muted-foreground">{texto}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
