import { formatarDia } from '@/lib/diaDeCalendario'

/** O mesmo formato que os campos do cartão usam — duas grafias da mesma data
 *  no mesmo bloco fazem parecer que são datas diferentes. */
const DIA_LONGO = { day: '2-digit', month: 'short', year: 'numeric' } as const
import type { AssinaturaStatus, Vigencia } from '@/lib/pagamentos'

/**
 * Como se descreve a situação de uma assinatura — num lugar só.
 *
 * O rótulo e a cor estavam escritos duas vezes, em /perfil e em /assinaturas,
 * e as duas cópias já discordavam: uma tinha `dark:text-emerald-400` repetido
 * duas vezes, a outra pintava "Pendente" de `text-amber-400` puro, que some
 * sobre fundo claro. Status novo entraria numa e não na outra.
 *
 * O `Record` completo obriga o par: status sem rótulo ou sem cor não compila.
 */

export const ROTULO_ASSINATURA: Record<AssinaturaStatus, string> = {
  ATIVA: 'Ativa',
  PENDENTE: 'Pendente',
  CANCELADA: 'Cancelada',
  PAUSADA: 'Pausada',
  EXPIRADA: 'Expirada',
}

/*
 * Cada cor tem variante clara E escura. As classes antigas usavam só o tom
 * 400, que nasceu para fundo escuro: sobre o cartão branco, "Pendente" em
 * `amber-400` fica quase ilegível. O tom 600/700 entra no claro, o 400 no
 * escuro.
 */
export const CLASSE_ASSINATURA: Record<AssinaturaStatus, string> = {
  ATIVA: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PENDENTE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  CANCELADA: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  PAUSADA: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  EXPIRADA: 'bg-muted text-muted-foreground border-border',
}

export type Situacao = {
  /** O que a pílula diz. */
  rotulo: string
  classe: string
  /** A frase de apoio, quando há algo a explicar. */
  detalhe: string | null
  /** Se ainda faz sentido oferecer o botão de cancelar. */
  podeCancelar: boolean
}

/**
 * A situação lida a partir do que vale agora, e não só do status.
 *
 * Uma assinatura cancelada que ainda vale até o fim do período pago fica
 * gravada como `ATIVA` com a renovação desligada — é assim que o servidor
 * preserva o que a pessoa pagou. Sem esta função a tela leria "Ativa" e não
 * contaria que ela está correndo para o fim, que é justamente o que quem
 * cancelou quer confirmar.
 */
export function situacaoDaAssinatura(v: Vigencia): Situacao {
  if (v.cancelada) {
    return {
      rotulo: 'Cancelada',
      classe: CLASSE_ASSINATURA.CANCELADA,
      detalhe: v.vigenteAte
        ? `Seu plano vale até ${formatarDia(v.vigenteAte, DIA_LONGO)}. Depois disso você volta ao Gratuito.`
        : 'Vale até o fim do período pago; depois você volta ao Gratuito.',
      podeCancelar: false,
    }
  }

  const status = v.assinatura?.status
  if (!status) {
    /*
     * Sem linha assinada a pessoa está no Gratuito — não "sem plano". Era o
     * que a tela dizia, e o resto do sistema já discordava: a taxa da fatura e
     * o teto de recursos vinham do Gratuito desde sempre.
     */
    return {
      rotulo: 'Ativa',
      classe: CLASSE_ASSINATURA.ATIVA,
      detalhe: null,
      // Não há o que cancelar no Gratuito: ele é o piso, não uma contratação.
      podeCancelar: false,
    }
  }

  return {
    rotulo: ROTULO_ASSINATURA[status] ?? status,
    classe: CLASSE_ASSINATURA[status] ?? CLASSE_ASSINATURA.EXPIRADA,
    detalhe:
      status === 'PENDENTE'
        ? 'O checkout ainda não foi concluído. Termine para ativar o plano.'
        : status === 'PAUSADA'
          ? 'A cobrança recorrente parou. Revise o pagamento para continuar no plano.'
          : null,
    podeCancelar: status === 'ATIVA' || status === 'PAUSADA',
  }
}
