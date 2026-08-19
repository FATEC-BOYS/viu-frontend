'use client'

import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check, Zap, Crown, Star, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { pagamentosApi, Plano, formatReais } from '@/lib/pagamentos'
import { useAuth } from '@/contexts/AuthContext'

const PLAN_ICONS = [Star, Zap, Crown]

/** MB decimais: 10000 MB = 10 GB. Dividir por 1024 dava "49 GB" para 50 GB. */
function formatarStorage(mb: number) {
  return mb >= 1000 ? `${Math.round(mb / 1000)} GB de storage` : `${mb} MB de storage`
}

/** null e -1 significam sem limite; qualquer outro valor é o teto. */
function formatarLimite(valor: number | null | undefined, plural: string, ilimitado: string) {
  if (valor == null || valor === -1) return ilimitado
  return `Até ${valor} ${plural}`
}

function PlanoCard({ plano, index, onAssinar, loading }: {
  plano: Plano
  index: number
  onAssinar: (id: string) => void
  loading: string | null
}) {
  const Icon = PLAN_ICONS[index % PLAN_ICONS.length]
  const isPopular = index === 1
  const reduzir = useReducedMotion()

  return (
    <motion.div
      initial={reduzir ? false : { opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: reduzir ? 0 : index * 0.08, type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={reduzir ? undefined : { y: -4, transition: { type: 'spring', stiffness: 400, damping: 24 } }}
      className="relative"
    >
      {isPopular && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduzir ? 0 : index * 0.08 + 0.2 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
        >
          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow-lg">
            Mais popular
          </Badge>
        </motion.div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border bg-card p-6 h-full flex flex-col transition-shadow ${
          isPopular
            ? 'border-primary ring-1 ring-primary/20 shadow-lg shadow-primary/10'
            : 'border-border hover:shadow-md'
        }`}
      >
        {/* brilho interno do plano em destaque, na cor do tema */}
        {isPopular && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: 'inset 0 0 48px color-mix(in oklch, var(--primary) 12%, transparent)' }}
          />
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${
              isPopular ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Icon className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{plano.nome}</h3>
              <p className="text-xs text-muted-foreground capitalize">{plano.tipo.toLowerCase()}</p>
            </div>
          </div>

          <div className="mb-5">
            <motion.span
              className="text-3xl font-bold tabular-nums text-foreground"
              initial={reduzir ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduzir ? 0 : index * 0.08 + 0.15, type: 'spring' }}
            >
              {plano.precoMensal === 0 ? 'Grátis' : formatReais(plano.precoMensal)}
            </motion.span>
            {plano.precoMensal > 0 && (
              <span className="text-sm text-muted-foreground ml-1">/mês</span>
            )}
          </div>

          {plano.descricao && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{plano.descricao}</p>
          )}

          <ul className="space-y-2 mb-6 flex-1">
            <FeatureItem>{formatarLimite(plano.limitesProjetos, 'projetos', 'Projetos ilimitados')}</FeatureItem>
            <FeatureItem>{formatarLimite(plano.limitesArtes, 'artes', 'Artes ilimitadas')}</FeatureItem>
            {plano.limitesStorageMb != null && (
              <FeatureItem>{formatarStorage(plano.limitesStorageMb)}</FeatureItem>
            )}
            <FeatureItem>Taxa de {plano.taxaPlataformaFormatada} por projeto</FeatureItem>
          </ul>

          <Button
            variant={isPopular ? 'default' : 'secondary'}
            className="w-full rounded-xl font-semibold"
            disabled={loading === plano.id || !plano.ativo}
            onClick={() => onAssinar(plano.id)}
          >
            {loading === plano.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : plano.precoMensal === 0 ? (
              'Começar grátis'
            ) : (
              'Assinar agora'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-muted-foreground">
      <Check className="h-4 w-4 text-primary flex-shrink-0" />
      <span>{children}</span>
    </li>
  )
}

export default function PlanosPage() {
  const { user } = useAuth()
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [assinating, setAssinating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'DESIGNER' | 'CLIENTE'>('DESIGNER')

  useEffect(() => {
    setLoading(true)
    pagamentosApi.getPlanos(tab)
      .then(res => setPlanos(res.data ?? []))
      .catch(() => setError('Erro ao carregar planos'))
      .finally(() => setLoading(false))
  }, [tab])

  async function handleAssinar(planoId: string) {
    setAssinating(planoId)
    try {
      const res = await pagamentosApi.assinar(planoId)
      if (res.data.checkoutUrl) {
        window.open(res.data.checkoutUrl, '_blank')
      } else {
        toast.success('Assinatura ativada com sucesso!')
      }
    } catch {
      toast.error('Erro ao assinar plano. Tente novamente.')
    } finally {
      setAssinating(null)
    }
  }

  const filteredPlanos = planos.filter(p => p.tipo === tab)

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Escolha seu plano</h1>
        <p className="text-sm text-muted-foreground">Comece grátis. Escale quando precisar.</p>
      </motion.div>

      {/* Tab switcher */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center"
      >
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {(['DESIGNER', 'CLIENTE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-5 py-1.5 text-sm font-medium rounded-lg transition-colors"
            >
              {tab === t && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <span className="relative z-10">{t === 'DESIGNER' ? 'Designer' : 'Cliente'}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Cards */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground"
          >
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm">{error}</p>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {filteredPlanos.map((plano, i) => (
              <PlanoCard
                key={plano.id}
                plano={plano}
                index={i}
                onAssinar={handleAssinar}
                loading={assinating}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </FadeIn>
  )
}
