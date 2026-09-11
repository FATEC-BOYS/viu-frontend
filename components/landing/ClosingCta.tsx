'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Reveal from './Reveal'

/**
 * O fecho ganhou o que faltava: dizer que é beta e que é grátis agora.
 *
 * Uma landing sem preço nenhum deixa a pergunta no ar bem no momento do
 * clique — e quem está lançando em beta tem a resposta mais fácil de todas.
 */
export default function ClosingCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative overflow-hidden border-t border-border/60 px-6 py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[360px] bg-gradient-to-t from-pastel-algodao/25 to-transparent"
      />

      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-4xl md:text-5xl">
          Seu cliente não precisa mudar. Só precisa de um lugar melhor para estar.
        </h2>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button size="lg" asChild>
            <Link href={ctaHref}>Criar conta grátis</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            O VIU está em beta aberto — grátis enquanto durar, sem cartão.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
