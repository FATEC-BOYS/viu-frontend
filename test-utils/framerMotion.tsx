/**
 * O dublê do framer-motion nos testes de tela.
 *
 * O padrão óbvio — `new Proxy({}, { get: () => (p) => <div {...p} /> })` —
 * devolve uma FUNÇÃO NOVA a cada acesso, então `<motion.div>` é um tipo de
 * componente diferente em cada render. O React não reconhece o elemento como o
 * mesmo, desmonta a subárvore e monta outra; o clique que deveria ter mudado o
 * estado se perde no meio do caminho, e o teste falha dizendo que o modal não
 * abriu quando no app ele abre.
 *
 * Custou uma investigação inteira para aparecer, porque nada na saída acusa:
 * nem erro, nem aviso, só um `queryAllByRole('dialog')` devolvendo zero. Fica
 * num lugar só para ninguém reescrever o proxy ingênuo de novo.
 *
 * Uso, com fábrica assíncrona (`vi.mock` é içado para o topo do arquivo, então
 * não dá para referenciar um import de fora):
 *
 *   vi.mock('framer-motion', async () =>
 *     (await import('@/test-utils/framerMotion')).mockDeFramerMotion())
 */
import * as React from 'react'

/** Props de animação que não devem vazar para o DOM como atributos. */
const DE_ANIMACAO = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants', 'layout', 'layoutId',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'viewport',
  'drag', 'dragConstraints', 'onAnimationStart', 'onAnimationComplete',
])

export function mockDeFramerMotion() {
  // Um componente por tag, criado uma vez: é a identidade estável que faz o
  // React tratar o elemento como o mesmo entre renders.
  const porTag = new Map<string, React.ComponentType<any>>()

  const componenteDe = (tag: string) => {
    const existente = porTag.get(tag)
    if (existente) return existente
    const Componente = ({ children, ...props }: any) => {
      const limpas: Record<string, unknown> = {}
      for (const [chave, valor] of Object.entries(props)) {
        if (!DE_ANIMACAO.has(chave)) limpas[chave] = valor
      }
      return React.createElement(tag, limpas, children)
    }
    Componente.displayName = `motion.${tag}`
    porTag.set(tag, Componente)
    return Componente
  }

  return {
    motion: new Proxy({} as Record<string, React.ComponentType<any>>, {
      get: (_alvo, prop) => (typeof prop === 'string' ? componenteDe(prop) : undefined),
    }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useReducedMotion: () => true,
  }
}
