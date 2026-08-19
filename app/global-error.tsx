'use client'

import { useEffect } from 'react'

/**
 * Último recurso: pega erro no próprio root layout, quando nem o error.tsx
 * das rotas chega a montar.
 *
 * Precisa trazer <html> e <body> porque substitui o root layout inteiro, e por
 * isso não pode depender de nada do design system — nem dos tokens de tema,
 * que vivem no CSS que este arquivo não carrega. Daí o estilo inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[root]', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fafaf9',
          color: '#1c1917',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            O VIU não conseguiu carregar
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#57534e', margin: '0 0 1.25rem' }}>
            Alguma coisa quebrou antes da aplicação subir. Recarregar costuma resolver.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.75rem',
                color: '#78716c',
                margin: '0 0 1.25rem',
              }}
            >
              código: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: '0.625rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              background: '#ea580c',
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
