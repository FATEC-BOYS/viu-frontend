'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Receipt, CheckCircle2, Clock, XCircle, Loader2,
  Plus, ArrowRight, Zap, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { pagamentosApi, Fatura, FaturaStatus } from '@/lib/pagamentos'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_CFG: Record<FaturaStatus, { label: string; icon: React.ElementType; cls: string }> = {
  PENDENTE: { label: 'Aguardando pagamento', icon: Clock, cls: 'text-amber-400 bg-amber-400/10' },
  PAGA: { label: 'Paga', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 bg-emerald-500/10' },
  CANCELADA: { label: 'Cancelada', icon: XCircle, cls: 'text-red-400 bg-red-400/10' },
  ESTORNADA: { label: 'Estornada', icon: AlertCircle, cls: 'text-purple-400 bg-purple-400/10' },
}

/**
 * As faturas de um projeto.
 *
 * Esta aba oferecia os dois botões a qualquer um que a abrisse, e os dois são
 * 403 garantidos para metade das pessoas — a regra está no backend:
 *
 *   gerar  `faturaService.ts:49`   projeto.designerId !== requesterId → nega
 *   pagar  `faturaService.ts:105`  fatura.clienteId !== usuarioId     → nega
 *
 * Pior que o 403 era a contradição: a linha dizia "Aguardando pagamento do
 * cliente" e, ao lado, um botão mandando você pagar. Para o designer, que é
 * quem RECEBE, as duas metades da mesma linha se desmentiam.
 *
 * A condição aqui compara ids, não o tipo da conta — igual à tela da fatura
 * individual. Um ADMIN abrindo o projeto também não é o pagador.
 */
export default function FaturaTab({
  projetoId,
  designerId,
}: {
  projetoId: string;
  /** Dono do projeto. Só ele (ou um admin) pode gerar fatura. */
  designerId?: string | null;
}) {
  const { user } = useAuth()
  const usuarioId = (user as { id?: string } | null)?.id
  const ehAdmin = (user as { tipo?: string } | null)?.tipo === 'ADMIN'
  const podeGerar = ehAdmin || (!!usuarioId && !!designerId && usuarioId === designerId)

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // load all faturas and filter by project
    Promise.allSettled([
      pagamentosApi.getFaturas('cliente'),
      pagamentosApi.getFaturas('designer'),
    ]).then(([clienteRes, designerRes]) => {
      const all: Fatura[] = []
      if (clienteRes.status === 'fulfilled') all.push(...(clienteRes.value.data ?? []))
      if (designerRes.status === 'fulfilled') all.push(...(designerRes.value.data ?? []))
      // dedup by id
      const seen = new Set<string>()
      const unique = all.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
      setFaturas(unique.filter(f => f.projeto?.id === projetoId))
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [projetoId])

  async function handleGerarFatura() {
    setGenerating(true)
    try {
      await api.post(`/projetos/${projetoId}/fatura`, {})
      toast.success('Fatura gerada com sucesso!')
      // reload
      const [c, d] = await Promise.allSettled([
        pagamentosApi.getFaturas('cliente'),
        pagamentosApi.getFaturas('designer'),
      ])
      const all: Fatura[] = []
      if (c.status === 'fulfilled') all.push(...(c.value.data ?? []))
      if (d.status === 'fulfilled') all.push(...(d.value.data ?? []))
      const seen = new Set<string>()
      setFaturas(all.filter(f => {
        if (seen.has(f.id)) return false
        seen.add(f.id)
        return f.projeto?.id === projetoId
      }))
    } catch (e: any) {
      /**
       * O servidor já diz o que faltou — "Projeto não possui orçamento
       * definido", "Já existe uma fatura ativa". Trocar isso por "Erro ao
       * gerar fatura" deixava a pessoa sem a única informação que resolveria
       * o problema dela.
       */
      toast.error(e?.message || 'Erro ao gerar fatura.')
    } finally {
      setGenerating(false)
    }
  }

  const ehPagador = (f: Fatura) => !!usuarioId && f.cliente.id === usuarioId
  const ehRecebedor = (f: Fatura) => !!usuarioId && f.designer.id === usuarioId

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Faturas do projeto</h3>
        {podeGerar && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
            onClick={handleGerarFatura}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Gerar fatura
          </Button>
        )}
      </div>

      <AnimatePresence>
        {faturas.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground"
          >
            <Receipt className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma fatura gerada para este projeto.</p>
          </motion.div>
        ) : (
          faturas.map((fatura, i) => {
            // A coluna `status` é texto livre no banco, não enum: um valor
            // fora deste mapa derrubava a aba inteira em vez de mostrar uma
            // fatura com rótulo desconhecido.
            const { label, icon: Icon, cls } = STATUS_CFG[fatura.status] ?? {
              label: fatura.status, icon: AlertCircle, cls: 'text-muted-foreground bg-muted',
            }
            return (
              <motion.div
                key={fatura.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
                className="rounded-xl border border-border/60 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="p-2 rounded-lg bg-muted">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold tabular-nums">{fatura.valorFormatado}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    </div>
                    {fatura.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{fatura.descricao}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Cliente: {fatura.cliente.nome}</span>
                      <span>·</span>
                      <span>Designer recebe: {fatura.valorLiquidoDesignerFormatado}</span>
                    </div>
                  </div>
                </div>

                {fatura.status === 'PENDENTE' && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500/5 px-4 py-2">
                      {ehPagador(fatura) ? (
                        <>
                          <p className="text-xs text-muted-foreground">Vence quando você quiser pagar</p>
                          <Button asChild size="sm" className="h-7 gap-1 rounded-xl">
                            <Link href={`/faturas/${fatura.id}`}>
                              <Zap className="h-3 w-3" />
                              Pagar com PIX
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Aguardando o pagamento de {fatura.cliente.nome}
                          {ehRecebedor(fatura) && `. Você recebe ${fatura.valorLiquidoDesignerFormatado} quando cair.`}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {fatura.status === 'PAGA' && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/5">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
                        {fatura.dataPagamento
                          ? `Pago em ${new Date(fatura.dataPagamento).toLocaleDateString('pt-BR')}`
                          : 'Pagamento confirmado'}
                      </p>
                      <Button asChild size="sm" variant="ghost" className="h-7 rounded-xl gap-1">
                        <Link href={`/faturas/${fatura.id}`}>
                          Ver detalhes <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })
        )}
      </AnimatePresence>
    </div>
  )
}
