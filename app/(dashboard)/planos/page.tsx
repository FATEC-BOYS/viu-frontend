'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Crown, Star, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { pagamentosApi, Plano, formatReais } from '@/lib/pagamentos'
import { useAuth } from '@/contexts/AuthContext'

const PLAN_ICONS = [Star, Zap, Crown]
const PLAN_HIGHLIGHTS = [
  'bg-gradient-to-br from-slate-800 to-slate-900',
   'bg-gradient-to-br from-orange-900/40 to-orange-950',
  'bg-gradient-to-br from-amber-900/40 to-amber-950',
]

function PlanoCard({ plano, index, onAssinar, loading }: {
  plano: Plano
  index: number
  onAssinar: (id: string) => void
  loading: string | null
}) {
  const Icon = PLAN_ICONS[index % PLAN_ICONS.length]
  const highlight = PLAN_HIGHLIGHTS[index % PLAN_HIGHLIGHTS.length]
  const isPopular = index === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -8, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      className="relative"
    >
      {isPopular && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 + 0.2 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
        >
          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold shadow-lg">
            Mais popular
          </Badge>
        </motion.div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl border p-6 h-full flex flex-col ${
          isPopular
            ? 'border-primary/60 shadow-lg shadow-primary/10 ' + highlight
            : 'border-border/60 ' + highlight
        }`}
      >
        {/* glow ring for popular */}
        {isPopular && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: 'inset 0 0 40px rgba(249,115,22,0.08)' }}
          />
        )}

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${
              isPopular ? 'bg-primary/20' : 'bg-white/5'
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
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.15, type: 'spring' }}
            >
              {plano.precoMensal === 0 ? 'Grátis' : formatReais(plano.precoMensal)}
            </motion.span>
            {plano.precoMensal > 0 && (
              <span className="text-sm text-muted-foreground ml-1">/mês</span>
            )}
          </div>

          {plano.descricao && (
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{plano.descricao}</p>
          )}

          <ul className="space-y-2 mb-6 flex-1">
            {plano.limitesProjetos != null && (
              <FeatureItem>
                {plano.limitesProjetos === -1 ? 'Projetos ilimitados' : `Até ${plano.limitesProjetos} projetos`}
              </FeatureItem>
            )}
            {plano.limitesArtes != null && (
              <FeatureItem>
                {plano.limitesArtes === -1 ? 'Artes ilimitadas' : `Até ${plano.limitesArtes} artes`}
              </FeatureItem>
            )}
            {plano.limitesStorageMb != null && (
              <FeatureItem>
                {plano.limitesStorageMb >= 1024
                  ? `${(plano.limitesStorageMb / 1024).toFixed(0)} GB de storage`
                  : `${plano.limitesStorageMb} MB de storage`}
              </FeatureItem>
            )}
            {plano.taxaPlataforma < 0.15 && <FeatureItem>Taxa reduzida ({plano.taxaPlataformaPercent})</FeatureItem>}
          </ul>

          <Button
            className={`w-full rounded-xl font-semibold transition-all ${
              isPopular
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-white/10 hover:bg-white/20 text-foreground'
            }`}
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
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
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
    <div className="min-h-full p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="text-center space-y-2"
      >
        <h1 className="text-2xl font-bold tracking-tight">Escolha seu plano</h1>
        <p className="text-muted-foreground text-sm">Comece grátis. Escale quando precisar.</p>
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
    </div>
  )
}
