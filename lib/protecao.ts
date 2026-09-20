import { api } from './api'
import type { Fatura } from './pagamentos'

export type DisputaTipo = 'CALOTE' | 'ENTREGA_INCOMPLETA' | 'FRAUDE' | 'OUTRO'
export type DisputaStatus = 'ABERTA' | 'EM_ANALISE' | 'RESOLVIDA_DESIGNER' | 'RESOLVIDA_CLIENTE' | 'ESCALADA'

export interface AceiteContratual {
  id: string
  termoVersao: string
  ip?: string
  userAgent?: string
  usuarioId: string
  projetoId: string
  criadoEm: string
  usuario?: { id: string; nome: string; email: string }
  projeto?: { id: string; nome: string }
}

export interface Disputa {
  id: string
  tipo: DisputaTipo
  status: DisputaStatus
  descricao: string
  resolucao?: string
  saldoBloqueado: number
  abertaPorId: string
  projetoId: string
  faturaId?: string
  resolvidaEm?: string
  criadoEm: string
  atualizadoEm: string
  abertaPor?: { id: string; nome: string; email: string; tipo: string }
  projeto?: { id: string; nome: string }
  fatura?: { id: string; valor: number; status: string }
}

/**
 * O que aconteceu com o dinheiro ao resolver a favor do cliente.
 *
 * Viaja junto da disputa porque a tela precisa dizer o que foi feito, e não
 * "encerrada" genérico. `viaGateway: false` é o caso que mais importa: a fatura
 * foi marcada paga sem passar pelo Mercado Pago, então os livros acertaram mas
 * o dinheiro não se moveu — e quem arbitrou é quem precisa saber disso.
 */
export interface ResultadoEstorno {
  /** Falso quando a fatura já estava estornada. Repetir não é erro. */
  aplicado: boolean
  viaGateway: boolean
  /** O valor cheio da fatura, em centavos — é o que o cliente recebe de volta. */
  valorDevolvido: number
}

export interface DisputaResolvida extends Disputa {
  /** Nulo quando não havia o que estornar: decisão pelo designer, escalada,
   *  ou disputa sem fatura associada. */
  estorno: ResultadoEstorno | null
}

export interface AbrirDisputaInput {
  tipo: DisputaTipo
  descricao: string
  projetoId: string
  faturaId?: string
}

export const protecaoApi = {
  async registrarAceite(projetoId: string, termoVersao = '1.0'): Promise<AceiteContratual> {
    const res = await api.post<{ data: AceiteContratual }>('/aceites', { projetoId, termoVersao })
    return res.data
  },

  async verificarAceite(projetoId: string): Promise<{ aceitou: boolean; data?: AceiteContratual }> {
    return api.get<{ aceitou: boolean; data?: AceiteContratual }>(`/aceites/projetos/${projetoId}`)
  },

  async abrirDisputa(input: AbrirDisputaInput): Promise<Disputa> {
    const res = await api.post<{ data: Disputa }>('/disputas', input)
    return res.data
  },

  async listarDisputas(filtros?: { projetoId?: string; status?: string }): Promise<Disputa[]> {
    const params = new URLSearchParams()
    if (filtros?.projetoId) params.set('projetoId', filtros.projetoId)
    if (filtros?.status) params.set('status', filtros.status)
    const query = params.toString()
    const res = await api.get<{ data: Disputa[] }>(`/disputas${query ? `?${query}` : ''}`)
    return res.data
  },

  async getDisputa(id: string): Promise<Disputa> {
    const res = await api.get<{ data: Disputa }>(`/disputas/${id}`)
    return res.data
  },

  /*
   * As duas rotas abaixo existem no backend desde sempre, protegidas por ADMIN,
   * e nenhuma tela as chamava. O efeito prático: uma disputa congelava o saldo
   * do designer (`saldoBloqueado`, descontado direto do que ele pode sacar) e
   * não havia, em lugar nenhum do produto, como descongelar. O dinheiro ficava
   * preso até alguém mexer no banco à mão.
   */
  async moverParaAnalise(id: string): Promise<Disputa> {
    const res = await api.put<{ data: Disputa }>(`/disputas/${id}/analisar`, {})
    return res.data
  },

  async resolverDisputa(
    id: string,
    input: { status: DisputaResolucao; resolucao: string },
  ): Promise<DisputaResolvida> {
    const res = await api.put<{ data: DisputaResolvida }>(`/disputas/${id}/resolver`, input)
    return res.data
  },
}

