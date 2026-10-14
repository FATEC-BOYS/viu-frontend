// components/viewer/ApprovalsPanel.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/AuthContext'
import { listarAprovacoes, decidirAprovacao, type AprovacaoDaArte } from '@/lib/aprovacoesDaArte'

/**
 * Decisões desta arte, e — quando for a sua vez — o botão para decidir.
 *
 * O que saiu daqui e por quê:
 *
 * - "Aprovações via link": a rota nunca teve fonte de convidados, então a seção
 *   dizia "Nenhum convidado aprovou ainda" para sempre.
 * - "Fechar para aprovação": o endpoint era um stub que devolvia `{ok:true}`.
 *   A tela mostrava sucesso sobre um no-op.
 * - "(v1)" no título: vinha de um `versao: 1` fixo na rota, não da arte.
 * - Aprovar/Rejeitar em toda linha: o backend recusa decidir pelos outros
 *   (`aprovadorId !== userId` → 403), então a UI oferecia o que ia falhar e
 *   entregava o erro num `alert()`.
 */

/*
 * Um tipo só, vindo de quem busca os dados. Havia dois `Aprovacao` descrevendo
 * a mesma linha — este e o da rota do Next — e dois tipos para a mesma coisa
 * divergem: foi assim que `FeedbackItem` acabou com um `status: 'PENDENTE'`
 * que sequer existia na união do outro.
 */
type Aprovacao = AprovacaoDaArte

const ROTULO: Record<Aprovacao['status'], string> = {
  PENDENTE: 'Aguardando decisão',
  APROVADO: 'Aprovado',
  REJEITADO: 'Ajustes pedidos',
}

const ICONE = { PENDENTE: Clock, APROVADO: Check, REJEITADO: X }

const TOM: Record<Aprovacao['status'], string> = {
  PENDENTE: 'border-border bg-muted text-muted-foreground',
  APROVADO: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  REJEITADO: 'border-destructive/25 bg-destructive/10 text-destructive',
}

function iniciais(nome?: string | null) {
  const base = (nome || 'AP').trim()
  const partes = base.split(' ')
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return base.slice(0, 2).toUpperCase()
}

/*
 * Sem `token`: aprovação nunca passou pelo link. A rota antiga recebia o
 * token, validava, e então devolvia lista vazia a quem não tivesse sessão —
 * decidir exige conta e ser o aprovador. O parâmetro dava a impressão de que
 * o link concedia algo aqui, e não concedia.
 */
export default function ApprovalsPanel({ arteId }: { arteId: string }) {
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [decidindo, setDecidindo] = useState<string | null>(null)
  const [pedindoAjuste, setPedindoAjuste] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  /*
   * Quem está olhando. Só o próprio aprovador pode decidir — é a mesma regra
   * que o backend aplica; aqui ela só deixa de ser uma promessa falsa na tela.
   *
   * Vinha de `perfilEmCache()`, o cache do `localStorage`, que é conveniência
   * de interface e não credencial: vem vazio em aba anônima, com
   * armazenamento bloqueado, e na primeira carga antes de o `AuthProvider`
   * preencher. Nesses casos o aprovador não se reconhecia e os botões de
   * decidir sumiam da própria pessoa que devia decidir.
   */
  const { user } = useAuth()
  const usuarioId = user?.id ?? null

  const carregar = useCallback(async () => {
    try {
      setAprovacoes(await listarAprovacoes(arteId))
    } catch {
      setAprovacoes([])
    } finally {
      setCarregando(false)
    }
  }, [arteId])

  useEffect(() => {
    carregar()
    const t = setInterval(carregar, 30000)
    return () => clearInterval(t)
  }, [carregar])

  async function decidir(
    ap: Aprovacao,
    decisao: 'APROVADO' | 'REJEITADO',
    comentario?: string,
  ) {
    setDecidindo(ap.id)
    try {
      /*
       * Pelo id DESTA linha, que o painel já tem na mão e acabou de mostrar.
       * Ia o `aprovadorId`, e o servidor reconsultava para redescobrir qual
       * pendência era — com a mesma pessoa podendo ter duas abertas na mesma
       * arte, o modo de falhar era registrar a decisão na versão errada.
       */
      await decidirAprovacao(ap.id, decisao, comentario ?? null)
      toast.success(decisao === 'APROVADO' ? 'Arte aprovada' : 'Pedido de ajuste enviado')
      setPedindoAjuste(null)
      setMotivo('')
      await carregar()
    } catch (erro) {
      // A frase do backend diz, por exemplo, que a recusa precisa de motivo.
      toast.error((erro as Error)?.message || 'Falha ao registrar a decisão.')
    } finally {
      setDecidindo(null)
    }
  }

  const pendentes = aprovacoes.filter((a) => a.status === 'PENDENTE').length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Aprovações</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {carregando
            ? 'Carregando…'
            : aprovacoes.length === 0
              ? 'Nada foi enviado para aprovação ainda.'
              : pendentes > 0
                ? `${pendentes} aguardando decisão`
                : 'Tudo decidido'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {!carregando && aprovacoes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Quando o designer solicitar a aprovação desta arte, ela aparece aqui.
            </p>
          )}

          {aprovacoes.map((ap) => {
            const Icone = ICONE[ap.status]
            // A decisão é de quem foi escolhido para decidir, e só enquanto
            // estiver pendente — APROVADO e REJEITADO são terminais no backend.
            const minhaVez = ap.status === 'PENDENTE' && !!usuarioId && ap.aprovador?.id === usuarioId

            return (
              <div key={ap.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">
                        {iniciais(ap.aprovador?.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ap.aprovador?.nome ?? 'Aprovador'}
                      </p>
                      <p suppressHydrationWarning className="text-[11px] text-muted-foreground">
                        {ap.versaoNumero ? `v${ap.versaoNumero} · ` : ''}
                        {ap.criadoEm ? new Date(ap.criadoEm).toLocaleDateString('pt-BR') : ''}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${TOM[ap.status]}`}
                  >
                    <Icone className="h-3 w-3" />
                    {ROTULO[ap.status]}
                  </span>
                </div>

                {ap.comentario && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {ap.comentario}
                  </p>
                )}

                {minhaVez && pedindoAjuste === ap.id && (
                  <div className="mt-3 flex flex-col gap-2">
                    {/*
                      "Pedir ajustes" não é só uma palavra mais gentil que
                      "Recusar": é o que a recusa passou a ser. Sem dizer o que
                      mudar, o designer recebe de volta exatamente o que já
                      tinha — e o backend recusa a recusa muda (422
                      RECUSA_SEM_MOTIVO). O botão travado aqui evita que a
                      pessoa descubra a regra levando um erro.
                    */}
                    <Textarea
                      autoFocus
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="O que precisa mudar?"
                      className="min-h-20 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={decidindo === ap.id || motivo.trim().length === 0}
                        onClick={() => decidir(ap, 'REJEITADO', motivo.trim())}
                      >
                        {decidindo === ap.id ? 'Enviando…' : 'Enviar pedido'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={decidindo === ap.id}
                        onClick={() => {
                          setPedindoAjuste(null)
                          setMotivo('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {minhaVez && pedindoAjuste !== ap.id && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      disabled={decidindo === ap.id}
                      onClick={() => decidir(ap, 'APROVADO')}
                    >
                      {decidindo === ap.id ? 'Enviando…' : 'Aprovar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decidindo === ap.id}
                      onClick={() => {
                        setPedindoAjuste(ap.id)
                        setMotivo('')
                      }}
                    >
                      Pedir ajustes
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
