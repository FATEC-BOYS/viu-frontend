'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Widget do Cloudflare Turnstile no cadastro.
 *
 * A presença da site key é o próprio interruptor: sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
 * o componente não renderiza nada e o cadastro segue sem widget, que é como se
 * desenvolve local. Uma segunda flag só criaria a chance de as duas
 * discordarem.
 *
 * Quem decide de verdade é o backend: o token daqui não vale nada sozinho, ele
 * é conferido no `siteverify` da Cloudflare com o segredo do servidor. Este
 * componente só existe para dar ao visitante legítimo um token para enviar.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const captchaAtivo = Boolean(SITE_KEY)

type Turnstile = {
  render: (alvo: HTMLElement, opcoes: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

function carregarScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
  if (existente) {
    return new Promise((resolve, reject) => {
      existente.addEventListener('load', () => resolve())
      existente.addEventListener('error', () => reject(new Error('turnstile')))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('turnstile'))
    document.head.appendChild(script)
  })
}

export function CaptchaTurnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    if (!SITE_KEY) return

    let widgetId: string | null = null
    let cancelado = false

    carregarScript()
      .then(() => {
        if (cancelado || !container.current || !window.turnstile) return
        widgetId = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          // Token do Turnstile expira. Sem limpar aqui, o formulário mandaria
          // um token vencido e o cadastro falharia sem explicação na tela.
          'expired-callback': () => onToken(null),
          'error-callback': () => {
            onToken(null)
            setFalhou(true)
          },
        })
      })
      .catch(() => setFalhou(true))

    return () => {
      cancelado = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [onToken])

  if (!SITE_KEY) return null

  return (
    <div className="space-y-2">
      <div ref={container} />
      {falhou && (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar a verificação de segurança. Recarregue a página para tentar de novo.
        </p>
      )}
    </div>
  )
}
