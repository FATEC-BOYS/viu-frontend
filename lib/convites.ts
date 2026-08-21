import { api } from './api'

/**
 * Convites de projeto e de equipe.
 *
 * Há dois caminhos para responder um convite, e os dois existem por um motivo:
 *
 * - por token: é o link que chega no e-mail. O token cru não é persistido no
 *   backend (o banco guarda só o hash), então ele existe apenas naquele link.
 * - por id: é o que a tela de convites pendentes usa, já que a listagem não
 *   tem — e não pode ter — o token cru.
 */

export type ConviteStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'CANCELADO' | 'EXPIRADO'

export interface UsuarioResumo {
  id: string
  nome: string
  email?: string
  avatar?: string | null
  tipo?: string
}

export interface ConviteProjeto {
  id: string
  status: ConviteStatus
  expiraEm: string
  criadoEm: string
  respondidoEm?: string | null
  projeto: { id: string; nome: string; descricao?: string | null }
  convidado?: UsuarioResumo
  convidadoPor?: UsuarioResumo
}

/**
 * Convite listado a partir do projeto. O backend não repete os dados do
 * projeto aqui — quem consulta já sabe de qual projeto se trata.
 */
export interface ConviteDoProjeto {
  id: string
  status: ConviteStatus
  expiraEm: string
  criadoEm: string
  respondidoEm?: string | null
  convidado: UsuarioResumo
  convidadoPor?: UsuarioResumo
}

export interface ConviteEquipe {
  id: string
  status: ConviteStatus
  papel: 'LIDER' | 'DESIGNER' | 'REVISOR' | 'CLIENTE'
  expiraEm: string
  criadoEm: string
  respondidoEm?: string | null
  equipe: { id: string; nome: string; slug: string }
  convidado?: UsuarioResumo
  convidadoPor?: UsuarioResumo
}

/**
 * O convite por token é consultado sem sessão — o convidado pode abrir o link
 * do e-mail antes de entrar na conta. Por isso é um fetch direto, sem o header
 * de Authorization que o `api` injeta.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getPublico<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data ?? null) as T | null
  } catch {
    return null
  }
}

export const convitesApi = {
  /** Convites de projeto pendentes para o usuário autenticado. */
  listarPendentes: () =>
    api.get<{ data: ConviteProjeto[] }>('/convites').then((r) => r.data ?? []),

  getPorToken: (token: string) =>
    getPublico<ConviteProjeto>(`/convites/${encodeURIComponent(token)}`),

  aceitarPorToken: (token: string) =>
    api.post<{ data: { id: string; nome: string; status: string } }>(
      `/convites/${encodeURIComponent(token)}/aceitar`,
      {},
    ),

  recusarPorToken: (token: string) =>
    api.post<{ success: boolean }>(`/convites/${encodeURIComponent(token)}/recusar`, {}),

  aceitarPorId: (conviteId: string) =>
    api.post<{ data: { id: string; nome: string; status: string } }>(
      `/convites/id/${conviteId}/aceitar`,
      {},
    ),

  recusarPorId: (conviteId: string) =>
    api.post<{ success: boolean }>(`/convites/id/${conviteId}/recusar`, {}),

  /** Convites emitidos por um projeto — visível a quem já tem acesso a ele. */
  listarDoProjeto: (projetoId: string) =>
    api.get<{ data: ConviteDoProjeto[] }>(`/projetos/${projetoId}/convites`).then((r) => r.data ?? []),

  /**
   * Convida alguém para o projeto. O backend só aceita projeto em RASCUNHO —
   * é o aceite do convite que move o projeto para EM_ANDAMENTO.
   */
  convidar: (projetoId: string, convidadoId: string) =>
    api.post<{ data: { token: string } }>(`/projetos/${projetoId}/convites`, { convidadoId }),
}

export const convitesEquipeApi = {
  /** Convites de equipe pendentes para o usuário autenticado. */
  listarPendentes: () =>
    api.get<{ data: ConviteEquipe[] }>('/equipes/convites').then((r) => r.data ?? []),

  getPorToken: (token: string) =>
    getPublico<ConviteEquipe>(`/equipes/convites/${encodeURIComponent(token)}`),

  aceitarPorToken: (token: string) =>
    api.post<{ data: { id: string; nome: string; slug: string } }>(
      `/equipes/convites/${encodeURIComponent(token)}/aceitar`,
      {},
    ),

  recusarPorToken: (token: string) =>
    api.post<{ success: boolean }>(`/equipes/convites/${encodeURIComponent(token)}/recusar`, {}),

  aceitarPorId: (conviteId: string) =>
    api.post<{ data: { id: string; nome: string; slug: string } }>(
      `/equipes/convites/id/${conviteId}/aceitar`,
      {},
    ),

  recusarPorId: (conviteId: string) =>
    api.post<{ success: boolean }>(`/equipes/convites/id/${conviteId}/recusar`, {}),

  /** Convites emitidos por uma equipe — só líderes e admins enxergam. */
  listarDaEquipe: (equipeId: string) =>
    api.get<{ data: ConviteEquipe[] }>(`/equipes/${equipeId}/convites`).then((r) => r.data ?? []),

  convidar: (equipeId: string, convidadoId: string, papel: ConviteEquipe['papel']) =>
    api.post<{ data: { token: string } }>(`/equipes/${equipeId}/convites`, { convidadoId, papel }),
}

/** Rótulo curto de status, para badges. */
export function formatConviteStatus(status: ConviteStatus): string {
  const map: Record<ConviteStatus, string> = {
    PENDENTE: 'Pendente',
    ACEITO: 'Aceito',
    RECUSADO: 'Recusado',
    CANCELADO: 'Cancelado',
    EXPIRADO: 'Expirado',
  }
  return map[status] ?? status
}

/** Quanto falta para expirar, em texto curto ("expira em 3 dias"). */
export function formatExpiracao(expiraEm: string): string {
  const restanteMs = new Date(expiraEm).getTime() - Date.now()
  if (Number.isNaN(restanteMs)) return ''
  if (restanteMs <= 0) return 'expirado'

  const dias = Math.floor(restanteMs / 86_400_000)
  if (dias >= 1) return `expira em ${dias} ${dias === 1 ? 'dia' : 'dias'}`

  const horas = Math.max(1, Math.floor(restanteMs / 3_600_000))
  return `expira em ${horas} ${horas === 1 ? 'hora' : 'horas'}`
}