/** Os status que `resolverDisputa` aceita como destino. */
export type DisputaResolucao = 'RESOLVIDA_DESIGNER' | 'RESOLVIDA_CLIENTE' | 'ESCALADA'

/**
 * Espelha `DISPUTA_TRANSITIONS` do backend. Oferecer um destino que a máquina
 * de estados recusa é como a tela de arte oferecia "Em revisão": um botão que
 * só sabe dar erro.
 */
export const TRANSICOES_DISPUTA: Record<DisputaStatus, DisputaResolucao[]> = {
  ABERTA: ['RESOLVIDA_DESIGNER', 'RESOLVIDA_CLIENTE', 'ESCALADA'],
  EM_ANALISE: ['RESOLVIDA_DESIGNER', 'RESOLVIDA_CLIENTE', 'ESCALADA'],
  ESCALADA: ['RESOLVIDA_DESIGNER', 'RESOLVIDA_CLIENTE'],
  RESOLVIDA_DESIGNER: [],
  RESOLVIDA_CLIENTE: [],
}

/** Só de ABERTA se move para análise; é a triagem. */
export function podeMoverParaAnalise(status: DisputaStatus): boolean {
  return status === 'ABERTA'
}

/**
 * Disputa que ainda segura dinheiro. Igual ao `estadosNaoTerminais` do backend:
 * os estados com alguma saída são os que o cálculo de saldo trata como
 * bloqueantes.
 */
export function aindaBloqueiaSaldo(status: DisputaStatus): boolean {
  return TRANSICOES_DISPUTA[status].length > 0
}

/**
 * O que cada desfecho faz com o dinheiro, em português, para o admin ler antes
 * de clicar. O texto não é decorativo: `ESCALADA` mantém o bloqueio e os dois
 * `RESOLVIDA_*` o derrubam, e confundir os dois é pagar a parte errada.
 */
export const EFEITO_DA_RESOLUCAO: Record<DisputaResolucao, string> = {
  RESOLVIDA_DESIGNER:
    'Libera o valor travado para o saldo do designer, que passa a poder sacar.',
  RESOLVIDA_CLIENTE:
    'Estorna a fatura no Mercado Pago e devolve ao cliente o valor cheio que ele pagou. O que já tinha entrado para o designer sai do saldo dele. Não dá para desfazer.',
  ESCALADA:
    'Mantém o valor travado e marca que o caso subiu. A disputa continua aberta e pode ser resolvida depois.',
}

export function formatDisputaTipo(tipo: DisputaTipo): string {
  const map: Record<DisputaTipo, string> = {
    CALOTE: 'Calote',
    ENTREGA_INCOMPLETA: 'Entrega incompleta',
    FRAUDE: 'Fraude',
    OUTRO: 'Outro',
  }
  return map[tipo] ?? tipo
}

export function formatDisputaStatus(status: DisputaStatus): string {
  const map: Record<DisputaStatus, string> = {
    ABERTA: 'Aberta',
    EM_ANALISE: 'Em análise',
    RESOLVIDA_DESIGNER: 'Resolvida (designer)',
    RESOLVIDA_CLIENTE: 'Resolvida (cliente)',
    ESCALADA: 'Escalada',
  }
  return map[status] ?? status
}

export function formatSaldoBloqueado(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}


/**
 * O que dizer depois de resolver, com base no que realmente aconteceu com o
 * dinheiro.
 *
 * A tela dizia "o valor foi destravado" nos dois desfechos. Para o designer
 * estava certo; para o cliente era o contrário do que passou a acontecer — e
 * mesmo antes já era falso, porque destravar devolvia a parcela ao saldo do
 * designer justamente quando a arbitragem tinha decidido contra ele.
 */
