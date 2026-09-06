// app/page.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import SiteHeader from '@/components/landing/SiteHeader'
import Hero from '@/components/landing/Hero'
import ProblemStatement from '@/components/landing/ProblemStatement'
import HowItWorks from '@/components/landing/HowItWorks'
import Differentials from '@/components/landing/Differentials'
import ClosingCta from '@/components/landing/ClosingCta'
import SiteFooter from '@/components/landing/SiteFooter'

/**
 * A página não espera o `useAuth` resolver.
 *
 * Antes ela devolvia "Carregando…" enquanto o /auth/me respondia, então todo
 * visitante anônimo — que é exatamente o público desta página — via uma tela
 * vazia antes da landing. O único trecho que depende de sessão é o destino dos
 * CTAs e os botões do header, e cada um trata isso por conta própria.
 */
export default function HomePage() {
  const { user } = useAuth()
  const ctaHref = user ? '/dashboard' : '/cadastro'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero ctaHref={ctaHref} />
        <ProblemStatement />
        <HowItWorks />
        <Differentials />
        <ClosingCta ctaHref={ctaHref} />
      </main>
      <SiteFooter />
    </div>
  )
}
