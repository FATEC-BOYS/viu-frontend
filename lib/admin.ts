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
  /**
   * Quando o titular pediu a exclusão (LGPD Art. 18 IV).
   *
   * Preenchido significa conta excluída e anonimizada; nulo com `ativo: false`
   * significa apenas desativada. Antes de existir, os dois casos eram
   * indistinguíveis no painel — sobrava um "Inativo" que não dizia o que tinha
   * acontecido nem quando.
   */
  excluidoEm?: string | null
  _count?: { projetosDesigner: number; projetosCliente: number; artes: number }
}

/** Conta cujo titular pediu exclusão: nome e e-mail ali já são marcador, não dado. */
export function contaExcluida(u: UsuarioAdmin): boolean {
  return !!u.excluidoEm
}

/**
 * O que ainda dá para dizer sobre uma conta excluída.
 *
 * Nome, e-mail, telefone e avatar foram anonimizados — mostrar
 * `deleted+cxxx@removed.viu.app` como se fosse o e-mail da pessoa é exibir
 * marcador no lugar de dado, o mesmo defeito de mostrar um CUID onde deveria
 * estar um nome. O que sobrou e não é PII: quando entrou, quando saiu, o tipo
 * de conta e o volume que ficou para trás por obrigação fiscal.
 */
export function resumoDaContaExcluida(u: UsuarioAdmin): string {
  const projetos = (u._count?.projetosDesigner ?? 0) + (u._count?.projetosCliente ?? 0)
  const artes = u._count?.artes ?? 0
  const partes: string[] = []
  if (projetos > 0) partes.push(`${projetos} ${projetos === 1 ? 'projeto' : 'projetos'}`)
  if (artes > 0) partes.push(`${artes} ${artes === 1 ? 'arte' : 'artes'}`)
  if (partes.length === 0) return 'Nenhum registro vinculado.'
  return `${partes.join(' e ')} seguem vinculados por obrigação fiscal.`
}

export type StatsUsuarios = {
  total: number
  porTipo: { designers: number; clientes: number; admins: number }
  ativos: number
  inativos: number
  percentualAtivos: number
}

/**
 * Resumo da home do admin. Uma requisição para toda a tela: seis contagens, o
 * funil e duas listas.
 *
 * `aprovacoesDecididas` é `null` de propósito, não por lacuna: `Aprovacao` não
 * guarda quando a decisão aconteceu, então a tela mostra "—" em vez de um
 * número que pareceria medido.
 */
export type ResumoAdmin = {
  periodo: { fuso: string; inicioDoDia: string; funilDesde: string; geradoEm: string }
  hoje: {
    contasNovas: number
    projetosCriados: number
    artesEnviadas: number
    linksGerados: number
    feedbacksCriados: number
    aprovacoesSolicitadas: number
    aprovacoesDecididas: number | null
  }
  funil: { janelaDias: number; criados: number; abertos: number; comFeedback: number; comDecisao: number }
  precisaDeVoce: { saquesPendentes: number; disputasAbertas: number; linksTravados: number }
  fila: Array<{
    tipo: 'SAQUE' | 'DISPUTA'
    id: string
    titulo: string
    status: string
    criadoEm: string
    href: string
  }>
  usuariosRecentes: Array<{
    id: string
    nome: string
    email: string
    tipo: 'DESIGNER' | 'CLIENTE' | 'ADMIN'
    emailVerificado: boolean
    criadoEm: string
  }>
}

export const adminApi = {
  resumo: () => api.get<{ data: ResumoAdmin; success: boolean }>('/admin/resumo'),

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
