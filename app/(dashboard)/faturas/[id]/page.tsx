'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, Clock, Copy, Loader2,
  QrCode, Smartphone, Zap, AlertCircle, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { pagamentosApi, Fatura, PixPaymentResult } from '@/lib/pagamentos'

type Step = 'detail' | 'cpf' | 'qr' | 'success'

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'detail', label: 'Fatura' },
    { id: 'cpf', label: 'Dados' },
    { id: 'qr', label: 'PIX' },
    { id: 'success', label: 'Pago' },
  ]
  const idx = steps.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <motion.div
            animate={{
              scale: i === idx ? 1.1 : 1,
              backgroundColor: i < idx ? 'oklch(0.74 0.22 35)' : i === idx ? 'oklch(0.74 0.22 35)' : 'oklch(0.3 0 0)'
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          >
            {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </motion.div>
          {i < steps.length - 1 && (
            <motion.div
              animate={{ backgroundColor: i < idx ? 'oklch(0.74 0.22 35)' : 'oklch(0.25 0 0)' }}
              className="w-8 h-0.5 mx-1"
            />
          )}
        </div>
      ))}
    </div>
  )
}

function QrCodeDisplay({ qrCode, qrCodeText }: { qrCode: string; qrCodeText: string }) {
  const [copied, setCopied] = useState(false)

  const imgSrc = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      toast.success('Código copiado!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Erro ao copiar código')
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="relative"
      >
        <div className="relative w-52 h-52 rounded-2xl overflow-hidden border-2 border-primary/40 p-3 bg-white">
          <img src={imgSrc} alt="QR Code PIX" className="w-full h-full object-contain" />
          {/* scan line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none"
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {/* corner accents */}
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos, i) => (
          <motion.div
            key={i}
            className={`absolute ${pos} w-4 h-4 rounded-sm border-2 border-primary`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i, type: 'spring' }}
          />
        ))}
      </motion.div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Smartphone className="h-4 w-4" />
        <span>Abra o app do seu banco e escaneie</span>
      </div>

      <Separator className="w-full" />

      {/* Copia e cola */}
      <div className="w-full space-y-2">
        <p className="text-xs text-muted-foreground text-center">Ou use o código copia e cola</p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={qrCodeText}
            className="text-xs font-mono rounded-xl flex-1 truncate"
          />
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl flex-shrink-0"
            onClick={handleCopy}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </motion.span>
              ) : (
                <motion.span key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </div>
  )
}

function SuccessAnimation() {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative">
        {/* Radiating rings */}
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-emerald-400"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1 + i * 0.5, opacity: 0 }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
        <motion.div
          className="w-20 h-20 rounded-full bg-emerald-400/20 flex items-center justify-center"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <h3 className="text-lg font-bold">Pagamento confirmado!</h3>
        <p className="text-sm text-muted-foreground mt-1">Sua fatura foi marcada como paga.</p>
      </motion.div>
    </motion.div>
  )
}

export default function FaturaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [fatura, setFatura] = useState<Fatura | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('detail')
  const [cpf, setCpf] = useState('')
  const [paying, setPaying] = useState(false)
  const [pix, setPix] = useState<PixPaymentResult | null>(null)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    pagamentosApi.getFatura(id)
      .then(res => setFatura(res.data))
      .catch(() => toast.error('Fatura não encontrada'))
      .finally(() => setLoading(false))
  }, [id])

  // Poll for payment confirmation
  useEffect(() => {
    if (step !== 'qr' || !fatura) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await pagamentosApi.getFatura(fatura.id)
        if (res.data.status === 'PAGA') {
          clearInterval(pollRef.current!)
          setFatura(res.data)
          setStep('success')
        }
      } catch {}
    }, 4000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, fatura])

  function formatCpf(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  async function handlePagar() {
    const rawCpf = cpf.replace(/\D/g, '')
    if (rawCpf.length !== 11) {
      toast.error('CPF inválido')
      return
    }
    setPaying(true)
    try {
      const res = await pagamentosApi.pagarPix(id, rawCpf)
      setPix(res.data)
      setStep('qr')
    } catch {
      toast.error('Erro ao gerar PIX. Tente novamente.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!fatura) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">Fatura não encontrada.</p>
        <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      {/* Back + steps */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Faturas
        </Button>
        <StepIndicator current={step} />
      </motion.div>

      <AnimatePresence mode="wait">
        {/* STEP: detail */}
        {step === 'detail' && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5">
                <p className="text-xs text-muted-foreground mb-1">Fatura</p>
                <h2 className="text-lg font-bold">{fatura.projeto.nome}</h2>
                {fatura.descricao && <p className="text-sm text-muted-foreground mt-1">{fatura.descricao}</p>}
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor total</span>
                  <span className="text-sm font-semibold tabular-nums">{fatura.valorFormatado}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxa plataforma</span>
                  <span className="text-sm tabular-nums">{fatura.taxaPlataformaFormatada}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Designer recebe</span>
                  <span className="text-sm font-semibold tabular-nums text-emerald-400">{fatura.valorLiquidoDesignerFormatado}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{fatura.cliente.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Designer</p>
                    <p className="font-medium">{fatura.designer.nome}</p>
                  </div>
                </div>
              </div>
            </div>

            {fatura.status === 'PENDENTE' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Button className="w-full rounded-xl gap-2" onClick={() => setStep('cpf')}>
                  <Zap className="h-4 w-4" />
                  Pagar com PIX
                </Button>
              </motion.div>
            )}
            {fatura.status !== 'PENDENTE' && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                fatura.status === 'PAGA' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}>
                {fatura.status === 'PAGA' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {fatura.status === 'PAGA' ? 'Esta fatura já foi paga.' : `Fatura ${fatura.status.toLowerCase()}.`}
              </div>
            )}
          </motion.div>
        )}

        {/* STEP: CPF */}
        {step === 'cpf' && (
          <motion.div
            key="cpf"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold">Dados do pagador</h2>
              <p className="text-sm text-muted-foreground mt-1">Necessário para emissão do PIX.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                className="rounded-xl"
                inputMode="numeric"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep('detail')}>
                Voltar
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handlePagar}
                disabled={paying || cpf.replace(/\D/g, '').length !== 11}
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar QR Code'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP: QR */}
        {step === 'qr' && pix && (
          <motion.div
            key="qr"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold">Pague com PIX</h2>
              <p className="text-sm text-muted-foreground mt-1">
                QR válido até {new Date(pix.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
                Aguardando confirmação...
              </p>
            </div>
            <QrCodeDisplay qrCode={pix.qrCode} qrCodeText={pix.qrCodeText} />
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Clock className="h-3.5 w-3.5" />
              </motion.div>
              Verificando pagamento automaticamente...
            </div>
          </motion.div>
        )}

        {/* STEP: success */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <SuccessAnimation />
            <Button className="w-full rounded-xl mt-6" onClick={() => router.push('/faturas')}>
              Ver todas as faturas
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
