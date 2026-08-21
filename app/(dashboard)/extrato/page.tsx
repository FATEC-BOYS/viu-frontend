'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import ChipFilter from '@/components/commom/ChipFilter'
import { pagamentosApi, formatReais, type LedgerEntry, type SaldoInfo } from '@/lib/pagamentos'

type Filtro = 'todos' | 'CREDITO' | 'DEBITO'

/**
 * Extrato financeiro do designer.
 *
 * GET /ledger existia desde que o ledger virou a fonte única do saldo, mas não
 * tinha tela: o saldo aparecia na página de saques sem que desse para ver de
 * onde ele vinha. Cada linha aqui é um lançamento com sua origem — fatura paga
 * (crédito) ou saque concluído (débito).
 */
export default function ExtratoPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todos')

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        const [resLedger, resSaldo] = await Promise.allSettled([
          pagamentosApi.getLedger(),
          pagamentosApi.getSaldo(),
        ])
        if (!ativo) return
        if (resLedger.status === 'fulfilled') setEntries(resLedger.value.data ?? [])
        else toast.error('Não foi possível carregar o extrato')
        if (resSaldo.status === 'fulfilled') setSaldo(resSaldo.value.data ?? null)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [])

  const filtradas = useMemo(
    () => (filtro === 'todos' ? entries : entries.filter((e) => e.tipo === filtro)),
    [entries, filtro],
  )

  return (
    <FadeIn className="space-y-6 p-6">
      <PageHeader
        title="Extrato"
        description="Cada entrada e saída que compõe o seu saldo disponível."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <ResumoCard titulo="Saldo disponível" valor={saldo?.saldoFormatado} destaque />
        <ResumoCard titulo="Total recebido" valor={saldo?.totalRecebidoFormatado} />
        <ResumoCard titulo="Total sacado" valor={saldo?.totalSacadoFormatado} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ChipFilter label="Todos" selected={filtro === 'todos'} onToggle={() => setFiltro('todos')} />
        <ChipFilter label="Entradas" selected={filtro === 'CREDITO'} onToggle={() => setFiltro('CREDITO')} />
        <ChipFilter label="Saídas" selected={filtro === 'DEBITO'} onToggle={() => setFiltro('DEBITO')} />
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando extrato…
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={entries.length === 0 ? 'Nenhum lançamento ainda' : 'Nada com esse filtro'}
          description={
            entries.length === 0
              ? 'Faturas pagas entram como crédito e saques concluídos como débito. O primeiro pagamento abre seu extrato.'
              : undefined
          }
        />
      ) : (
        <ul className="grid gap-2">
          {filtradas.map((entry) => {
            const credito = entry.tipo === 'CREDITO'
            return (
              <li key={entry.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    credito
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {credito ? (
                    <ArrowDownLeft className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.criadoEm).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {entry.referencia && ` • ${entry.referencia}`}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={`rounded-full tabular-nums ${
                    credito ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {credito ? '+' : '−'}
                  {formatReais(Math.abs(entry.valor))}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </FadeIn>
  )
}

function ResumoCard({
  titulo,
  valor,
  destaque,
}: {
  titulo: string
  valor?: string
  destaque?: boolean
}) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`tabular-nums ${destaque ? 'text-2xl font-semibold' : 'text-lg font-medium'}`}>
        {valor ?? '—'}
      </p>
    </Card>
  )
}
