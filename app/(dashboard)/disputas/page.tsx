'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Plus, AlertTriangle, ShieldCheck, Clock, TrendingUp, X, Loader2, ChevronRight } from 'lucide-react'
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
} from '@/lib/protecao'
import { api } from '@/lib/api'

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
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(false)
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

  const podeEnviar = form.descricao.trim().length >= 20 && form.projetoId

  const handleSubmit = async () => {
    setEnviando(true)
    try {
      const disputa = await protecaoApi.abrirDisputa(form)
      toast.success('Disputa registrada. Nossa equipe entrará em contato em até 48h.')
      onSuccess(disputa)
      onOpenChange(false)
      setForm({ tipo: 'CALOTE', descricao: '', projetoId: '' })
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
            <Label>Projeto</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando projetos…
              </div>
            ) : (
              <Select
                value={form.projetoId}
                onValueChange={(v) => setForm((p) => ({ ...p, projetoId: v }))}
              >
                <SelectTrigger>
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

          <div className="space-y-1.5">
            <Label>Tipo de disputa</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as DisputaTipo }))}
            >
              <SelectTrigger>
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
            <Label>Descrição detalhada</Label>
            <Textarea
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

function DisputaCard({ disputa, index }: { disputa: Disputa; index: number }) {
  const criadoEm = new Date(disputa.criadoEm).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
      className="group rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusChip status={disputa.status} />
            <Badge variant="outline" className="text-xs">
              {formatDisputaTipo(disputa.tipo)}
            </Badge>
          </div>

          <p className="text-sm font-medium line-clamp-2 mt-2">{disputa.descricao}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Projeto: <strong className="text-foreground">{disputa.projeto?.nome ?? '—'}</strong></span>
            <span>Aberta em: <strong className="text-foreground">{criadoEm}</strong></span>
            {disputa.saldoBloqueado > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Saldo bloqueado: {formatSaldoBloqueado(disputa.saldoBloqueado)}
              </span>
            )}
          </div>

          {disputa.resolucao && (
            <div className="mt-3 rounded-md bg-muted/50 p-2.5">
              <p className="text-xs font-medium mb-0.5 text-muted-foreground">Resolução:</p>
              <p className="text-sm">{disputa.resolucao}</p>
            </div>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  )
}

// ---------- page ----------

export default function DisputasPage() {
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
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Disputas</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[3.25rem]">
            Canal seguro para registrar e acompanhar divergências entre clientes e designers.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">
            {statusFilter === 'todas' ? 'Nenhuma disputa registrada' : 'Nenhuma disputa com esse status'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter === 'todas'
              ? 'Tudo em ordem por aqui. Caso haja algum problema, use o botão acima.'
              : 'Tente outro filtro.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filtradas.map((d, i) => (
              <DisputaCard key={d.id} disputa={d} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

      <AbrirDisputaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleNovaDisputa}
      />
    </div>
  )
}
