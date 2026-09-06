'use client'

import { MousePointerClick, Mic, History, FileCheck2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Reveal from './Reveal'

const DIFERENCIAIS = [
  {
    icone: MousePointerClick,
    titulo: 'Comentários Visuais',
    texto: "Acabe com o 'muda aquele negócio ali'. O cliente marca o ponto exato na arte.",
  },
  {
    icone: Mic,
    titulo: 'Áudio Integrado',
    texto: 'A voz do seu cliente, salva junto da versão correta. Sem precisar procurar no histórico.',
  },
  {
    icone: History,
    titulo: 'Histórico Blindado',
    texto: 'Cada alteração registrada. Cada versão documentada. Saiba exatamente o que mudou.',
  },
  {
    icone: FileCheck2,
    titulo: 'Aprovação com Validade',
    texto: "Transforme o 'pode seguir' em um registro formal. Ideal para evitar cobranças futuras.",
  },
]

export default function Differentials() {
  return (
    <section className="border-t border-border/60 bg-muted/40 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-5 sm:grid-cols-2">
          {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }, i) => (
            <Reveal key={titulo} delay={i * 0.06}>
              <Card className="h-full gap-0 py-0">
                <CardContent className="p-7 md:p-8">
                  <Icone aria-hidden className="size-5 text-primary" strokeWidth={1.75} />
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{titulo}</h3>
                  <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">{texto}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
