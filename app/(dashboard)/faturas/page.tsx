'use client'

import PageHeader from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Receipt, CheckCircle2, Clock, XCircle, RotateCcw,
  Loader2, AlertCircle, ChevronRight, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { pagamentosApi, Fatura, FaturaStatus } from '@/lib/pagamentos'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_CFG: Record<FaturaStatus, { label: string; icon: React.ElementType; cls: string }> = {
  PENDENTE: { label: 'Pendente', icon: Clock, cls: 'text-amber-400 bg-amber-400/10' },
  PAGA: { label: 'Paga', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 bg-emerald-500/10' },
  CANCELADA: { label: 'Cancelada', icon: XCircle, cls: 'text-red-400 bg-red-400/10' },
  ESTORNADA: { label: 'Estornada', icon: RotateCcw, cls: 'text-purple-400 bg-purple-400/10' },
}

function StatusChip({ status }: { status: FaturaStatus }) {
  const { label, icon: Icon, cls } = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function FaturaRow({ fatura, index, tipo }: { fatura: Fatura; index: number; tipo: 'cliente' | 'designer' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Link href={`/faturas/${fatura.id}`}>
        <div className="group flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/30 cursor-pointer card-interativo">
          <div className="p-2 rounded-lg bg-muted flex-shrink-0">
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium truncate">{fatura.projeto.nome}</p>
              <StatusChip status={fatura.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {tipo === 'cliente' ? `Designer: ${fatura.designer.nome}` : `Cliente: ${fatura.cliente.nome}`}
              {fatura.dataVencimento ? ` · Vence ${fmt(fatura.dataVencimento)}` : ''}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold tabular-nums">{fatura.valorFormatado}</p>
            {tipo === 'designer' && fatura.status === 'PAGA' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 mt-0.5">Líquido: {fatura.valorLiquidoDesignerFormatado}</p>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  )
}

export default function FaturasPage() {
  /*
   * O `tipo` da API não é quem você é — é de que lado da fatura você está:
   * 'cliente' filtra por clienteId (o que eu pago) e 'designer' por designerId
   * (o que eu recebo). Isso virava duas abas "Como cliente / Como designer",
   * com useState('cliente') fixo, então todo designer abria esta tela na aba
   * de cliente.
   *
   * E essa aba não estava só errada por padrão: estava garantidamente vazia.
   * projetoService exige `tipo: 'CLIENTE'` no cliente do projeto, então uma
   * conta DESIGNER nunca é clienteId de fatura nenhuma — e vice-versa. O
   * seletor oferecia escolher entre os seus dados e uma aba que não pode
   * conter nada, e abria na que não pode.
   *
   * O Dashboard já derivava certo (`isDesigner ? 'designer' : 'cliente'`) e a
   * aba de faturas do projeto já busca os dois e junta. Esta era a única tela
   * que devolvia a pergunta para quem entrou.
   */
  const { user } = useAuth()
  const ehDesigner = (user as any)?.tipo === 'DESIGNER'
  const tipo: 'cliente' | 'designer' = ehDesigner ? 'designer' : 'cliente'

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Depende do id e não do objeto `user`: o contexto devolve uma referência
  // nova a cada render, e com ela na lista o efeito refazia a busca à toa.
  const usuarioId = (user as any)?.id as string | undefined

  useEffect(() => {
    if (!usuarioId) return
    setLoading(true)
    setError(null)
    pagamentosApi.getFaturas(tipo)
      .then(res => setFaturas(res.data ?? []))
      .catch(() => setError('Erro ao carregar faturas'))
      .finally(() => setLoading(false))
  }, [usuarioId, tipo])

  const pendentes = faturas.filter(f => f.status === 'PENDENTE')
  const pagas = faturas.filter(f => f.status === 'PAGA')
  const outras = faturas.filter(f => f.status !== 'PENDENTE' && f.status !== 'PAGA')

  return (
    <FadeIn className="mx-auto w-full max-w-3xl p-6 space-y-6">
      {/* O rótulo passa a ser sobre dinheiro, não sobre identidade: era
          justamente "Como cliente / Como designer" que fazia quem entrava
          parar para lembrar que tipo de conta tinha. */}
      <PageHeader
        title="Faturas"
        description={ehDesigner ? 'O que você tem a receber.' : 'O que você tem a pagar.'}
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </motion.div>
        ) : error ? (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16 gap-2 text-muted-foreground">
            <AlertCircle className="h-7 w-7" />
            <p className="text-sm">{error}</p>
          </motion.div>
        ) : faturas.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="text-center py-16 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {ehDesigner
                ? 'Nenhuma fatura emitida ainda. Elas nascem de um projeto entregue.'
                : 'Nenhuma fatura para pagar.'}
            </p>
          </motion.div>
        ) : (
          <motion.div key={tipo} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-6">
            {pendentes.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Pendentes ({pendentes.length})
                </h2>
                <div className="space-y-2">
                  {pendentes.map((f, i) => <FaturaRow key={f.id} fatura={f} index={i} tipo={tipo} />)}
                </div>
              </section>
            )}
            {pagas.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Pagas ({pagas.length})
                </h2>
                <div className="space-y-2">
                  {pagas.map((f, i) => <FaturaRow key={f.id} fatura={f} index={pendentes.length + i} tipo={tipo} />)}
                </div>
              </section>
            )}
            {outras.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Outras
                </h2>
                <div className="space-y-2">
                  {outras.map((f, i) => <FaturaRow key={f.id} fatura={f} index={pendentes.length + pagas.length + i} tipo={tipo} />)}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  )
}
