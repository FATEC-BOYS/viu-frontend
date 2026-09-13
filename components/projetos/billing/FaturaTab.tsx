'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TermosProjetoCard from '@/components/projetos/termos/TermosProjetoCard'
import ContratoProjetoCard from '@/components/projetos/contrato/ContratoProjetoCard'
import { frasedeQuemFalta, type PapelContrato } from '@/lib/contrato'

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
  const router = useRouter()
  const { user } = useAuth()
  const usuarioId = (user as { id?: string } | null)?.id
  const ehAdmin = (user as { tipo?: string } | null)?.tipo === 'ADMIN'
  const podeGerar = ehAdmin || (!!usuarioId && !!designerId && usuarioId === designerId)

  /*
   * Estado do contrato, reportado pelo card acima. A aba não consulta de novo:
   * duas leituras da mesma coisa podem discordar, e discordar aqui significa o
   * aviso dizer "pode cobrar" enquanto o backend recusa.
   */
  const [contratoPendente, setContratoPendente] = useState<
    { temContrato: boolean; faltam: PapelContrato[] } | null
  >(null)

  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [alertaAberto, setAlertaAberto] = useState(false)

  /*
   * As duas listas porque a fatura tem dois lados e cada chamada traz um: o
   * designer não aparece em `?tipo=cliente` e vice-versa. A mesma fatura pode
   * vir nas duas quando alguém é os dois papéis, daí a deduplicação por id.
   */
  const carregar = useCallback(async () => {
    const [c, d] = await Promise.allSettled([
      pagamentosApi.getFaturas('cliente'),
      pagamentosApi.getFaturas('designer'),
    ])
    const todas: Fatura[] = []
    if (c.status === 'fulfilled') todas.push(...(c.value.data ?? []))
    if (d.status === 'fulfilled') todas.push(...(d.value.data ?? []))
    const vistas = new Set<string>()
    setFaturas(
      todas.filter((f) => {
        if (vistas.has(f.id) || f.projeto?.id !== projetoId) return false
        vistas.add(f.id)
        return true
      }),
    )
  }, [projetoId])

  useEffect(() => {
    carregar().catch(console.error).finally(() => setLoading(false))
  }, [carregar])

  /*
   * A fatura que impede outra de nascer.
   *
   * A regra é do backend — `faturaService.criarFatura` recusa quando já existe
   * PENDENTE ou PAGA no projeto, e desde a migração do índice parcial quem
   * garante é o banco. Aqui a mesma regra só decide se a pessoa vê um alerta
   * explicando, em vez de levar um 409 depois do clique.
   */
  const faturaAtiva = faturas.find((f) => f.status === 'PENDENTE' || f.status === 'PAGA') ?? null

  function aoClicarGerar() {
    if (faturaAtiva) {
      setAlertaAberto(true)
      return
    }
    void gerar()
  }

  async function gerar() {
    setGenerating(true)
    try {
      const nova = await pagamentosApi.gerarFaturaDoProjeto(projetoId)
      await carregar()
      toast.success('Fatura gerada.')
      return nova.data
    } catch (e: any) {
      /**
       * O servidor já diz o que faltou — "Projeto não possui orçamento
       * definido", "Já existe uma fatura ativa". Trocar isso por "Erro ao
       * gerar fatura" deixava a pessoa sem a única informação que resolveria
       * o problema dela.
       */
      toast.error(e?.message || 'Erro ao gerar fatura.')
      return null
    } finally {
      setGenerating(false)
    }
  }

  async function cancelarAtiva() {
    if (!faturaAtiva) return false
    try {
      await pagamentosApi.cancelarFatura(faturaAtiva.id)
      await carregar()
      return true
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível cancelar a fatura.')
      return false
    }
  }

  async function apenasCancelar() {
    setGenerating(true)
    const ok = await cancelarAtiva()
    setGenerating(false)
    if (ok) {
      setAlertaAberto(false)
      toast.success('Fatura cancelada. O projeto voltou a ficar sem cobrança.')
    }
  }

  /*
   * Cancela e gera num passo só, e sai do caminho: fecha o alerta e leva para
   * a fatura nova. Abrir outro diálogo por cima deste seria empilhar decisão
   * sobre decisão — a pessoa já decidiu aqui.
   */
  async function substituir() {
    setGenerating(true)
    const cancelou = await cancelarAtiva()
    if (!cancelou) {
      setGenerating(false)
      return
    }
    const nova = await gerar()
    setAlertaAberto(false)
    if (nova?.id) router.push(`/faturas/${nova.id}`)
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
      {/*
        Os termos vêm antes da fatura de propósito: é aqui que a falta deles
        atrapalha. A pessoa abre a aba para cobrar e descobre que ainda não
        combinou sob quais condições — em vez de descobrir depois, numa recusa.
      */}
      <TermosProjetoCard projetoId={projetoId} podeEditar={podeGerar} />

      {/* Depois dos termos porque é deles que o contrato nasce: a ordem na tela
          é a ordem do que acontece — combinar, gerar, as duas partes aceitarem. */}
      <ContratoProjetoCard
        projetoId={projetoId}
        podeGerar={podeGerar}
        aoMudarEstado={({ pronto, temContrato, faltam }) =>
          setContratoPendente(pronto ? null : { temContrato, faltam })
        }
      />

      {/*
        O aviso fica junto do botão, não só no card acima: é aqui que a pessoa
        vai cobrar. Hoje ele só informa — `EXIGIR_CONTRATO_PROJETO` nasce
        desligado, e ligar o bloqueio com os projetos existentes sem contrato
        deixaria todo mundo sem conseguir faturar.
      */}
      {podeGerar && contratoPendente !== null && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          {!contratoPendente.temContrato
            ? 'Este projeto ainda não tem contrato gerado.'
            : frasedeQuemFalta(contratoPendente.faltam)}{' '}
          Dá para cobrar assim mesmo, mas sem contrato aceito não há registro do que foi combinado
          se a cobrança virar discussão.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Faturas do projeto</h3>
        {podeGerar && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
            onClick={aoClicarGerar}
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

      {/*
        O alerta existe porque a recusa chegava como um toast vermelho depois
        do clique, sem dizer o que fazer a seguir. Aqui a pessoa lê a regra
        antes de tentar, vê qual é a fatura que está no caminho, e escolhe.
      */}
      <AlertDialog open={alertaAberto} onOpenChange={setAlertaAberto}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {faturaAtiva?.status === 'PAGA'
                ? 'Este projeto já foi pago'
                : 'Já existe uma fatura neste projeto'}
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                {faturaAtiva?.status === 'PAGA' ? (
                  <>
                    <p>
                      A fatura de <b className="text-foreground">{faturaAtiva.valorFormatado}</b> foi
                      paga
                      {faturaAtiva.dataPagamento
                        ? ` em ${new Date(faturaAtiva.dataPagamento).toLocaleDateString('pt-BR')}`
                        : ''}
                      . Um projeto não pode ter duas cobranças.
                    </p>
                    <p>Para cobrar outro trabalho deste cliente, crie um novo projeto.</p>
                  </>
                ) : (
                  <>
                    <p>
                      Há uma fatura de <b className="text-foreground">{faturaAtiva?.valorFormatado}</b>{' '}
                      aguardando pagamento. Um projeto só pode ter uma cobrança ativa por vez.
                    </p>
                    {/*
                      O aviso que não pode ser sutil: gerar outra apaga a cobrança
                      que o cliente já tem na mão. Se ele guardou o QR code, ele
                      para de funcionar.
                    */}
                    <p className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                      Gerar uma nova <b>cancela a atual</b>. O QR code que o cliente já recebeu deixa
                      de valer, e ele precisará do link novo para pagar.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel disabled={generating} className="mt-0">
              Fechar
            </AlertDialogCancel>

            {faturaAtiva?.status === 'PAGA' ? (
              <AlertDialogAction asChild>
                <Link href={`/faturas/${faturaAtiva.id}`}>Ver a fatura paga</Link>
              </AlertDialogAction>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={apenasCancelar}
                  disabled={generating}
                  className="gap-1.5"
                >
                  {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Cancelar fatura ativa
                </Button>
                <Button onClick={substituir} disabled={generating} className="gap-1.5">
                  {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Gerar nova fatura
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}