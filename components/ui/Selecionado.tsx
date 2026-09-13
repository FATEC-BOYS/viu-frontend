import { cn } from '@/lib/utils'

/**
 * O destaque em "caixa selecionada" — o número que importa parecendo um objeto
 * escolhido numa ferramenta de design.
 *
 * São três camadas na referência, e só duas são reproduzíveis em CSS:
 *
 *  1. o retângulo pálido com borda fina, encostado na altura das maiúsculas —
 *     o texto vaza um pouco em cima e embaixo, e é esse vazamento que dá a
 *     sensação de "selecionado" em vez de "dentro de um badge";
 *  2. as alças laterais, traço vertical com ponto nas pontas. É o detalhe que
 *     vende o efeito: sem elas sobra um retângulo qualquer;
 *  3. o recorte por cima — a foto passando na frente do texto. Essa exige PNG
 *     com fundo removido e não existe aqui.
 *
 * NADA SAI DA CAIXA DO COMPONENTE. A primeira versão punha a moldura em
 * `inset` negativo e as alças ainda mais para fora; num `<p>` que começa na
 * borda do card, a alça esquerda era cortada e o efeito aparecia manco de um
 * lado só. Agora o espaço lateral é `padding` de verdade: ocupa lugar no
 * fluxo, e por isso não tem como ser recortado por quem hospeda.
 *
 * As medidas são em `em`: o destaque acompanha o tamanho da fonte de quem o
 * usa, de um título grande a um número de tabela, sem uma variante para cada.
 */

/**
 * A alça. Decorativa e `aria-hidden`: quem usa leitor de tela ouve o número,
 * não "traço, ponto, traço".
 */
function Alca({ lado }: { lado: 'esquerda' | 'direita' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1/2 -translate-y-1/2',
        // Mais alta que a moldura de propósito: na referência os traços
        // ultrapassam a caixa em cima e embaixo, e é o que os faz ler como
        // alça e não como borda dupla.
        'flex h-[1.25em] w-[3px] flex-col items-center justify-between',
        lado === 'esquerda' ? 'left-0' : 'right-0',
      )}
    >
      <span className="h-[3px] w-[3px] rounded-full bg-primary" />
      {/* `flex-1` estica o traço entre os dois pontos sem eu calcular altura:
          acompanha a fonte sozinho. */}
      <span className="w-px flex-1 bg-primary/60" />
      <span className="h-[3px] w-[3px] rounded-full bg-primary" />
    </span>
  )
}

export function Selecionado({
  children,
  className,
  alcas = true,
}: {
  children: React.ReactNode
  className?: string
  /**
   * Ligadas por padrão, porque são elas que fazem o efeito. Desligáveis para
   * lista ou tabela, onde várias alças viram ruído e a moldura sozinha já
   * separa o número do resto.
   */
  alcas?: boolean
}) {
  return (
    /*
     * `isolate` cria contexto de empilhamento próprio: o `-z-10` da moldura
     * fica atrás DO TEXTO e não atrás do card, que é o que aconteceria sem
     * ele — o destaque sumiria sob qualquer superfície com fundo.
     */
    <span className={cn('relative isolate inline-block px-[0.42em]', className)}>
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 -z-10 rounded-[4px]',
          'border border-primary/35 bg-primary/10',
          // Aperta na vertical para a moldura ficar MAIS BAIXA que a linha:
          // é o vazamento do texto em cima e embaixo que dá o efeito.
          'inset-y-[0.14em]',
        )}
      />
      {alcas && (
        <>
          <Alca lado="esquerda" />
          <Alca lado="direita" />
        </>
      )}
      {children}
    </span>
  )
}

export default Selecionado
