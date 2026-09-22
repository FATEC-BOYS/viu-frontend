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

/**
 * O que a exclusão de uma equipe leva junto, dito com os números da própria
 * equipe.
 *
 * O `confirm()` do navegador dizia só "esta ação é irreversível" — e os dois
 * números que ele omitia estavam desenhados ao lado do botão. Conferido no
 * app: excluir uma equipe com 1 membro e 1 projeto apaga o vínculo do membro
 * (cascade) e devolve o projeto para fora de qualquer equipe (`equipeId` vira
 * nulo), tudo em silêncio.
 *
 * O projeto sobrevive, e dizer isso importa tanto quanto dizer o que some:
 * quem hesita diante de "irreversível" precisa saber que não vai perder
 * trabalho.
 */
export function oQueSePerdeAoExcluir(membros: number, projetos: number): string {
  const partes: string[] = []
  if (membros > 0) {
    partes.push(
      membros === 1
        ? '1 membro perde o acesso pela equipe'
        : `${membros} membros perdem o acesso pela equipe`,
    )
  }
  if (projetos > 0) {
    partes.push(
      projetos === 1
        ? '1 projeto deixa de pertencer a ela'
        : `${projetos} projetos deixam de pertencer a ela`,
    )
  }

  if (partes.length === 0) {
    return 'A equipe está vazia. Excluir não afeta nenhum projeto nem ninguém.'
  }

  const lista = partes.join(' e ')
  const sobreProjetos =
    projetos > 0
      ? ' Nenhum projeto é apagado — eles continuam seus, só sem equipe.'
      : ''
  return `Ao excluir, ${lista}.${sobreProjetos} Não dá para desfazer.`
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
