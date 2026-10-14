// lib/transicoesDoProjeto.ts
import type { ProjetoStatus } from '@/lib/projects'
import { rotuloProjeto } from '@/lib/rotulos'

/**
 * Para onde um projeto pode ir, a partir de onde ele está.
 *
 * ESPELHO. A fonte é `PROJETO_TRANSITIONS`, em
 * `viu-backend/src/utils/stateMachine.ts`, aplicada por
 * `assertValidTransition` no `projetoService` — o servidor recusa o resto, e
 * esta tabela existe só para a tela não OFERECER o que vai ser recusado.
 *
 * Por que uma cópia, sabendo que cópia diverge: o backend não publica a regra
 * em lugar nenhum (não há rota de enums nem campo na resposta do projeto), e
 * sem ela o Board virou uma promessa falsa — medido no app, arrastar para
 * "Aguardando aceite" nem chegava a virar requisição, e sair de "Concluído"
 * levava 500. Entre a cópia declarada e a promessa falsa, a cópia.
 *
 * O arame contra a divergência mora do lado da fonte:
 * `viu-backend/tests/unit/transicoesDoProjetoEspelhadas.test.ts` trava esta
 * tabela e falha apontando para este arquivo. Se o teste de lá quebrou e te
 * trouxe aqui, atualize as duas e não só esta.
 *
 * O jeito certo, para quando valer a pena: a API devolver as transições do
 * projeto junto com ele, e este arquivo virar só o tipo.
 */
export const TRANSICOES_DO_PROJETO: Record<ProjetoStatus, ProjetoStatus[]> = {
  // RASCUNHO espera o aceite do convite. Ninguém VOLTA para cá.
  RASCUNHO: ['EM_ANDAMENTO', 'CANCELADO'],
  EM_ANDAMENTO: ['PAUSADO', 'CONCLUIDO', 'CANCELADO'],
  PAUSADO: ['EM_ANDAMENTO', 'CANCELADO'],
  // Terminais: nada sai daqui.
  CONCLUIDO: [],
  CANCELADO: [],
}

/** Um status terminal não tem saída — nem para onde ele mesmo veio. */
export function ehTerminal(status: ProjetoStatus): boolean {
  return (TRANSICOES_DO_PROJETO[status] ?? []).length === 0
}

export function podeIrDe(de: ProjetoStatus, para: ProjetoStatus): boolean {
  if (de === para) return true
  return (TRANSICOES_DO_PROJETO[de] ?? []).includes(para)
}

/**
 * Por que não dá — na língua de quem está arrastando o cartão, não na do
 * `assertValidTransition`.
 *
 * `null` quando dá. Quem chama trata o `null` como "pode seguir", para a
 * pergunta e a mensagem serem a mesma coisa e não poderem discordar.
 */
export function motivoDaRecusa(
  de: ProjetoStatus,
  para: ProjetoStatus,
  /*
   * Como chamar cada status NESTA tela.
   *
   * Existe porque a primeira versão da mensagem usava `rotuloProjeto` e dizia
   * "Fechado é o fim da linha" em cima de uma coluna escrita "Concluído" —
   * medido no app. São três mapas de rótulo de status no front hoje
   * (`lib/rotulos`, `components/projetos/types` e os títulos do Board) e eles
   * discordam; enquanto discordarem, quem mostra a mensagem diz com que
   * palavras, em vez de a mensagem escolher por conta própria e contradizer a
   * tela em que aparece.
   */
  rotulo: (s: ProjetoStatus) => string = rotuloProjeto,
): string | null {
  if (podeIrDe(de, para)) return null
  if (ehTerminal(de)) {
    return `${rotulo(de)} é o fim da linha deste projeto — ele não volta para ${rotulo(para)}.`
  }
  if (para === 'RASCUNHO') {
    /*
     * Sem o rótulo no meio da frase de propósito: com ele a mensagem saía
     * "Aguardando aceite é só a espera do aceite do convite", medida no app.
     * O que a pessoa precisa saber é que não volta — e por quê.
     */
    return 'Um projeto que já começou não volta para a espera do aceite do convite.'
  }
  const destinos = (TRANSICOES_DO_PROJETO[de] ?? []).map(rotulo).join(', ')
  return `De ${rotulo(de)} dá para ir para: ${destinos}.`
}
