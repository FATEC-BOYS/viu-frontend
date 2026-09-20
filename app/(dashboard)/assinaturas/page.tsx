'use client'

import EmptyState from "@/components/layout/EmptyState";
import PageHeader from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/layout/Motion";
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Clock, PauseCircle, AlertCircle,
  Loader2, CreditCard, Calendar, RefreshCw, Zap, FolderKanban, Image
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { pagamentosApi, type Vigencia, formatReais } from '@/lib/pagamentos'
import { situacaoDaAssinatura, type Situacao } from '@/lib/assinatura'
import { formatarDia } from '@/lib/diaDeCalendario'

/**
 * A pílula de situação. O rótulo e a cor vêm de `lib/assinatura`, que é a
 * mesma fonte que /perfil usa: estavam escritos duas vezes e já divergiam —
 * aqui "Pendente" era `text-amber-400` puro, que some sobre fundo claro, e
 * "Ativa" trazia `dark:text-emerald-400` declarado duas vezes.
 */
const ICONE: Record<string, React.ElementType> = {
  Ativa: CheckCircle2,
  Pendente: Clock,
  Cancelada: XCircle,
  Pausada: PauseCircle,
  Expirada: AlertCircle,
}

function StatusBadge({ situacao }: { situacao: Situacao }) {
  const Icon = ICONE[situacao.rotulo] ?? AlertCircle
  return (
    <span className={`inline-flex w-fit shrink-0 self-start items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${situacao.classe}`}>
      <Icon className="h-3.5 w-3.5" />
      {situacao.rotulo}
    </span>
  )
}

