'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Conteúdo compartilhado pelos error boundaries.
 *
 * Existem dois: um em app/(dashboard)/error.tsx, que preserva a sidebar e
 * deixa a pessoa navegar para outra tela, e um em app/error.tsx para as rotas
 * de fora do dashboard (login, viewer público, link compartilhado).
 *
 * O `console.error` é o ponto onde um SDK de monitoramento entraria
 * (Sentry.captureException). Ver TECH_DEBT.md no backend.
 */
export default function ErroDeTela({
  error,
  reset,
  origem,
}: {
  error: Error & { digest?: string }
  reset: () => void
  origem: string
}) {
  useEffect(() => {
    console.error(`[${origem}]`, error)
  }, [error, origem])

  return (
    <div className="mx-auto grid w-full max-w-3xl place-items-center p-6 py-20 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Deu ruim por aqui</h1>
          <p className="text-sm text-muted-foreground">
            Essa tela não carregou. Não é você — tente de novo e, se insistir, avise a gente.
          </p>
        </div>
        {/* O digest é o que liga o relato do usuário à linha no log do servidor. */}
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">código: {error.digest}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Button size="sm" onClick={reset}>
            Tentar de novo
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
