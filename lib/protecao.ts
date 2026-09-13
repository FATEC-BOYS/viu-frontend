import { api } from './api'

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
  ): Promise<Disputa> {
    const res = await api.put<{ data: Disputa }>(`/disputas/${id}/resolver`, input)
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
    'Encerra a disputa e destrava o valor. Atenção: o produto ainda não tem estorno, então o reembolso ao cliente precisa ser feito por fora.',
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
