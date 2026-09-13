'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { impersonacaoApi } from '@/lib/impersonacao'
import { Eye, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * A faixa de "você está na conta de outra pessoa".
 *
 * Ela é chamativa de propósito, e não pode ser fechada. O risco real da
 * impersonação não é o admin mal-intencionado — é o distraído: abrir para
 * investigar um caso, atender outra coisa, e meia hora depois estar lendo a
 * conta alheia achando que é a própria. Um aviso dispensável seria dispensado
 * no primeiro minuto, e aí não avisa nada.
 *
 * Fica no topo do layout do dashboard, acima de qualquer tela, porque é a única
 * posição em que ela aparece em todas.
 *
 * O botão de sair vive aqui e não numa tela de admin: quem precisa sair está,
 * por definição, dentro da outra conta — e lá não existe menu de admin.
 */
export function FaixaImpersonacao() {
  const { user, recarregar } = useAuth()
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  const imp = user?.impersonacao
  if (!imp) return null

  async function sair() {
    setSaindo(true)
    try {
      const { usuario } = await impersonacaoApi.sair()
      /*
       * Recarrega o perfil ANTES de navegar: o backend já trocou o cookie, mas
       * o contexto ainda guarda o usuário impersonado, e navegar primeiro
       * mostraria a tela de admin com o nome errado no rodapé da barra.
       */
      await recarregar()
      toast.success(`De volta como ${usuario.nome}.`)
      router.push('/admin/usuarios')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível sair da conta.')
    } finally {
      setSaindo(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
      <Eye className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p className="min-w-0">
        Você está vendo o VIU como{' '}
        <span className="font-semibold">{user?.nome}</span>
        {user?.email ? <span className="text-muted-foreground"> ({user.email})</span> : null}.{' '}
        {/* Somente leitura dito na faixa, não só no erro: descobrir o limite ao
            levar um 403 no meio de uma ação é descobrir tarde. */}
        <span className="text-muted-foreground">
          Acesso somente leitura, aberto por {imp.adminNome}.
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto h-7 shrink-0 bg-background"
        onClick={() => void sair()}
        disabled={saindo}
      >
        {saindo ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
        )}
        Sair da conta
      </Button>
    </div>
  )
}

export default FaixaImpersonacao
