'use client'

import EmptyState from "@/components/layout/EmptyState";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownToLine, Plus, Trash2, CheckCircle2, Clock,
  XCircle, Loader2, AlertCircle, Wallet, Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  pagamentosApi, SaldoInfo, Saque, ChavePix, SaqueStatus,
  CHAVE_PIX_LABELS, STATUS_LABELS, formatReais
} from '@/lib/pagamentos'

// --- animated balance counter ---
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  const start = useRef<number | null>(null)
  const from = useRef(0)

  useEffect(() => {
    from.current = value
    start.current = null
    cancelAnimationFrame(raf.current)

    function tick(ts: number) {
      if (!start.current) start.current = ts
      const pct = Math.min((ts - start.current) / duration, 1)
      // cubic ease out
      const ease = 1 - Math.pow(1 - pct, 3)
      setValue(Math.round(from.current + (target - from.current) * ease))
      if (pct < 1) raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target]) // eslint-disable-line react-hooks/exhaustive-deps

  return value
}

const STATUS_SAQUE_CFG: Record<SaqueStatus, { label: string; icon: React.ElementType; cls: string }> = {
  SOLICITADO: { label: 'Solicitado', icon: Clock, cls: 'text-amber-400 bg-amber-400/10' },
  PROCESSANDO: { label: 'Processando', icon: Loader2, cls: 'text-blue-400 bg-blue-400/10' },
  CONCLUIDO: { label: 'Concluído', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 bg-emerald-500/10' },
  REJEITADO: { label: 'Rejeitado', icon: XCircle, cls: 'text-red-400 bg-red-400/10' },
}

function StatusChip({ status }: { status: SaqueStatus }) {
  const { label, icon: Icon, cls } = STATUS_SAQUE_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// --- sub-components ---

function SaldoCard({ info }: { info: SaldoInfo }) {
  const displayCents = useCountUp(info.saldo)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo disponível</p>
        </div>
        <motion.p
          className="text-4xl font-bold tabular-nums text-foreground"
          key={info.saldo}
        >
          {formatReais(displayCents)}
        </motion.p>
        <div className="flex gap-4 mt-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Total recebido</p>
            <p className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-600 dark:text-emerald-400">{info.totalRecebidoFormatado}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Total sacado</p>
            <p className="text-sm font-medium tabular-nums">{info.totalSacadoFormatado}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ChavePixCard({
  chave, index, onRemove
}: {
  chave: ChavePix
  index: number
  onRemove: (id: string) => void
}) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      await pagamentosApi.removerChavePix(chave.id)
      onRemove(chave.id)
      toast.success('Chave PIX removida.')
    } catch {
      toast.error('Erro ao remover chave.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
      layout
      className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card"
    >
      <div className="p-2 rounded-lg bg-muted flex-shrink-0">
        <Key className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{CHAVE_PIX_LABELS[chave.tipo]}</p>
        <p className="text-sm font-medium truncate">{chave.chave}</p>
        <p className="text-xs text-muted-foreground">{chave.titular}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={handleRemove}
        disabled={removing}
      >
        {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </motion.div>
  )
}

// --- main page ---

export default function SaquesPage() {
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)
  const [saques, setSaques] = useState<Saque[]>([])
  const [chaves, setChaves] = useState<ChavePix[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [saqueOpen, setSaqueOpen] = useState(false)
  const [chaveOpen, setChaveOpen] = useState(false)

  // Saque form
  const [saqueChaveId, setSaqueChaveId] = useState('')
  const [saqueValor, setSaqueValor] = useState('')
  const [savingSaque, setSavingSaque] = useState(false)

  // Chave form
  const [chaveForm, setChaveForm] = useState({ tipo: '', chave: '', titular: '' })
  const [savingChave, setSavingChave] = useState(false)

  useEffect(() => {
    Promise.all([
      pagamentosApi.getSaldo(),
      pagamentosApi.getSaques(),
      pagamentosApi.getChavesPix(),
    ]).then(([s, sq, ch]) => {
      setSaldo(s.data)
      setSaques(sq.data ?? [])
      setChaves(ch.data ?? [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSolicitarSaque() {
    const valor = Math.round(parseFloat(saqueValor.replace(',', '.')) * 100)
    if (!saqueChaveId || isNaN(valor) || valor < 500) {
      toast.error('Valor mínimo de R$ 5,00 e chave PIX obrigatória.')
      return
    }
    setSavingSaque(true)
    try {
      const res = await pagamentosApi.solicitarSaque(saqueChaveId, valor)
      setSaques(prev => [res.data, ...prev])
      setSaldo(prev => prev ? { ...prev, saldo: prev.saldo - valor } : prev)
      toast.success('Saque solicitado!')
      setSaqueOpen(false)
      setSaqueValor('')
      setSaqueChaveId('')
    } catch {
      toast.error('Erro ao solicitar saque. Verifique seu saldo.')
    } finally {
      setSavingSaque(false)
    }
  }

  async function handleCadastrarChave() {
    if (!chaveForm.tipo || !chaveForm.chave || !chaveForm.titular) {
      toast.error('Preencha todos os campos.')
      return
    }
    setSavingChave(true)
    try {
      const res = await pagamentosApi.cadastrarChavePix(chaveForm)
      setChaves(prev => [...prev, res.data])
      toast.success('Chave PIX cadastrada!')
      setChaveOpen(false)
      setChaveForm({ tipo: '', chave: '', titular: '' })
    } catch {
      toast.error('Erro ao cadastrar chave PIX.')
    } finally {
      setSavingChave(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <FadeIn className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saques</h1>
          <p className="text-sm text-muted-foreground">Receba seus ganhos via PIX.</p>
        </div>
        {saldo && saldo.saldo > 0 && (
          <Button
            className="rounded-xl gap-2"
            onClick={() => setSaqueOpen(true)}
            disabled={chaves.length === 0}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Sacar
          </Button>
        )}
      </motion.div>

      {/* Saldo */}
      {saldo && <SaldoCard info={saldo} />}

      {/* Chaves PIX */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chaves PIX</h2>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setChaveOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>
        <AnimatePresence>
          {chaves.length === 0 ? (
            <EmptyState
              icon={Key}
              title="Nenhuma chave PIX cadastrada"
              description="Cadastre uma chave para poder receber seus saques."
              actionLabel="Adicionar chave"
              onAction={() => setChaveOpen(true)}
            />
          ) : (
            chaves.map((c, i) => (
              <ChavePixCard
                key={c.id}
                chave={c}
                index={i}
                onRemove={id => setChaves(prev => prev.filter(ch => ch.id !== id))}
              />
            ))
          )}
        </AnimatePresence>
      </section>

      <Separator />

      {/* Histórico de saques */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Histórico</h2>
        <AnimatePresence>
          {saques.length === 0 ? (
            <EmptyState
              icon={ArrowDownToLine}
              title="Nenhum saque realizado ainda"
              description="Seus saques aparecem aqui assim que o primeiro for solicitado."
            />
          ) : (
            saques.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 26 }}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium tabular-nums">{s.valorFormatado}</p>
                  <p className="text-xs text-muted-foreground">
                    {CHAVE_PIX_LABELS[s.chavePix.tipo]} · {s.chavePix.chave}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <StatusChip status={s.status} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </section>

      {/* Modal: solicitar saque */}
      <Dialog open={saqueOpen} onOpenChange={setSaqueOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar saque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Chave PIX</Label>
              <Select value={saqueChaveId} onValueChange={setSaqueChaveId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione uma chave" />
                </SelectTrigger>
                <SelectContent>
                  {chaves.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {CHAVE_PIX_LABELS[c.tipo]}: {c.chave}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="0,00"
                value={saqueValor}
                onChange={e => setSaqueValor(e.target.value)}
                className="rounded-xl"
                inputMode="decimal"
              />
              {saldo && (
                <p className="text-xs text-muted-foreground">
                  Disponível: {saldo.saldoFormatado} · Mínimo R$ 5,00
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSaqueOpen(false)}>Cancelar</Button>
            <Button onClick={handleSolicitarSaque} disabled={savingSaque}>
              {savingSaque ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Solicitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: cadastrar chave PIX */}
      <Dialog open={chaveOpen} onOpenChange={setChaveOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar chave PIX</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de chave</Label>
              <Select
                value={chaveForm.tipo}
                onValueChange={v => setChaveForm(p => ({ ...p, tipo: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="TELEFONE">Telefone</SelectItem>
                  <SelectItem value="ALEATORIA">Chave aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chave</Label>
              <Input
                placeholder="Insira sua chave"
                value={chaveForm.chave}
                onChange={e => setChaveForm(p => ({ ...p, chave: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Titular</Label>
              <Input
                placeholder="Nome do titular"
                value={chaveForm.titular}
                onChange={e => setChaveForm(p => ({ ...p, titular: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setChaveOpen(false)}>Cancelar</Button>
            <Button onClick={handleCadastrarChave} disabled={savingChave}>
              {savingChave ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  )
}
