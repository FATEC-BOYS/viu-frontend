'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Lock } from 'lucide-react'
import { formatReais, type SaldoInfo } from '@/lib/pagamentos'

/**
 * Card de saldo.
 *
 * Saiu de dentro da página para poder ser testado: renderizar a página inteira
 * arrastaria o fetch e o resto do fluxo junto.
 */

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

export default function SaldoCard({ info }: { info: SaldoInfo }) {
  const displayCents = useCountUp(info.saldo)
  const temBloqueio = info.saldoBloqueado > 0

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

        {/*
          Só aparece quando há algo travado. O saldo acima já vem descontado —
          sem esta linha o número simplesmente encolhe, e o designer não tem
          como saber que o dinheiro existe e está retido, não perdido.
        */}
        {temBloqueio && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Bloqueado em disputa
              </p>
              <p className="text-sm font-medium tabular-nums text-amber-700 dark:text-amber-300">
                {info.saldoBloqueadoFormatado}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Valor retido enquanto a disputa não é resolvida. Ele volta para o
                saldo disponível assim que for resolvida a seu favor.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
