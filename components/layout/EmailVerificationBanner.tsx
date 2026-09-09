'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { MailWarning, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Aviso de e-mail não confirmado.
 *
 * Diz para qual endereço o link foi: quem digitou errado no cadastro não tinha
 * como perceber, e ficava esperando um e-mail que nunca ia chegar.
 *
 * "Já verifiquei" existe porque a confirmação acontece em outra aba — a do
 * link. Sem refazer a consulta ao servidor, esta aba continuaria mostrando o
 * aviso até um recarregamento manual, e a pessoa concluiria que a
 * confirmação não funcionou.
 */
export function EmailVerificationBanner() {
  const { user, recarregar } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [conferindo, setConferindo] = useState(false)
  const [aindaNaoConfirmado, setAindaNaoConfirmado] = useState(false)

  if (!user || user.emailVerificado !== false || dismissed) return null

  const reenviar = async () => {
    setEnviando(true)
    try {
      await api.post('/auth/resend-verification', { email: user.email })
    } catch {
      // O servidor responde igual para e-mail existente ou não, de propósito
      // (anti-enumeração). Mostrar erro aqui contradiria isso.
    } finally {
      setEnviando(false)
      setEnviado(true)
    }
  }

  const conferir = async () => {
    setConferindo(true)
    setAindaNaoConfirmado(false)
    const perfil = await recarregar()
    // Confirmado: o próprio `user` muda e o componente some sozinho.
    if (perfil && perfil.emailVerificado === false) setAindaNaoConfirmado(true)
    setConferindo(false)
  }

  const mensagem = enviado
    ? `Link reenviado para ${user.email}. Verifique a caixa de entrada e o spam.`
    : aindaNaoConfirmado
      ? 'Ainda não confirmamos seu e-mail. Abra o link que enviamos e tente de novo.'
      : `Confirme seu e-mail: enviamos um link para ${user.email}.`

  const botao =
    'h-7 shrink-0 border-yellow-400 bg-transparent px-2 text-xs text-yellow-900 hover:bg-yellow-100 sm:px-3 dark:border-yellow-700 dark:text-yellow-100 dark:hover:bg-yellow-900/50'

  return (
    <div className="flex items-center gap-2 border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-900 sm:gap-3 sm:px-4 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-100">
      <MailWarning className="h-4 w-4 shrink-0" />

      {/* Uma linha, cortada com reticências no celular. Duas versões do texto
          (curta e longa) alternadas por CSS resolveriam o espaço e fariam o
          leitor de tela anunciar a mesma coisa duas vezes; o `title` entrega o
          resto para quem precisar. O começo da frase é o que importa: é onde
          está o que fazer. */}
      <p className="min-w-0 flex-1 truncate text-xs sm:text-sm" title={mensagem}>
        {mensagem}
      </p>

      <Button variant="outline" size="sm" className={botao} onClick={conferir} disabled={conferindo}>
        {conferindo ? 'Conferindo…' : 'Já verifiquei'}
      </Button>

      {!enviado && (
        <Button variant="outline" size="sm" className={botao} onClick={reenviar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Reenviar'}
        </Button>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-yellow-700 hover:text-yellow-900 dark:text-yellow-300 dark:hover:text-yellow-100"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
