'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Reveal from './Reveal'
import ProductFrame from './ProductFrame'

/**
 * `ctaHref` vem de cima porque só a página sabe se há sessão: quem já entrou
 * não deve ser mandado de volta para o cadastro.
 *
 * "Ver demonstração" é âncora para a seção "Como funciona" — não existe rota
 * de demo no app, e o botão antes levava para o /login, prometendo uma coisa e
 * entregando outra.
 */
export default function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="px-6 pt-20 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.03] tracking-[-0.03em] sm:text-6xl md:text-7xl">
            O feedback flui.
            <br className="hidden sm:block" />{' '}
            <span className="text-muted-foreground">O trabalho brilha.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            A plataforma definitiva para revisar artes, centralizar áudios e registrar
            aprovações. Sem ruído. Sem versões perdidas.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={ctaHref}>Começar agora</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="#como-funciona">Ver demonstração</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Seu cliente acessa por um link. Sem instalação. Sem complicação.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-16 md:mt-24">
          <ProductFrame />
        </Reveal>
      </div>
    </section>
  )
}
