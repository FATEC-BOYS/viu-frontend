'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from 'lucide-react'

import PageHeader from '@/components/layout/PageHeader'
import { FadeIn } from '@/components/layout/Motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { pagamentosApi, type Assinatura } from '@/lib/pagamentos'

/**
 * Retorno do checkout do Mercado Pago (`back_url` de POST /assinaturas).
 *
 * O MP redireciona o usuário assim que ele paga, mas quem ativa a assinatura é
 * o webhook — que pode chegar depois. Por isso a tela consulta
 * GET /assinaturas/minha algumas vezes antes de desistir, em vez de afirmar
 * qualquer coisa a partir do parâmetro que veio na URL.
 */
const TENTATIVAS_MAX = 5
const INTERVALO_MS = 3000

function ConfirmacaoAssinatura() {
  const searchParams = useSearchParams()
  // O MP devolve status=approved|pending|failure (ou collection_status, no
  // formato antigo). Serve para a mensagem inicial, não como verdade.
  const statusMP = searchParams.get('status') ?? searchParams.get('collection_status')

  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [tentativas, setTentativas] = useState(0)
  const [verificando, setVerificando] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const verificar = useCallback(async () => {
    setVerificando(true)
    try {
      const res = await pagamentosApi.getMinhaAssinatura()
      setAssinatura(res.data ?? null)
      return res.data ?? null
    } catch {
      return null
    } finally {
      setVerificando(false)
      setTentativas((n) => n + 1)
    }
  }, [])

  useEffect(() => {
    let ativo = true

    async function ciclo(rodada: number) {
      const atual = await verificar()
      if (!ativo) return
      // Para de insistir assim que a assinatura sai de PENDENTE ou o teto é atingido.
      if (atual?.status && atual.status !== 'PENDENTE') return
      if (rodada + 1 >= TENTATIVAS_MAX) return
      timeoutRef.current = setTimeout(() => ciclo(rodada + 1), INTERVALO_MS)
    }

    ciclo(0)
    return () => {
      ativo = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [verificar])

  const ativa = assinatura?.status === 'ATIVA'
  const falhou = statusMP === 'failure' || statusMP === 'rejected'
  const aguardando = !ativa && !falhou

  return (
    <FadeIn className="space-y-6 p-6">
      <PageHeader
        title={ativa ? 'Assinatura confirmada' : falhou ? 'Pagamento não concluído' : 'Confirmando pagamento'}
        description={
          ativa
            ? 'Tudo certo — seu plano já está valendo.'
            : falhou
              ? 'O pagamento não foi aprovado pelo Mercado Pago.'
              : 'O Mercado Pago avisa a plataforma em segundo plano; isso costuma levar alguns segundos.'
        }
      />

      <Card className="flex max-w-xl items-start gap-3 p-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted">
          {ativa ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : falhou ? (
            <XCircle className="h-5 w-5 text-red-500" aria-hidden />
          ) : (
            <Clock className="h-5 w-5 text-amber-500" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm">
            {ativa
              ? `Plano ${assinatura?.plano?.nome ?? 'contratado'} ativo.`
              : falhou
                ? 'Nenhuma cobrança foi concluída. Você pode tentar de novo a partir da página de planos.'
                : 'Aguardando a confirmação do pagamento.'}
          </p>

          {aguardando && (
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {verificando
                ? 'Verificando…'
                : tentativas >= TENTATIVAS_MAX
                  ? 'Ainda não recebemos a confirmação. Isso não significa que o pagamento falhou — atualize em alguns minutos.'
                  : `Verificação ${tentativas} de ${TENTATIVAS_MAX}.`}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {ativa ? (
              <Button asChild>
                <Link href="/assinaturas">Ver minha assinatura</Link>
              </Button>
            ) : (
              <>
                <Button onClick={() => verificar()} disabled={verificando} variant="outline">
                  {verificando ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" aria-hidden />
                  )}
                  Verificar de novo
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/planos">Voltar para os planos</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </FadeIn>
  )
}

/**
 * useSearchParams precisa de um limite de Suspense para a rota não travar a
 * renderização estática do restante do app.
 */
export default function ConfirmacaoAssinaturaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando…
        </div>
      }
    >
      <ConfirmacaoAssinatura />
    </Suspense>
  )
}
