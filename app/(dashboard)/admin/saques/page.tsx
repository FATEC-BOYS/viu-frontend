'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDownToLine, Check, Copy, Loader2, RefreshCw, X } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  adminApi,
  ROTULO_SAQUE,
  TRANSICOES_SAQUE,
  type SaqueAdmin,
  type SaqueStatus,
} from '@/lib/admin'

const FILTROS: Array<{ valor: SaqueStatus | 'todos'; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'SOLICITADO', rotulo: 'Solicitados' },
  { valor: 'PROCESSANDO', rotulo: 'Processando' },
  { valor: 'CONCLUIDO', rotulo: 'Concluídos' },
  { valor: 'CANCELADO', rotulo: 'Cancelados' },
]

const VARIANTE: Record<SaqueStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SOLICITADO: 'default',
  PROCESSANDO: 'secondary',
  CONCLUIDO: 'outline',
  CANCELADO: 'destructive',
}

/** O texto do botão precisa dizer o que acontece, não o nome do estado destino. */
const ACAO: Record<SaqueStatus, string> = {
  PROCESSANDO: 'Marcar como processando',
  CONCLUIDO: 'Confirmar pagamento',
  CANCELADO: 'Cancelar saque',
  SOLICITADO: 'Reabrir',
}

export default function AdminSaquesPage() {
  const [saques, setSaques] = useState<SaqueAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<SaqueStatus | 'todos'>('todos')
  const [salvando, setSalvando] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<{ saque: SaqueAdmin; destino: SaqueStatus } | null>(
    null,
  )

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const res = await adminApi.listarSaques(filtro === 'todos' ? undefined : { status: filtro })
      setSaques(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar os saques.')
    } finally {
      setCarregando(false)
    }
  }, [filtro])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const pendentes = useMemo(
    () => saques.filter((s) => s.status === 'SOLICITADO' || s.status === 'PROCESSANDO'),
    [saques],
  )
  const totalPendente = useMemo(() => pendentes.reduce((acc, s) => acc + s.valor, 0), [pendentes])

  async function aplicarTransicao(saque: SaqueAdmin, destino: SaqueStatus) {
    setSalvando(saque.id)
    try {
      await adminApi.atualizarStatusSaque(saque.id, destino)
      toast.success(`Saque de ${saque.designer.nome} agora está "${ROTULO_SAQUE[destino]}".`)
      await carregar()
    } catch (err) {
      // O backend recusa transição inválida com 409 e explica o motivo.
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar o saque.')
    } finally {
      setSalvando(null)
      setConfirmacao(null)
    }
  }

  async function copiarChave(chave: string) {
    try {
      await navigator.clipboard.writeText(chave)
      toast.success('Chave PIX copiada.')
    } catch {
      toast.error('Não foi possível copiar a chave.')
    }
  }

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <PageHeader
        title="Saques"
        description="Pagamentos solicitados pelos designers. O PIX é feito por fora — aqui você registra em que pé está."
        actions={
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {pendentes.length > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">A pagar</p>
          <p className="text-2xl font-semibold tabular-nums">
            {(totalPendente / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-sm text-muted-foreground">
            {pendentes.length} {pendentes.length === 1 ? 'saque aguardando' : 'saques aguardando'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.valor}
            size="sm"
            variant={filtro === f.valor ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setFiltro(f.valor)}
          >
            {f.rotulo}
          </Button>
        ))}
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : saques.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title={filtro === 'todos' ? 'Nenhum saque solicitado' : 'Nenhum saque com esse status'}
          description={
            filtro === 'todos'
              ? 'Quando um designer solicitar um saque, ele aparece aqui.'
              : 'Tente outro filtro.'
          }
        />
      ) : (
        <div className="space-y-3">
          {saques.map((saque) => {
            const destinos = TRANSICOES_SAQUE[saque.status] ?? []
            return (
              <div key={saque.id} className="rounded-xl border bg-card p-4 card-interativo">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium truncate">{saque.designer.nome}</h3>
                      <Badge variant={VARIANTE[saque.status]}>{ROTULO_SAQUE[saque.status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{saque.designer.email}</p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums shrink-0">
                    {saque.valorFormatado}
                  </p>
                </div>

                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground shrink-0">Chave PIX:</span>
                    {saque.chavePix ? (
                      <>
                        <span className="truncate font-medium">{saque.chavePix.chave}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => void copiarChave(saque.chavePix!.chave)}
                          aria-label="Copiar chave PIX"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-muted-foreground">chave removida</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-muted-foreground">Solicitado em</span>
                    <span className="font-medium">{saque.criadoEmFormatado}</span>
                  </div>
                </div>

                {destinos.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                    {destinos.map((destino) => (
                      <Button
                        key={destino}
                        size="sm"
                        variant={destino === 'CANCELADO' ? 'outline' : 'default'}
                        disabled={salvando === saque.id}
                        onClick={() => setConfirmacao({ saque, destino })}
                      >
                        {salvando === saque.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : destino === 'CANCELADO' ? (
                          <X className="h-4 w-4 mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        {ACAO[destino]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmar antes de mexer: as transições são finais e movem dinheiro real. */}
      <AlertDialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => !aberto && setConfirmacao(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmacao ? ACAO[confirmacao.destino] : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmacao?.destino === 'CONCLUIDO' ? (
                <>
                  Confirme apenas depois que o PIX de{' '}
                  <strong>{confirmacao.saque.valorFormatado}</strong> para{' '}
                  <strong>{confirmacao.saque.designer.nome}</strong> já tiver sido feito. Concluir
                  lança o débito no extrato e não tem volta.
                </>
              ) : confirmacao?.destino === 'CANCELADO' ? (
                <>
                  O saque de <strong>{confirmacao.saque.valorFormatado}</strong> de{' '}
                  <strong>{confirmacao.saque.designer.nome}</strong> será cancelado e o valor volta
                  a ficar disponível para ele. Cancelamento é definitivo.
                </>
              ) : (
                <>
                  Marca o saque de <strong>{confirmacao?.saque.designer.nome}</strong> como em
                  processamento, sinalizando que o pagamento está sendo feito.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmacao && void aplicarTransicao(confirmacao.saque, confirmacao.destino)
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FadeIn>
  )
}
