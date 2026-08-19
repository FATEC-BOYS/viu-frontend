'use client'

import ErroDeTela from '@/components/layout/ErroDeTela'

/** Boundary das rotas fora do dashboard (login, viewer público, link compartilhado). */
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErroDeTela {...props} origem="render" />
}
