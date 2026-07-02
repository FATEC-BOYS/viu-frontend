'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Clock, PauseCircle, AlertCircle,
  Loader2, CreditCard, Calendar, RefreshCw, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { pagamentosApi, Assinatura, AssinaturaStatus, formatReais } from '@/lib/pagamentos'

const STATUS_CONFIG: Record<AssinaturaStatus, {
  label: string
  icon: React.ElementType
  className: string
}> = {
  ATIVA: { label: 'Ativa', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-400/10' },
  PENDENTE: { label: 'Pendente', icon: Clock, className: 'text-amber-400 bg-amber-400/10' },
  CANCELADA: { label: 'Cancelada', icon: XCircle, className: 'text-red-400 bg-red-400/10' },
  PAUSADA: { label: 'Pausada', icon: PauseCircle, className: 'text-blue-400 bg-blue-400/10' },
  EXPIRADA: { label: 'Expirada', icon: AlertCircle, className: 'text-muted-foreground bg-muted' },
}

function StatusBadge({ status }: { status: AssinaturaStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  )
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AssinaturaPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    pagamentosApi.getMinhaAssinatura()
      .then(res => setAssinatura(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleCancelar() {
    if (!assinatura) return
    setCanceling(true)
    try {
      await pagamentosApi.cancelarAssinatura(assinatura.id)
      setAssinatura(prev => prev ? { ...prev, status: 'CANCELADA' } : null)
      toast.success('Assinatura cancelada.')
    } catch {
      toast.error('Erro ao cancelar assinatura.')
    } finally {
      setCanceling(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <h1 className="text-xl font-bold tracking-tight">Minha assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e pagamentos recorrentes.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </motion.div>
        ) : !assinatura ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-2xl border border-dashed border-border p-12 text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto" />
            </motion.div>
            <p className="text-sm text-muted-foreground">Você ainda não tem uma assinatura ativa.</p>
            <Button asChild>
              <a href="/planos">Ver planos disponíveis</a>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="assinatura"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-border/60 overflow-hidden"
          >
            {/* Header card */}
            <div className="bg-gradient-to-br from-orange-900/20 to-orange-950/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="p-2.5 rounded-xl bg-primary/20"
                    whileHover={{ rotate: 15 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <Zap className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Plano atual</p>
                    <h2 className="text-lg font-bold">{assinatura.plano.nome}</h2>
                  </div>
                </div>
                <StatusBadge status={assinatura.status} />
              </div>

              <Separator className="my-4 bg-white/10" />

              <div className="text-3xl font-bold tabular-nums">
                {assinatura.plano.precoMensal === 0
                  ? 'Grátis'
                  : `${formatReais(assinatura.plano.precoMensal)}/mês`}
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem
                  icon={Calendar}
                  label="Início"
                  value={fmt(assinatura.periodoInicio)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Próxima cobrança"
                  value={fmt(assinatura.periodoFim)}
                />
                <InfoItem
                  icon={RefreshCw}
                  label="Renovação automática"
                  value={assinatura.renovacaoAutomatica ? 'Ativada' : 'Desativada'}
                />
                <InfoItem
                  icon={CreditCard}
                  label="Taxa da plataforma"
                  value={assinatura.plano.taxaPlataformaPercent}
                />
              </div>

              {(assinatura.status === 'ATIVA' || assinatura.status === 'PENDENTE') && (
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
              Ao cancelar, você perderá acesso aos recursos premium ao final do período pago.
              Esta ação não pode ser desfeita.
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
    </div>
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
