'use client'

import EmptyState from "@/components/layout/EmptyState";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Plus, AlertTriangle, ShieldCheck, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  type Disputa,
  type DisputaTipo,
  type DisputaStatus,
  type AbrirDisputaInput,
  protecaoApi,
  formatDisputaTipo,
  formatDisputaStatus,
  formatSaldoBloqueado,
  frasedaRetencao,
  rotuloDoStatusDaFatura,
  SEM_FATURA,
} from '@/lib/protecao'
import { api } from '@/lib/api'
import { pagamentosApi, type Fatura } from '@/lib/pagamentos'
import { useAuth } from '@/contexts/AuthContext'

// ---------- status helpers ----------

const STATUS_CONFIG: Record<DisputaStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ABERTA: {
    label: 'Aberta',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  EM_ANALISE: {
    label: 'Em análise',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
    icon: <Clock className="h-3 w-3" />,
  },
  RESOLVIDA_DESIGNER: {
    label: 'Resolvida (designer)',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  RESOLVIDA_CLIENTE: {
    label: 'Resolvida (cliente)',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  ESCALADA: {
    label: 'Escalada',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    icon: <TrendingUp className="h-3 w-3" />,
  },
}

function StatusChip({ status }: { status: DisputaStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ---------- abrir disputa modal ----------

interface Projeto {
  id: string
  nome: string
}

function AbrirDisputaModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (d: Disputa) => void
}) {
  const { user } = useAuth()
  const souOCliente = user?.tipo === 'CLIENTE'
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(false)
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [carregandoFaturas, setCarregandoFaturas] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState<AbrirDisputaInput>({
    tipo: 'CALOTE',
    descricao: '',
    projetoId: '',
  })

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api
      .get<{ data: Projeto[] }>('/projetos?limit=100')
      .then((r) => setProjetos(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  /*
   * As faturas daquele projeto, filtradas no servidor.
   *
   * `lado` é de que lado da fatura a pessoa está, não o cargo dela: cliente vê
   * o que paga, designer o que recebe. É o mesmo recorte que já protege
   * `/faturas`, então não há como escolher fatura de um projeto alheio.
   */
  const projetoId = form.projetoId
  useEffect(() => {
    if (!open || !projetoId) {
      setFaturas([])
      return
    }
    let vivo = true
    setCarregandoFaturas(true)
    pagamentosApi
      .getFaturas(souOCliente ? 'cliente' : 'designer', projetoId)
      .then((r) => {
        if (vivo) setFaturas(r.data ?? [])
      })
      .catch(() => {
        if (vivo) setFaturas([])
      })
      .finally(() => {
        if (vivo) setCarregandoFaturas(false)
      })
    return () => {
      vivo = false
    }
  }, [open, projetoId, souOCliente])

  const faturaEscolhida = faturas.find((f) => f.id === form.faturaId) ?? null

  const podeEnviar = form.descricao.trim().length >= 20 && form.projetoId

  const limpar = () => setForm({ tipo: 'CALOTE', descricao: '', projetoId: '' })

  const handleSubmit = async () => {
    setEnviando(true)
    try {
      const disputa = await protecaoApi.abrirDisputa(form)
      toast.success('Disputa registrada. Nossa equipe entrará em contato em até 48h.')
      onSuccess(disputa)
      onOpenChange(false)
      limpar()
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao abrir disputa')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Registrar disputa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            {/* `htmlFor` + `id` no gatilho: sem isso o leitor de tela anuncia
                "combobox" sem nome, e clicar no rótulo não foca o campo. */}
            <Label htmlFor="disputa-projeto">Projeto</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando projetos…
              </div>
            ) : (
              <Select
                value={form.projetoId}
                onValueChange={(v) =>
                  // A fatura escolhida some junto: ela é de outro projeto, e
                  // deixá-la no formulário mandaria reter um valor que a pessoa
                  // não está mais olhando (o servidor recusa, mas o formulário
                  // não deveria nem oferecer).
                  setForm((p) => ({ ...p, projetoId: v, faturaId: undefined }))
                }
              >
                <SelectTrigger id="disputa-projeto" className="w-full">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* A fatura em disputa. Só aparece depois de haver projeto: fora
              dele a pergunta não tem resposta possível. */}
          {form.projetoId && (
            <div className="space-y-1.5">
              <Label htmlFor="disputa-fatura">Fatura em disputa</Label>
              {carregandoFaturas ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando faturas…
                </div>
              ) : faturas.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Este projeto ainda não tem faturas. A disputa segue sem valor retido.
                </p>
              ) : (
                <Select
                  value={form.faturaId ?? SEM_FATURA}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, faturaId: v === SEM_FATURA ? undefined : v }))
                  }
                >
                  <SelectTrigger id="disputa-fatura" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_FATURA}>Nenhuma — não é sobre uma cobrança</SelectItem>
                    {faturas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.valorFormatado} · {rotuloDoStatusDaFatura(f.status)}
                        {f.descricao ? ` · ${f.descricao}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* O efeito escrito antes do clique: dinheiro não fica retido sem
                  a pessoa saber que apontou para ele. */}
              <p className="text-xs text-muted-foreground">
                {frasedaRetencao(faturaEscolhida, souOCliente)}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="disputa-tipo">Tipo de disputa</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as DisputaTipo }))}
            >
              <SelectTrigger id="disputa-tipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALOTE">Calote – pagamento não realizado</SelectItem>
                <SelectItem value="ENTREGA_INCOMPLETA">Entrega incompleta</SelectItem>
                <SelectItem value="FRAUDE">Fraude ou comportamento desonesto</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="disputa-descricao">Descrição detalhada</Label>
            <Textarea
              id="disputa-descricao"
              placeholder="Descreva o problema com detalhes (mínimo 20 caracteres). Quanto mais informações, mais rápido conseguimos resolver."
              rows={5}
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              {form.descricao.length} / 20 mínimos
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Aviso:</strong> disputas são tratadas com imparcialidade. Todas as interações são
              registradas em log de auditoria imutável. Disputas infundadas podem ser sancionadas conforme o
              Código de Conduta da plataforma.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!podeEnviar || enviando}>
            {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar disputa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- disputa card ----------

/*
 * O cartão não leva a lugar nenhum — e até agora fingia que levava.
 *
 * Tinha um `ChevronRight` e o realce de cartão clicável (`card-interativo`
 * levanta e ilumina na passagem do mouse), mas não existe rota `/disputas/:id`
 * e nada ali tinha clique. Fora a seta e o realce: o cartão é a leitura, e a
 * lista já mostra tudo o que uma disputa tem.
 */
function DisputaCard({
  disputa,
  index,
  usuarioId,
}: {
  disputa: Disputa
  index: number
  usuarioId: string | null
}) {
  const criadoEm = new Date(disputa.criadoEm).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  /*
   * Quem abriu, dito em toda linha.
   *
   * A lista traz também as disputas abertas CONTRA você — é o que o backend
   * devolve, e agora é o que retém o seu dinheiro. Sem este dado, as duas
   * situações ficavam com exatamente a mesma cara.
   */
  const autor =
    disputa.abertaPorId === usuarioId ? 'Você' : (disputa.abertaPor?.nome ?? 'Outra parte')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <StatusChip status={disputa.status} />
        <Badge variant="outline" className="text-xs">
          {formatDisputaTipo(disputa.tipo)}
        </Badge>
      </div>

      <p className="mt-2 text-sm font-medium line-clamp-2">{disputa.descricao}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Projeto: <strong className="text-foreground">{disputa.projeto?.nome ?? '—'}</strong></span>
        <span>Aberta por: <strong className="text-foreground">{autor}</strong></span>
        <span>Aberta em: <strong className="text-foreground">{criadoEm}</strong></span>
        {/* Até agora nunca aparecia: nenhuma tela mandava `faturaId`, então
            `saldoBloqueado` era sempre 0. Com a fatura escolhida no modal,
            esta linha passa a ser o lugar onde a retenção fica visível. */}
        {disputa.saldoBloqueado > 0 && (
          <span className="font-medium text-amber-600 dark:text-amber-400">
            Retido: {formatSaldoBloqueado(disputa.saldoBloqueado)}
          </span>
        )}
      </div>

      {disputa.resolucao && (
        <div className="mt-3 rounded-md bg-muted/50 p-2.5">
          <p className="mb-0.5 text-xs font-medium text-muted-foreground">Resolução:</p>
          <p className="text-sm">{disputa.resolucao}</p>
        </div>
      )}
    </motion.div>
  )
}

// ---------- page ----------

export default function DisputasPage() {
  const { user } = useAuth()
  const [disputas, setDisputas] = useState<Disputa[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<DisputaStatus | 'todas'>('todas')

  const carregar = async () => {
    setLoading(true)
    try {
      const lista = await protecaoApi.listarDisputas()
      setDisputas(lista)
    } catch {
      toast.error('Erro ao carregar disputas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleNovaDisputa = (d: Disputa) => {
    setDisputas((prev) => [d, ...prev])
  }

  const filtradas = statusFilter === 'todas'
    ? disputas
    : disputas.filter((d) => d.status === statusFilter)

  const abertas = disputas.filter((d) => d.status === 'ABERTA').length
  const emAnalise = disputas.filter((d) => d.status === 'EM_ANALISE').length

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        /*
         * Empilha no telefone. Lado a lado, o botão come 290px dos 390 da tela
         * e a frase de apoio desce em coluna de três palavras — cabe, então o
         * detector de transbordo não acusa, mas ninguém lê. É o mesmo defeito
         * que apareceu na "Zona de perigo" de /configuracoes.
         */
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Disputas</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Canal seguro para registrar e acompanhar divergências entre clientes e designers.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto sm:shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Abrir disputa
        </Button>
      </motion.div>

      {/* Stats */}
      {!loading && disputas.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Total', value: disputas.length, color: 'text-foreground' },
            { label: 'Abertas', value: abertas, color: 'text-red-600 dark:text-red-400' },
            { label: 'Em análise', value: emAnalise, color: 'text-yellow-600 dark:text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filtros por status */}
      {!loading && disputas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(['todas', 'ABERTA', 'EM_ANALISE', 'RESOLVIDA_DESIGNER', 'RESOLVIDA_CLIENTE', 'ESCALADA'] as const).map(
            (s) => (
              <motion.button
                key={s}
                layoutId={`filter-${s}`}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {s === 'todas' ? 'Todas' : formatDisputaStatus(s)}
              </motion.button>
            ),
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={statusFilter === 'todas' ? 'Nenhuma disputa registrada' : 'Nenhuma disputa com esse status'}
          description={
            statusFilter === 'todas'
              ? 'Tudo em ordem por aqui. Caso haja algum problema, use o botão acima.'
              : 'Tente outro filtro.'
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtradas.map((d, i) => (
              <DisputaCard key={d.id} disputa={d} index={i} usuarioId={user?.id ?? null} />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AbrirDisputaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleNovaDisputa}
      />
    </FadeIn>
  )
}
