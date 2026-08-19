'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { MailWarning, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmailVerificationBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  if (!user || user.emailVerificado !== false || dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await api.post('/auth/resend-verification', { email: user.email })
    } catch {
      // anti-enumeração
    } finally {
      setSending(false)
      setSent(true)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-yellow-50 dark:bg-yellow-950/40 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
      <div className="flex items-center gap-2">
        <MailWarning className="h-4 w-4 shrink-0" />
        {sent
          ? 'Link de verificação reenviado. Verifique sua caixa de entrada.'
          : 'Confirme seu e-mail para garantir acesso completo à sua conta.'}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!sent && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-yellow-400 text-yellow-800 hover:bg-yellow-100"
            onClick={handleResend}
            disabled={sending}
          >
            {sending ? 'Enviando...' : 'Reenviar e-mail'}
          </Button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
