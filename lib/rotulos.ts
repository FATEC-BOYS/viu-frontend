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
  // `REVISAO` foi removido do produto: não tinha entrada nem saída na máquina
  // de estados, então arte que caísse lá travava para sempre. O rótulo fica
  // como rede — linha antiga que a migração de dados ainda não tocou, ou
  // resposta em cache, renderiza "Em revisão" em vez de gritar o enum cru.
  REVISAO: 'Em revisão',
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
 * PROJETO_TRANSITIONS: RASCUNHO → EM_ANDAMENTO → PAUSADO/CONCLUIDO/CANCELADO.
 *
 * Este mapa morava dentro de um `useMemo` na tela do projeto, e por isso a
 * tela do cliente — que é outra — escrevia `CONCLUIDO` em caixa alta. Um mapa
 * preso numa tela não é tradução do produto: é tradução daquela tela.
 */
const PROJETO: Record<string, string> = {
  RASCUNHO: 'Rascunho — aguardando aceite',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADO: 'Pausado',
  /*
   * "Concluído", e não "Fechado".
   *
   * Eram quatro mapas de rótulo de projeto no front, e este era o único que
   * dizia "Fechado": o cartão da lista mostrava "Concluído", a tela do projeto
   * "Fechado", para o mesmo status. A palavra é escolha da Alessandra.
   */
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
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
export const rotuloProjeto = (s?: string | null) => traduzir(PROJETO, s, 'Em andamento')

/**
 * O mesmo status, encurtado para cabeçalho de coluna do Board.
 *
 * Só a diferença deliberada mora aqui: "Rascunho — aguardando aceite" é uma
 * frase, e frase não cabe num cabeçalho que ainda leva o contador do lado.
 * Todo o resto vem de `rotuloProjeto`, para não haver dois lugares onde
 * "Concluído" possa virar outra coisa — foi assim que apareceram quatro mapas
 * discordando.
 */
const COLUNA_CURTA: Record<string, string> = {
  RASCUNHO: 'Aguardando aceite',
}

export const rotuloColunaDoProjeto = (s?: string | null) =>
  (s && COLUNA_CURTA[s]) || rotuloProjeto(s)

/**
 * O tipo de uma arte chega em dois formatos diferentes, porque a origem é
 * inconsistente: o seed grava `IMAGEM`/`DOCUMENTO` e o upload grava o mimetype
 * (`image/png`). Na tela, os dois viram a mesma palavra — mostrar "image/png"
 * ao lado de "DOCUMENTO" na mesma lista é expor a bagunça do banco a quem só
 * quer saber o que é o arquivo.
 */
const TIPO_ARTE: Record<string, string> = {
  IMAGEM: 'Imagem',
  VIDEO: 'Vídeo',
  AUDIO: 'Áudio',
  DOCUMENTO: 'Documento',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  application: 'Documento',
  text: 'Documento',
}

export function rotuloTipoArte(tipo?: string | null): string {
  if (!tipo) return 'Arquivo'
  const familia = tipo.includes('/') ? tipo.split('/')[0] : tipo.toUpperCase()
  return TIPO_ARTE[familia] ?? 'Arquivo'
}
