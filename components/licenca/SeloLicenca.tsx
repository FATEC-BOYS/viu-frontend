import { CircleCheck, CircleDashed, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * O estado da licença de uso, na própria peça.
 *
 * É a cláusula 7.1 do anexo virando comportamento: "os direitos permanecem do
 * Designer até a quitação integral". Das cláusulas todas, é a única que o VIU
 * consegue fazer valer sozinho — porque é o único que sabe se a fatura foi
 * paga.
 *
 * A frase fala da licença, nunca da dívida. "Uso ainda não licenciado" é fato
 * sobre a arte e serve a quem for usá-la; "você não pagou" é acusação a uma
 * pessoa — e o link é aberto por quem o designer quiser, inclusive por gente
 * que não tem nada a ver com o pagamento.
 *
 * Sem fatura, o selo não aparece. Rotular toda peça sem cobrança como "não
 * licenciada" seria editorializar onde não há fato.
 *
 * `contexto` decide o quanto a frase conta. No link público ela responde só
 * "dá para usar esta peça?": mencionar a fatura ali é contar a terceiros que o
 * cliente não pagou, e link é encaminhado. Para as partes do projeto — que já
 * veem a fatura na aba ao lado — a frase diz o motivo, que é o que torna o
 * aviso acionável.
 *
 * O servidor já reduz o que sai na rota pública (`licencaPublica`): data de
 * quitação e estorno nem chegam ao navegador. Isto aqui é a outra metade — a
 * redação — e não substitui aquilo.
 */

export type ContextoSelo = 'publico' | 'partes'

export type EstadoLicenca = 'QUITADO' | 'EM_ABERTO' | 'ESTORNADO' | 'NAO_FATURADO'

export interface Licenca {
  estado: EstadoLicenca
  quitadoEm: string | null
}

type Aparencia = {
  icone: typeof CircleCheck
  rotulo: string
  detalhe: string
  classe: string
}

function aparencia(licenca: Licenca, contexto: ContextoSelo): Aparencia | null {
  const publico = contexto === 'publico'

  switch (licenca.estado) {
    case 'QUITADO':
      return {
        icone: CircleCheck,
        rotulo: 'Uso licenciado',
        // A data é transação, não licença: para quem só quer usar a peça, ela
        // não muda a resposta e conta quando o cliente pagou.
        detalhe: publico
          ? 'A peça pode ser usada nos termos combinados no projeto.'
          : licenca.quitadoEm
            ? `Quitado em ${new Date(licenca.quitadoEm).toLocaleDateString('pt-BR')}.`
            : 'Fatura quitada.',
        classe: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
      }

    case 'EM_ABERTO':
      return {
        icone: CircleDashed,
        rotulo: 'Uso ainda não licenciado',
        // Fato sobre a peça, com a regra explicada. Nada de "pague agora" — e,
        // fora do projeto, nem sequer a palavra fatura: quem recebeu o link
        // encaminhado não precisa saber por que ainda não está licenciado.
        detalhe: publico
          ? 'Confirme com o designer antes de publicar ou imprimir.'
          : 'A licença de uso começa com a quitação da fatura do projeto.',
        classe: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
      }

    case 'ESTORNADO':
      return {
        icone: RotateCcw,
        rotulo: 'Uso não licenciado',
        detalhe: 'O pagamento deste projeto foi estornado.',
        classe: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
      }

    // Sem fatura não há o que afirmar.
    case 'NAO_FATURADO':
    default:
      return null
  }
}

/** A versão completa, com a frase — para o viewer e a tela da arte. */
export default function SeloLicenca({
  licenca,
  className,
  contexto = 'partes',
}: {
  licenca: Licenca | null | undefined
  className?: string
  contexto?: ContextoSelo
}) {
  const a = licenca ? aparencia(licenca, contexto) : null
  if (!a) return null

  const Icone = a.icone
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        a.classe,
        className,
      )}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0">
        <span className="font-medium">{a.rotulo}.</span>{' '}
        <span className="text-foreground/70">{a.detalhe}</span>
      </p>
    </div>
  )
}

/**
 * A versão de uma linha, para onde não cabe a frase inteira — a faixa do
 * viewer, um cartão de lista.
 */
export function SeloLicencaCompacto({
  licenca,
  className,
  contexto = 'partes',
}: {
  licenca: Licenca | null | undefined
  className?: string
  contexto?: ContextoSelo
}) {
  const a = licenca ? aparencia(licenca, contexto) : null
  if (!a) return null

  const Icone = a.icone
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
        a.classe,
        className,
      )}
      title={a.detalhe}
    >
      <Icone className="h-3 w-3" aria-hidden />
      {a.rotulo}
    </span>
  )
}
