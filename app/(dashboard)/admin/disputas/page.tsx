'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Scale, ShieldAlert } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  protecaoApi,
  formatDisputaTipo,
  formatDisputaStatus,
  formatSaldoBloqueado,
  aindaBloqueiaSaldo,
  podeMoverParaAnalise,
  TRANSICOES_DISPUTA,
  EFEITO_DA_RESOLUCAO,
  type Disputa,
  type DisputaStatus,
  type DisputaResolucao,
} from '@/lib/protecao'

/**
 * A mesa onde o admin decide uma disputa.
 *
 * Esta tela não existia, e a falta dela não era cosmética. Abrir uma disputa
 * congela o valor líquido da fatura em `saldoBloqueado`, e o cálculo de saldo
 * do designer é `recebido - sacado - bloqueado`: enquanto a disputa estiver de
 * pé, aquele dinheiro não sai. As únicas rotas que derrubam o bloqueio são
 * `PUT /disputas/:id/analisar` e `/resolver`, ambas restritas a ADMIN — e
 * nenhum arquivo do frontend as chamava. `lib/protecao.ts` tinha três funções:
 * abrir, listar, buscar.
 *
 * O resultado para quem estava usando o produto: o cliente abre uma disputa, o
 * dinheiro do designer some do saldo, e não há tela nenhuma capaz de devolvê-lo.
 * Só mexendo no banco. O painel do admin ainda por cima contava "Precisa de
 * você — disputas abertas" e mandava para `/disputas`, que lista e não resolve.
 *
 * Fica separada de `/disputas` de propósito. Lá a pessoa abre disputa sobre um
 * projeto seu; aqui ela julga a dos outros. São papéis diferentes, e misturar
 * os dois na mesma tela é como nascem os botões que devolvem 403.
 */

const FILTROS: Array<{ valor: DisputaStatus | 'pendentes' | 'todas'; rotulo: string }> = [
  { valor: 'pendentes', rotulo: 'Aguardando decisão' },
  { valor: 'ABERTA', rotulo: 'Abertas' },
  { valor: 'EM_ANALISE', rotulo: 'Em análise' },
  { valor: 'ESCALADA', rotulo: 'Escaladas' },
  { valor: 'todas', rotulo: 'Todas' },
]

const VARIANTE: Record<DisputaStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ABERTA: 'destructive',
  EM_ANALISE: 'default',
  ESCALADA: 'secondary',
  RESOLVIDA_DESIGNER: 'outline',
  RESOLVIDA_CLIENTE: 'outline',
}

/** O rótulo do botão diz o que acontece, não o nome do estado de destino. */
const ACAO: Record<DisputaResolucao, string> = {
  RESOLVIDA_DESIGNER: 'Decidir a favor do designer',
  RESOLVIDA_CLIENTE: 'Decidir a favor do cliente',
  ESCALADA: 'Escalar sem decidir',
}

const MINIMO_RESOLUCAO = 20

