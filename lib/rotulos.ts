/**
 * Enum do banco → texto que uma pessoa lê.
 *
 * Existe porque a mesma tradução estava sendo reinventada em cada tela, e nas
 * que ninguém reinventou o cliente via `EM_ANALISE` e `PENDENTE` em caixa alta.
 * São os valores reais das máquinas de estado do backend
 * (`src/utils/stateMachine.ts`) — não invente rótulo para status que não existe
 * lá.
 */

/** ARTE_TRANSITIONS: EM_ANALISE → APROVADO | REJEITADO */
const ARTE: Record<string, string> = {
  EM_ANALISE: 'Em análise',
  APROVADO: 'Aprovada',
  REJEITADO: 'Recusada',
}

/** APROVACAO_TRANSITIONS: PENDENTE → APROVADO | REJEITADO */
const APROVACAO: Record<string, string> = {
  PENDENTE: 'Aguardando decisão',
  APROVADO: 'Aprovado',
  REJEITADO: 'Recusado',
}

/** Feedback: uma thread está aberta ou foi resolvida. */
const FEEDBACK: Record<string, string> = {
  PENDENTE: 'Em aberto',
  RESOLVIDO: 'Resolvido',
}

/**
 * Sem rótulo conhecido, devolve o próprio valor em vez de "—": um status novo
 * no backend deve aparecer feio na tela, não sumir dela.
 */
function traduzir(mapa: Record<string, string>, status: string | null | undefined, padrao: string) {
  if (!status) return padrao
  return mapa[status] ?? status
}

export const rotuloArte = (s?: string | null) => traduzir(ARTE, s, 'Em análise')
export const rotuloAprovacao = (s?: string | null) => traduzir(APROVACAO, s, 'Aguardando decisão')
export const rotuloFeedback = (s?: string | null) => traduzir(FEEDBACK, s, 'Em aberto')