export function frasedoDesfecho(
  destino: DisputaResolucao,
  estorno: ResultadoEstorno | null,
): string {
  if (destino === 'ESCALADA') return 'Disputa escalada. O valor segue travado.'
  if (destino === 'RESOLVIDA_DESIGNER') {
    return 'Disputa encerrada. O valor foi liberado para o saldo do designer.'
  }
  if (!estorno) {
    // Sem fatura associada não havia o que devolver — dizer "estornado" seria
    // inventar um movimento que não houve.
    return 'Disputa encerrada a favor do cliente. Não havia fatura paga para estornar.'
  }
  if (!estorno.aplicado) {
    return 'Disputa encerrada. A fatura já estava estornada.'
  }
  const valor = formatSaldoBloqueado(estorno.valorDevolvido)
  return estorno.viaGateway
    ? `Disputa encerrada e ${valor} estornados ao cliente pelo Mercado Pago.`
    : `Disputa encerrada. ${valor} baixados nos registros, mas esta fatura não passou pelo Mercado Pago — a devolução ao cliente precisa ser feita por fora.`
}


/*
 * O valor de uma disputa é a fatura — e a pergunta não era feita.
 *
 * O backend congela `fatura.valorLiquidoDesigner` em `saldoBloqueado` quando
 * recebe `faturaId`, e nenhuma tela mandava `faturaId`. Conferido no app:
 * fatura PAGA de R$ 10.800, disputa de CALOTE aberta como a tela abria,
 * `saldoBloqueado: 0`. Ou seja, o desconto no saldo, a trava do saque, o bloco
 * "Bloqueado em disputa" e o estorno da resolução eram mecanismo inteiro que a
 * interface do produto não alcançava.
 *
 * Agora a fatura é escolhida no modal, com o efeito escrito embaixo: dinheiro
 * não pode ficar retido sem a pessoa ter apontado para ele.
 */

/** O valor do "nenhuma" no seletor. Radix não aceita `value=""`. */
export const SEM_FATURA = 'nenhuma'

/** O estado da fatura na linha do seletor — `PAGA` é o que muda o efeito. */
export function rotuloDoStatusDaFatura(status: string): string {
  const map: Record<string, string> = {
    PENDENTE: 'não paga',
    PAGA: 'paga',
    CANCELADA: 'cancelada',
    ESTORNADA: 'estornada',
  }
  return map[status] ?? status
}

/**
 * O que vai acontecer com o dinheiro, dito antes de acontecer.
 *
 * A regra é do servidor — só fatura PAGA tem o que reter, porque o saldo do
 * designer só soma faturas pagas. Aqui a frase apenas conta a mesma regra; se
 * as duas discordarem, quem manda é o servidor.
 *
 * Mora neste módulo e não na página porque arquivo de página do Next não pode
 * exportar nada além do componente — e função que não se exporta não se testa.
 */
export function frasedaRetencao(fatura: Fatura | null, souOCliente: boolean): string {
  if (!fatura) {
    return 'Nenhum valor fica retido. A disputa é registrada e analisada do mesmo jeito.'
  }
  if (fatura.status !== 'PAGA') {
    return 'Esta fatura não foi paga, então não há valor a reter. A disputa é registrada do mesmo jeito.'
  }
  /*
   * O líquido do designer não vem na resposta do cliente — o servidor o remove
   * de propósito, para quem paga não ler quanto o VIU cobra e quanto o designer
   * embolsa. Então para o cliente a frase diz o efeito sem o número, em vez de
   * inventar um valor a partir do total.
   */
  if (souOCliente || !fatura.valorLiquidoDesignerFormatado) {
    return 'O valor que o designer receberia por esta fatura fica retido até a disputa ser resolvida.'
  }
  return `${fatura.valorLiquidoDesignerFormatado} ficam retidos do seu saldo até a disputa ser resolvida.`
}
