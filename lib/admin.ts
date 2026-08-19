import { api } from './api'

/**
 * Endpoints atrás de requireRole('ADMIN') no backend.
 *
 * Existiam desde sempre e não tinham nenhuma interface: aprovar o saque de um
 * designer exigia bater na API na mão.
 */

export type SaqueStatus = 'SOLICITADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'CANCELADO'

/**
 * Transições permitidas, espelhando SAQUE_TRANSITIONS em
 * src/utils/stateMachine.ts no backend. O backend é a autoridade — isto existe
 * só para não oferecer um botão que vai voltar 409.
 */
export const TRANSICOES_SAQUE: Record<SaqueStatus, SaqueStatus[]> = {
  SOLICITADO: ['PROCESSANDO', 'CANCELADO'],
  PROCESSANDO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
}

export const ROTULO_SAQUE: Record<SaqueStatus, string> = {
  SOLICITADO: 'Solicitado',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

export type ChavePix = {
  id: string
  tipo: string
  chave: string
}

export type SaqueAdmin = {
  id: string
  valor: number
  valorFormatado: string
  status: SaqueStatus
  criadoEm: string
  criadoEmFormatado: string
  chavePix: ChavePix | null
  designer: { id: string; nome: string; email: string }
}

export type UsuarioAdmin = {
  id: string
  nome: string
  email: string
  tipo: 'DESIGNER' | 'CLIENTE' | 'ADMIN'
  ativo: boolean
  telefone?: string | null
  criadoEm?: string
}

export type StatsUsuarios = {
  total: number
  porTipo: { designers: number; clientes: number; admins: number }
  ativos: number
  inativos: number
  percentualAtivos: number
}

export const adminApi = {
  listarSaques: (filtros?: { status?: SaqueStatus; designerId?: string }) => {
    const qs = new URLSearchParams()
    if (filtros?.status) qs.set('status', filtros.status)
    if (filtros?.designerId) qs.set('designerId', filtros.designerId)
    const sufixo = qs.toString() ? `?${qs}` : ''
    return api.get<{ data: SaqueAdmin[]; success: boolean }>(`/admin/saques${sufixo}`)
  },

  atualizarStatusSaque: (id: string, status: SaqueStatus) =>
    api.put<{ data: SaqueAdmin; success: boolean }>(`/admin/saques/${id}/status`, { status }),

  listarUsuarios: (params?: { page?: number; limit?: number; tipo?: string; ativo?: boolean }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    // O backend rejeita limit > 100 com 400 (validatePagination).
    qs.set('limit', String(params?.limit ?? 50))
    if (params?.tipo && params.tipo !== 'todos') qs.set('tipo', params.tipo)
    if (params?.ativo !== undefined) qs.set('ativo', String(params.ativo))
    return api.get<{
      data: UsuarioAdmin[]
      pagination: { page: number; limit: number; total: number; pages: number }
      success: boolean
    }>(`/usuarios?${qs}`)
  },

  statsUsuarios: () => api.get<{ data: StatsUsuarios; success: boolean }>('/usuarios/stats/overview'),
}
