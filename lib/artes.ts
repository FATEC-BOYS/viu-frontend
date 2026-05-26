// lib/artes.ts — sem Supabase, usa API REST do backend
import { api } from '@/lib/api'

export type ArteStatus =
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REJEITADO'
  | 'PENDENTE'
  | 'RASCUNHO'

export type ArteOverview = {
  id: string
  nome: string
  descricao?: string | null
  status: ArteStatus
  versao: number
  tipo: string
  tamanho: number
  projeto_id: string
  autor_id: string
  arquivo: string
  criado_em: string
  atualizado_em: string
  projeto?: { id: string; nome: string; cliente?: { id: string; nome: string } | null } | null
  autor?: { id: string; nome: string } | null
  projeto_nome?: string | null
  cliente_nome?: string | null
  autor_nome?: string | null
  feedbacks_count?: number
  tem_aprovacao_aprovada?: boolean
}

export type ArteDetail = {
  id: string
  nome: string
  descricao?: string | null
  arquivo: string
  tipo: string
  tamanho: number
  versao: number
  status: ArteStatus
  projeto_id: string
  autor_id: string
  criado_em: string
  atualizado_em: string
  largura_px?: number | null
  altura_px?: number | null
  projeto?: { id: string; nome: string; cliente?: { id: string; nome: string } | null } | null
  autor?: { id: string; nome: string; avatar?: string | null } | null
  feedbacks?: Array<any>
  tarefas?: Array<any>
  aprovacoes?: Array<any>
}

export type VersaoGroup = {
  versao: number
  arquivos: Array<{
    id: string
    kind: 'PREVIEW' | 'FONTE' | 'ANEXO'
    arquivo: string
    mime?: string | null
    tamanho?: number | null
    criado_em?: string | null
  }>
  criado_em?: string | null
}

function mapArte(a: any): ArteOverview {
  return {
    id: a.id,
    nome: a.nome,
    descricao: a.descricao ?? null,
    status: a.status,
    versao: a.versao ?? 1,
    tipo: a.tipo ?? '',
    tamanho: a.tamanho ?? 0,
    projeto_id: a.projetoId ?? a.projeto_id ?? '',
    autor_id: a.autorId ?? a.autor_id ?? '',
    arquivo: a.previewUrl ?? a.arquivo ?? '',
    criado_em: a.criadoEm ?? a.criado_em ?? '',
    atualizado_em: a.atualizadoEm ?? a.atualizado_em ?? '',
    projeto: a.projeto ?? null,
    autor: a.autor ?? null,
    projeto_nome: a.projeto?.nome ?? null,
    cliente_nome: a.projeto?.cliente?.nome ?? null,
    autor_nome: a.autor?.nome ?? null,
    feedbacks_count: a._count?.feedbacks ?? 0,
    tem_aprovacao_aprovada:
      (a.aprovacoes ?? []).some((ap: any) => ap.status === 'APROVADO'),
  }
}

type ListArtesParams = {
  q?: string
  status?: ArteStatus | 'todos'
  tipo?: string | 'todos'
  projeto?: string
  cliente?: string
  autor?: string
  orderBy?: 'criado_em' | 'nome' | 'projeto' | 'versao' | 'tamanho'
  page?: number
  pageSize?: number
  projetoId?: string
}

export async function listArtesOverview({
  q: searchTerm,
  status,
  tipo,
  page = 1,
  pageSize = 24,
  projetoId,
}: ListArtesParams = {}): Promise<{ data: ArteOverview[]; count: number }> {
  const qs = new URLSearchParams()
  qs.set('limit', String(pageSize))
  qs.set('offset', String((page - 1) * pageSize))
  if (projetoId) qs.set('projetoId', projetoId)
  if (searchTerm?.trim()) qs.set('search', searchTerm.trim())
  if (status && status !== 'todos') qs.set('status', status)
  if (tipo && tipo !== 'todos') qs.set('tipo', tipo)

  const res = await api
    .get<{ data: any[]; total?: number; count?: number }>(`/artes?${qs}`)
    .catch(() => ({ data: [] as any[], total: 0 }))
  const data = (res.data ?? []).map(mapArte)
  return { data, count: (res as any).total ?? (res as any).count ?? data.length }
}

export async function getArteDetail(arteId: string): Promise<ArteDetail | null> {
  const res = await api.get<{ data: any }>(`/artes/${arteId}`).catch(() => null)
  if (!res) return null
  const a = res.data
  return {
    id: a.id,
    nome: a.nome,
    descricao: a.descricao ?? null,
    arquivo: a.previewUrl ?? a.arquivo ?? '',
    tipo: a.tipo ?? '',
    tamanho: a.tamanho ?? 0,
    versao: a.versao ?? 1,
    status: a.status,
    projeto_id: a.projetoId ?? a.projeto_id ?? '',
    autor_id: a.autorId ?? a.autor_id ?? '',
    criado_em: a.criadoEm ?? a.criado_em ?? '',
    atualizado_em: a.atualizadoEm ?? a.atualizado_em ?? '',
    largura_px: a.larguraPx ?? a.largura_px ?? null,
    altura_px: a.alturaPx ?? a.altura_px ?? null,
    projeto: a.projeto ?? null,
    autor: a.autor ?? null,
    feedbacks: a.feedbacks ?? [],
    tarefas: a.tarefas ?? [],
    aprovacoes: a.aprovacoes ?? [],
  }
}

export async function updateArteMetadata(
  arteId: string,
  payload: {
    nome?: string
    descricao?: string | null
    tipo?: string
    status?: ArteStatus
    projetoId?: string | null
  }
) {
  const body: Record<string, any> = {}
  if (payload.nome !== undefined) body.nome = payload.nome
  if (payload.descricao !== undefined) body.descricao = payload.descricao
  if (payload.tipo !== undefined) body.tipo = payload.tipo
  if (payload.status !== undefined) body.status = payload.status
  if (payload.projetoId !== undefined) body.projetoId = payload.projetoId
  await api.put(`/artes/${arteId}`, body)
}

export async function deleteArteById(
  arteId: string,
  _opts?: { storageMode?: string }
) {
  await api.delete(`/artes/${arteId}`)
}

export async function createNovaVersao(params: {
  arteId: string
  file: File
  mime?: string
  largura_px?: number | null
  altura_px?: number | null
  novoNomeOpcional?: string
}) {
  const form = new FormData()
  form.set('file', params.file, params.file.name)
  if (params.novoNomeOpcional) form.set('nome', params.novoNomeOpcional)
  if (params.largura_px != null) form.set('largura_px', String(params.largura_px))
  if (params.altura_px != null) form.set('altura_px', String(params.altura_px))

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('viu_token') : null
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
  const res = await fetch(`${base}/artes/${params.arteId}/versoes`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return { versao: data.data?.versao ?? 1, path: data.data?.arquivo ?? '' }
}

export async function listVersoes(arteId: string): Promise<VersaoGroup[]> {
  const res = await api.get<{ data: any }>(`/artes/${arteId}`).catch(() => null)
  if (!res) return []
  const a = res.data
  return [
    {
      versao: a.versao ?? 1,
      arquivos: [
        {
          id: a.id,
          kind: 'FONTE' as const,
          arquivo: a.previewUrl ?? a.arquivo ?? '',
          mime: a.tipo ?? null,
          tamanho: a.tamanho ?? null,
          criado_em: a.criadoEm ?? a.criado_em ?? null,
        },
      ],
      criado_em: a.criadoEm ?? a.criado_em ?? null,
    },
  ]
}
