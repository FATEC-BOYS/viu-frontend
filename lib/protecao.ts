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
