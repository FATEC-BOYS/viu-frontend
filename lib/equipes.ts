import { api } from './api'

export type PapelEquipe = 'LIDER' | 'DESIGNER' | 'REVISOR' | 'CLIENTE'

export interface EquipeMembro {
  equipeId: string
  usuarioId: string
  papel: PapelEquipe
  criadoEm: string
  usuario: { id: string; nome: string; email: string; avatar?: string; tipo: string }
}

export interface Equipe {
  id: string
  nome: string
  slug: string
  donoPrincipalId: string
  donoPrincipal: { id: string; nome: string; avatar?: string }
  membros?: EquipeMembro[]
  projetos?: { id: string; nome: string; status: string }[]
  _count?: { membros: number; projetos: number }
  criadoEm: string
  atualizadoEm: string
}

export function formatPapel(papel: PapelEquipe): string {
  const map: Record<PapelEquipe, string> = {
    LIDER: 'Líder',
    DESIGNER: 'Designer',
    REVISOR: 'Revisor',
    CLIENTE: 'Cliente',
  }
  return map[papel] ?? papel
}

export const equipesApi = {
  listar: () =>
    api.get<{ data: Equipe[] }>('/equipes').then((r) => r.data ?? []),

  get: (id: string) =>
    api.get<{ data: Equipe }>(`/equipes/${id}`).then((r) => r.data),

  criar: (nome: string, slug: string) =>
    api.post<{ data: Equipe }>('/equipes', { nome, slug }).then((r) => r.data),

  atualizar: (id: string, data: { nome?: string; slug?: string }) =>
    api.put<{ data: Equipe }>(`/equipes/${id}`, data).then((r) => r.data),

  deletar: (id: string) =>
    api.delete<{ success: boolean }>(`/equipes/${id}`),

  adicionarMembro: (equipeId: string, usuarioId: string, papel: PapelEquipe) =>
    api
      .post<{ data: EquipeMembro }>(`/equipes/${equipeId}/membros`, { usuarioId, papel })
      .then((r) => r.data),

  removerMembro: (equipeId: string, usuarioId: string) =>
    api.delete<{ success: boolean }>(`/equipes/${equipeId}/membros/${usuarioId}`),

  atualizarPapel: (equipeId: string, usuarioId: string, papel: PapelEquipe) =>
    api
      .patch<{ data: EquipeMembro }>(`/equipes/${equipeId}/membros/${usuarioId}`, { papel })
      .then((r) => r.data),

  vincularProjeto: (equipeId: string, projetoId: string) =>
    api.post<{ data: unknown }>(`/equipes/${equipeId}/projetos`, { projetoId }),

  desvincularProjeto: (equipeId: string, projetoId: string) =>
    api.delete<{ success: boolean }>(`/equipes/${equipeId}/projetos/${projetoId}`),
}