/** `null` no plano significa sem teto — é decisão de produto, não descuido. */
function limite(n: number | null | undefined) {
  return n === null || n === undefined ? 'Ilimitado' : String(n)
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  // Pelo dia de calendário, não pelo instante: data guardada como meia-noite
  // UTC andava um dia para trás para quem está no Brasil.
  return formatarDia(iso, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AssinaturaPage() {
  const router = useRouter()
  const [vigencia, setVigencia] = useState<Vigencia | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  /*
   * Falha de leitura precisa aparecer COMO falha.
   *
   * Era `.catch(console.error)`: o estado ficava nulo, e nulo desenhava "Você
   * ainda não tem uma assinatura ativa — escolha um plano". Uma oscilação de
   * rede dizia a um assinante que ele não assina nada, e o convidava a
   * contratar o plano que já paga.
   */
  const carregar = () => {
    setLoading(true)
    setErro(null)
    pagamentosApi
      .getMinhaAssinatura()
      .then((res) => setVigencia(res.data))
      .catch((e: any) => setErro(e?.message ?? 'Não foi possível carregar sua assinatura.'))
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  async function handleCancelar() {
    const linha = vigencia?.assinatura
    if (!linha) return
    setCanceling(true)
    try {
      /*
       * O estado novo vem do servidor, não de um remendo local.
       *
       * A tela gravava `status: 'CANCELADA'` por conta própria e mantinha o
       * resto como estava — então uma assinatura recém-cancelada continuava
       * anunciando "Renovação automática: Ativada" e "Próxima cobrança: 17 de
       * out.", enquanto o servidor já tinha desligado a renovação. Quem sabe
       * o que aconteceu é quem escreveu.
       */
      await pagamentosApi.cancelarAssinatura(linha.id)
      const atual = await pagamentosApi.getMinhaAssinatura()
      setVigencia(atual.data)
      toast.success('Assinatura cancelada.')
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao cancelar assinatura.')
    } finally {
      setCanceling(false)
      setConfirmOpen(false)
    }
  }

  const situacao = vigencia ? situacaoDaAssinatura(vigencia) : null
  const plano = vigencia?.plano ?? null
  const linha = vigencia?.assinatura ?? null

  return (
    <FadeIn className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <PageHeader
        title="Minha assinatura"
        description="Gerencie seu plano e pagamentos recorrentes."
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </motion.div>
        ) : erro || !plano ? (
          /* Falha de leitura é falha, e não "você não tem plano". */
          <motion.div key="erro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState
              icon={AlertCircle}
              title="Não foi possível carregar sua assinatura"
              description={erro ?? 'Tente de novo em instantes.'}
              actionLabel="Tentar de novo"
              onAction={carregar}
            />
          </motion.div>
        ) : (
          <motion.div
            key="assinatura"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="overflow-hidden rounded-2xl border border-border/60"
          >
            {/* Header card */}
            <div className="bg-primary/5 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="rounded-xl bg-primary/20 p-2.5"
                    whileHover={{ rotate: 15 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Zap className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div>
                    <p className="mb-0.5 text-xs text-muted-foreground">Plano atual</p>
                    <h2 className="text-lg font-bold">{plano.nome}</h2>
                  </div>
                </div>
                {situacao && <StatusBadge situacao={situacao} />}
              </div>

              <Separator className="my-4" />

              <div className="text-3xl font-bold tabular-nums">
                {plano.precoMensal === 0 ? 'Grátis' : `${formatReais(plano.precoMensal)}/mês`}
              </div>

              {/* A frase que explica a pílula — "cancelada" sozinha não diz
                  até quando o plano ainda vale. */}
              {situacao?.detalhe && (
                <p className="mt-2 text-sm text-muted-foreground">{situacao.detalhe}</p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4 p-6">
              {/*
               * O que se mostra depende de haver contratação.
               *
               * Sem linha assinada — que é o caso de quem está no Gratuito —
               * três dos quatro campos eram "—" ou "Não se aplica": data de
               * início de nada, próxima cobrança de nada, renovação de nada.
               * O que interessa a quem está no Gratuito é onde ele esbarra, e
               * isso o plano diz.
               */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {linha ? (
                  <>
                    <InfoItem icon={Calendar} label="Início" value={fmt(linha.periodoInicio)} />
                    {/*
                     * O rótulo segue o que a data significa. Era sempre
                     * "Próxima cobrança", inclusive numa assinatura cancelada
                     * — a tela anunciava uma cobrança que não vai acontecer.
                     */}
                    <InfoItem
                      icon={Calendar}
                      label={linha.renovacaoAutomatica ? 'Próxima cobrança' : 'Vale até'}
                      value={fmt(linha.periodoFim)}
                    />
                    <InfoItem
                      icon={RefreshCw}
                      label="Renovação automática"
                      value={linha.renovacaoAutomatica ? 'Ativada' : 'Desativada'}
                    />
                  </>
                ) : (
                  <>
                    <InfoItem icon={FolderKanban} label="Projetos" value={limite(plano.limitesProjetos)} />
                    <InfoItem icon={Image} label="Artes" value={limite(plano.limitesArtes)} />
                  </>
                )}
                <InfoItem
                  icon={CreditCard}
                  label="Taxa da plataforma"
                  value={plano.taxaPlataformaFormatada}
                />
              </div>

              {/* Só quando há de fato uma contratação para encerrar: o
                  Gratuito é o piso da conta, não algo que se cancela. */}
              {situacao?.podeCancelar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="pt-2"
                >
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Cancelar assinatura
                  </Button>
                </motion.div>
              )}

              {/* Quem está no Gratuito não tem o que cancelar — tem para onde
                  subir, e essa era a única coisa que a tela não oferecia. */}
              {!linha && (
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => router.push('/planos')}>
                  Ver planos disponíveis
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancelar assinatura</DialogTitle>
            <DialogDescription>
              {/* A promessa e o código agora dizem a mesma coisa: o servidor
                  desliga a renovação e mantém o plano até a data paga. */}
              {linha?.periodoFim
                ? `A renovação é desligada e seu plano continua valendo até ${fmt(linha.periodoFim)}. Depois disso você volta ao Gratuito.`
                : 'A renovação é desligada e você volta ao plano Gratuito.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Manter assinatura</Button>
            <Button
              variant="destructive"
              onClick={handleCancelar}
              disabled={canceling}
            >
              {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  )
}

function InfoItem({
  icon: Icon, label, value
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="p-1.5 rounded-lg bg-muted mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}
