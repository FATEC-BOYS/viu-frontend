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
 * NADA SAI DA CAIXA DO COMPONENTE — nem na horizontal nem na vertical, e as
 * duas custaram uma volta.
 *
 * Horizontal: a primeira versão punha a moldura em `inset` negativo e as alças
 * ainda mais para fora; num `<p>` que começa na borda do card, a alça esquerda
 * era cortada e o efeito aparecia manco de um lado só. O espaço lateral virou
 * `padding` de verdade, que ocupa lugar no fluxo.
 *
 * Vertical: a moldura era dimensionada por `inset-y`, ou seja, a partir da
 * ALTURA DA LINHA de quem hospeda. Funcionava em texto de corpo e quebrou no
 * primeiro título grande — `leading-[1.02]` no hero da landing deixa a linha
 * quase do tamanho da fonte, então moldura e alças estouravam para fora e o
 * `overflow-hidden` da seção cortava as duas. Agora a altura sai da FONTE
 * (`em`, centrada), não da linha: o mesmo componente se comporta igual sob
 * qualquer entrelinha.
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
        /*
         * Mais alta que a moldura de propósito: na referência os traços
         * ultrapassam a caixa em cima e embaixo, e é o que os faz ler como alça
         * e não como borda dupla.
         *
         * Abaixo de 1em para caber mesmo sob entrelinha apertada — no hero da
         * landing a linha tem 1.02em, e qualquer coisa maior era cortada pelo
         * `overflow-hidden` da seção.
         */
        'flex h-[0.98em] w-[3px] flex-col items-center justify-between',
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
          /*
           * Altura em `em` e centrada, não `inset-y`: assim ela sai da fonte e
           * não da altura da linha de quem hospeda — ver o comentário do topo.
           *
           * 0,76em é pouco mais que a altura das maiúsculas: número e
           * caixa-alta preenchem a moldura de ponta a ponta, e as ascendentes
           * de minúscula (o "fl" de "flui") passam POR CIMA da borda. É esse
           * vazamento que faz ler como "selecionado" em vez de "dentro de um
           * badge" — com 0,82em a moldura engolia tudo e virava etiqueta.
           */
          'top-1/2 h-[0.76em] -translate-y-1/2',
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
