'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Reveal from './Reveal'
import ProductFrame from './ProductFrame'

/**
 * `ctaHref` vem de cima porque só a página sabe se há sessão: quem já entrou
 * não deve ser mandado de volta para o cadastro.
 *
 * "Ver como funciona" é âncora para a seção de mesmo nome — não existe rota de
 * demo no app, e o botão antes prometia "demonstração" e entregava outra coisa.
 *
 * O texto fica à esquerda e a demonstração ao lado, não abaixo: a primeira
 * dobra precisa mostrar a promessa e a prova juntas. Centralizado e empilhado,
 * quem chegava via primeiro um título e depois muito espaço.
 */
export default function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Lavanda bem diluída atrás do topo: dá temperatura sem tocar em nada
          que precise ser lido — e some por completo onde a arte aparece. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-pastel-lavanda/25 to-transparent"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <Reveal>
          <p className="text-sm font-medium text-primary">Para quem vive de entregar design</p>

          <h1 className="mt-4 text-balance font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl">
            O feedback flui.
            <br />
            <span className="text-muted-foreground">O trabalho brilha.</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Seu cliente comenta no ponto exato da arte, grava um áudio se for mais fácil, e aprova
            com data e hora. Você para de caçar decisão em conversa de WhatsApp.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={ctaHref}>Criar conta grátis</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="#como-funciona">Ver como funciona</Link>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Seu cliente acessa por um link. Sem instalação, sem criar conta.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <ProductFrame />
        </Reveal>
      </div>
    </section>
  )
}