export default function AdminDisputasPage() {
  const [disputas, setDisputas] = useState<Disputa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro, setFiltro] = useState<DisputaStatus | 'pendentes' | 'todas'>('pendentes')
  const [salvando, setSalvando] = useState<string | null>(null)
  const [decisao, setDecisao] = useState<{ disputa: Disputa; destino: DisputaResolucao } | null>(
    null,
  )
  const [texto, setTexto] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      /*
       * Sem `status` na query: o filtro "aguardando decisão" cruza três estados
       * e o backend só aceita um por vez. Trazer tudo e filtrar aqui evita três
       * requisições para montar uma lista só.
       */
      const todas = await protecaoApi.listarDisputas()
      setDisputas(todas)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível carregar as disputas.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const visiveis = useMemo(() => {
    if (filtro === 'todas') return disputas
    if (filtro === 'pendentes') return disputas.filter((d) => aindaBloqueiaSaldo(d.status))
    return disputas.filter((d) => d.status === filtro)
  }, [disputas, filtro])

  /*
   * O número que importa nesta tela: quanto de dinheiro de designer está parado
   * agora. É o custo de a fila não andar, e é o que justifica a tela existir.
   */
  const travado = useMemo(
    () =>
      disputas
        .filter((d) => aindaBloqueiaSaldo(d.status))
        .reduce((acc, d) => acc + d.saldoBloqueado, 0),
    [disputas],
  )

  async function moverParaAnalise(disputa: Disputa) {
    setSalvando(disputa.id)
    try {
      await protecaoApi.moverParaAnalise(disputa.id)
      toast.success('Disputa marcada como em análise.')
      await carregar()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível atualizar a disputa.')
    } finally {
      setSalvando(null)
    }
  }

  async function confirmarDecisao() {
    if (!decisao) return
    const resolucao = texto.trim()
    if (resolucao.length < MINIMO_RESOLUCAO) return

    setSalvando(decisao.disputa.id)
    try {
      await protecaoApi.resolverDisputa(decisao.disputa.id, {
        status: decisao.destino,
        resolucao,
      })
      toast.success(
        decisao.destino === 'ESCALADA'
          ? 'Disputa escalada. O valor segue travado.'
          : 'Disputa encerrada e o valor foi destravado.',
      )
      setDecisao(null)
      setTexto('')
      await carregar()
    } catch (err) {
      // Transição inválida volta do backend explicada; vale mostrar como veio.
      toast.error(err instanceof Error ? err.message : 'Não foi possível resolver a disputa.')
    } finally {
      setSalvando(null)
    }
  }

  const faltam = MINIMO_RESOLUCAO - texto.trim().length

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <PageHeader
        title="Disputas"
        description="Enquanto uma disputa está de pé, o valor da fatura fica travado e o designer não saca. Decidir aqui é o que destrava."
        actions={
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {travado > 0 && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Travado agora em disputa
          </p>
          <p className="text-2xl font-semibold tabular-nums">{formatSaldoBloqueado(travado)}</p>
          <p className="text-sm text-muted-foreground">
            Dinheiro de designer parado esperando uma decisão desta tela.
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
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={Scale}
          title={filtro === 'pendentes' ? 'Nenhuma disputa esperando' : 'Nada com esse filtro'}
          description={
            filtro === 'pendentes'
              ? 'Nenhum valor está travado por disputa no momento.'
              : 'Tente outro filtro.'
          }
        />
      ) : (
        <div className="space-y-3">
          {visiveis.map((disputa) => {
            const destinos = TRANSICOES_DISPUTA[disputa.status]
            const trava = aindaBloqueiaSaldo(disputa.status)
            return (
              <div key={disputa.id} className="rounded-xl border bg-card p-4 card-interativo">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium truncate">
                        {disputa.projeto?.nome ?? 'Projeto removido'}
                      </h3>
                      <Badge variant={VARIANTE[disputa.status]}>
                        {formatDisputaStatus(disputa.status)}
                      </Badge>
                      <Badge variant="outline">{formatDisputaTipo(disputa.tipo)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Aberta por {disputa.abertaPor?.nome ?? 'usuário removido'}
                      {disputa.abertaPor?.tipo ? ` (${disputa.abertaPor.tipo.toLowerCase()})` : ''}
                    </p>
                  </div>

                  {disputa.saldoBloqueado > 0 && (
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-semibold tabular-nums">
                        {formatSaldoBloqueado(disputa.saldoBloqueado)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trava ? 'travado' : 'liberado'}
                      </p>
                    </div>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {disputa.descricao}
                </p>

                {disputa.resolucao && (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="font-medium">Decisão: </span>
                    {disputa.resolucao}
                  </p>
                )}

                {(destinos.length > 0 || podeMoverParaAnalise(disputa.status)) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                    {podeMoverParaAnalise(disputa.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={salvando === disputa.id}
                        onClick={() => void moverParaAnalise(disputa)}
                      >
                        {salvando === disputa.id && (
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        )}
                        Assumir a análise
                      </Button>
                    )}
                    {destinos.map((destino) => (
                      <Button
                        key={destino}
                        size="sm"
                        variant={destino === 'ESCALADA' ? 'outline' : 'default'}
                        disabled={salvando === disputa.id}
                        onClick={() => {
                          setDecisao({ disputa, destino })
                          setTexto('')
                        }}
                      >
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

      <Dialog
        open={decisao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setDecisao(null)
            setTexto('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{decisao ? ACAO[decisao.destino] : ''}</DialogTitle>
            <DialogDescription>
              {decisao ? EFEITO_DA_RESOLUCAO[decisao.destino] : ''}
            </DialogDescription>
          </DialogHeader>

          {decisao && decisao.disputa.saldoBloqueado > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                {decisao.destino === 'ESCALADA' ? (
                  <>
                    <span className="font-medium">
                      {formatSaldoBloqueado(decisao.disputa.saldoBloqueado)}
                    </span>{' '}
                    continuam travados.
                  </>
                ) : (
                  <>
                    <span className="font-medium">
                      {formatSaldoBloqueado(decisao.disputa.saldoBloqueado)}
                    </span>{' '}
                    voltam para o saldo sacável do designer assim que você confirmar.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="resolucao" className="text-sm font-medium">
              O motivo da decisão
            </label>
            <Textarea
              id="resolucao"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder="As duas partes vão ler isto. Diga o que foi considerado e por quê."
            />
            <p className="text-xs text-muted-foreground">
              {faltam > 0
                ? `Faltam ${faltam} ${faltam === 1 ? 'caractere' : 'caracteres'}.`
                : 'Fica registrado na disputa.'}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDecisao(null)
                setTexto('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmarDecisao()}
              disabled={faltam > 0 || salvando !== null}
            >
              {salvando !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  )
}
