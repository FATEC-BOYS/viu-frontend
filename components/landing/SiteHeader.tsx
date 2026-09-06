'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Barra fina, sem peso: só marca, entrada e o CTA.
 *
 * Enquanto o `/auth/me` responde, o lado direito vira um espaço reservado da
 * mesma altura em vez de sumir. A landing não pode piscar deslogada nem pular
 * de layout quando a sessão chega — antes a página inteira esperava por isso.
 */
export default function SiteHeader() {
  const { user, signOut, loading } = useAuth()
  const autenticado = !!user

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="VIU — página inicial">
          <span aria-hidden className="size-6 rounded-md bg-primary" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">VIU</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Acesso à conta">
          {loading ? (
            <div className="h-9 w-40" aria-hidden />
          ) : autenticado ? (
            <>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sair
              </Button>
              <Button size="sm" asChild>
                <Link href="/dashboard">Ir para o dashboard</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
