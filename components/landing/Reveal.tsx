'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Entrada suave, uma vez só — e sempre a partir de um estado legível.
 *
 * Antes o bloco nascia em `opacity: 0` e só aparecia quando o observer
 * disparava. Rolando funcionava; em tudo o mais, não: print da página,
 * pré-visualização de link compartilhado, leitor que chega por âncora, busca
 * do navegador em texto ainda não revelado. A página inteira, fora o topo,
 * era uma sequência de faixas vazias — que é exatamente o que se vê ao
 * compartilhar o link.
 *
 * Agora só o deslocamento é animado. O texto está lá desde o primeiro quadro.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const semMovimento = useReducedMotion()

  if (semMovimento) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ y: 14 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
