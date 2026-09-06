'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Reveal from './Reveal'

export default function ClosingCta({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="border-t border-border/60 px-6 py-28 md:py-40">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.025em] sm:text-4xl md:text-5xl">
          Seu cliente não precisa mudar. Só precisa de um lugar melhor para estar.
        </h2>
        <div className="mt-10">
          <Button size="lg" asChild>
            <Link href={ctaHref}>Criar conta gratuita</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  )
}
