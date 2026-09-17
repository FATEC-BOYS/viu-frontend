import { frasedeQuemFalta, type PapelContrato } from './contrato'
import { frasedoQueFalta, type CampoTermo } from './termos'

/**
 * Onde o projeto está na sequência que termina em dinheiro na conta.
 *
 * A aba de Fatura são quatro coisas que só fazem sentido em ordem: combinar as
 * condições, gerar o resumo, as duas partes aceitarem, cobrar. Cada seção sabia
 * do próprio pedaço e avisava por conta própria — o resultado era a mesma
 * pendência escrita três vezes, em três avisos âmbar, com dois botões cheios
 * disputando a atenção (um deles desabilitado, que é o pior dos dois mundos:
 * toma o destaque da tela e não faz nada).
 *
 * Aqui a conta é feita uma vez só, e as seções obedecem. O passo decide qual
 * botão é o cheio e qual é a única frase explicativa da aba.
 */

/** O que quem está olhando pode fazer agora. `null` quando a vez não é dela. */
export type PassoDaCobranca = 'COMBINAR' | 'GERAR' | 'ACEITAR' | 'COBRAR' | 'PAGAR' | null

export interface EstadoDaCobranca {
  /** Designer do projeto ou admin: quem combina, gera e cobra. O cliente lê. */
  podeCobrar: boolean
  /** O que falta nos termos. Vem do servidor junto com o contrato. */
  termosFaltantes: CampoTermo[]
  temContrato: boolean
  /**
   * Os termos mudaram depois que o contrato vigente foi gerado.
   *
   * Quem responde é o servidor: ele renderiza o anexo com os termos de hoje e
   * compara o hash com o do vigente. A tela não tem como calcular.
   */
  contratoDesatualizado: boolean
  /** Papéis que ainda não aceitaram a versão vigente. */
  faltamAceitar: PapelContrato[]
  /** Tenho papel no contrato e ainda não aceitei — o servidor é quem diz. */
  possoAceitar: boolean
  fatura: 'NENHUMA' | 'PENDENTE' | 'PAGA'
  /** A fatura pendente é minha para pagar. */
  souPagador: boolean
  /** Quem paga, para a frase de quem só espera. */
  nomeDoCliente?: string | null
}

export interface Passo {
  passo: PassoDaCobranca
  /** A única frase explicativa da aba. */
  frase: string
  /** Se a frase aponta uma pendência de quem está lendo, e não um estado calmo. */
  pendente: boolean
}

/**
 * A ordem é a do dinheiro, não a da tela: a fatura vem primeiro porque, uma vez
 * cobrado, nada antes dela está em aberto. Um projeto pago não pede mais que se
 * combine nada — dizer "falta combinar exclusividade" depois do PIX cair seria
 * mandar a pessoa arrumar o que já passou.
 */
export function passoDaCobranca(e: EstadoDaCobranca): Passo {
  if (e.fatura === 'PAGA') {
    return { passo: null, frase: 'Este projeto já foi pago.', pendente: false }
  }

  if (e.fatura === 'PENDENTE') {
    return e.souPagador
      ? { passo: 'PAGAR', frase: 'Há uma cobrança aguardando seu pagamento.', pendente: true }
      : {
          passo: null,
          frase: e.nomeDoCliente
            ? `Aguardando o pagamento de ${e.nomeDoCliente}.`
            : 'Aguardando o pagamento do cliente.',
          pendente: false,
        }
  }

  if (e.termosFaltantes.length > 0) {
    if (!e.podeCobrar) {
      return {
        passo: null,
        frase: 'O designer ainda não registrou as condições deste projeto.',
        pendente: false,
      }
    }
    /*
     * Nomear os campos que faltam só quando são poucos.
     *
     * Com a lista inteira em aberto, a frase repetia os sete rótulos que o
     * formulário logo abaixo já mostra vazios — três linhas de texto dizendo o
     * que a tela mostra melhor. Perto do fim é o contrário: com um campo
     * faltando num formulário quase cheio, nomeá-lo poupa a caçada.
     */
    return {
      passo: 'COMBINAR',
      frase:
        e.termosFaltantes.length <= 2
          ? `Falta combinar ${frasedoQueFalta(e.termosFaltantes)}. É o resumo delas que decide de quem é a peça se a conta não for paga.`
          : 'Combine as condições abaixo. É o resumo delas que decide de quem é a peça se a conta não for paga.',
      pendente: true,
    }
  }

  if (!e.temContrato) {
    return e.podeCobrar
      ? {
          passo: 'GERAR',
          frase: 'As condições estão combinadas. Gere o resumo para as duas partes aceitarem.',
          pendente: true,
        }
      : {
          passo: null,
          frase: 'O designer ainda não gerou o resumo do combinado.',
          pendente: false,
        }
  }

  /*
   * Contrato velho vem ANTES de aceitar, e é por isso que ele está aqui.
   *
   * Um resumo que descreve outro acordo não deve ser aceito — aceitá-lo
   * congelaria a concordância no texto errado, que é exatamente o que este
   * documento existe para impedir. Então não se oferece "ler e aceitar": se
   * oferece gerar a versão nova, que reabre os aceites.
   */
  if (e.contratoDesatualizado) {
    return e.podeCobrar
      ? {
          passo: 'GERAR',
          frase:
            'As condições mudaram depois que este resumo foi gerado. Gere a versão nova — a que está valendo descreve outro acordo.',
          pendente: true,
        }
      : {
          passo: null,
          frase:
            'As condições mudaram depois que este resumo foi gerado. O designer precisa gerar a versão nova antes de qualquer aceite valer.',
          pendente: false,
        }
  }

  if (e.possoAceitar) {
    return {
      passo: 'ACEITAR',
      frase: 'O resumo está gerado. Leia e aceite — depois disso ele não muda.',
      pendente: true,
    }
  }

  if (e.faltamAceitar.length > 0) {
    return { passo: null, frase: frasedeQuemFalta(e.faltamAceitar), pendente: false }
  }

  return e.podeCobrar
    ? { passo: 'COBRAR', frase: 'Combinado e aceito pelas duas partes. Pode cobrar.', pendente: true }
    : {
        passo: null,
        frase: 'Combinado e aceito pelas duas partes. Falta o designer emitir a cobrança.',
        pendente: false,
      }
}
