'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * Entrada suave, uma vez só.
 *
 * `amount` fica baixo de propósito: seções mais altas que a viewport nunca
 * atingiriam um limiar alto, e o bloco ficaria invisível para sempre em telas
 * pequenas. Quem pediu menos movimento no sistema recebe o conteúdo direto,
 * sem animação nenhuma — não uma versão mais lenta dela.
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
