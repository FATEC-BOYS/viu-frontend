"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

/**
 * Entrada padrão de conteúdo: sobe alguns pixels e aparece.
 *
 * Curta de propósito (0.28s). Animação de tela inteira que demora vira
 * obstáculo em ferramenta de trabalho, onde a pessoa navega o dia todo.
 * Quem pediu menos movimento no sistema não recebe nenhum.
 */
export function FadeIn({
  delay = 0,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      initial={reduzir ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: reduzir ? 0 : delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Lista com entrada escalonada. O passo é pequeno e tem teto: com 40 itens,
 * um stagger ingênuo faria o último aparecer segundos depois.
 */
export function StaggerList({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      initial="oculto"
      animate="visivel"
      variants={{
        visivel: { transition: { staggerChildren: reduzir ? 0 : 0.04 } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      variants={{
        oculto: reduzir ? { opacity: 1 } : { opacity: 0, y: 10 },
        visivel: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
