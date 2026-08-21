// lib/projects.ts — sem Supabase, usa API REST do backend
import { api, getAll } from '@/lib/api'

// Os cinco status do backend (PROJETO_TRANSITIONS em src/utils/stateMachine.ts).
// RASCUNHO e CANCELADO faltavam aqui: um projeto criado com convite nasce em
// RASCUNHO e só sai de lá quando a outra parte aceita.
export type ProjetoStatus =
  | 'RASCUNHO'
  | 'EM_ANDAMENTO'
  | 'PAUSADO'
  | 'CONCLUIDO'
  | 'CANCELADO'

export interface Projeto {
  id: string
  nome: string
  descricao: string | null
  status: ProjetoStatus
  orcamento: number | null
  prazo: string | null
  designer: { id: string; nome: string }
  cliente: { id: string; nome: string }
  // GET /projetos já devolvia `equipe`; o front simplesmente ignorava.
  equipe: { id: string; nome: string; slug: string } | null
  criado_em: string
  atualizado_em: string
}

export interface ProjetoInput {
  nome: string
  descricao?: string | null
  status: ProjetoStatus
  orcamento: number
  prazo: string | null
  cliente_id: string
  /** Agrupamento visual do projeto. Opcional — projeto sem equipe é o padrão. */
  equipe_id?: string | null
}

// Os ids são CUIDs gerados no banco ('c' + 24 hex), não UUIDs. O regex de UUID
// que estava aqui reprovava todo id real, então createProjeto sempre falhava
// com "Selecione o cliente". Mesmo formato validado pelo backend em
// validateCuidParam.
const isCuid = (v?: string | null) => !!v && /^c[a-z0-9]{24}$/i.test(v)

const isValidISO = (v: string) => !Number.isNaN(Date.parse(v))

export function formatBRLFromCents(cents: number | null): string {
  if (cents == null) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100
  )
}

export function parseBRLToCents(input: string): number | null {
  const onlyDigits = input.replace(/[^\d]/g, '')
  if (!onlyDigits) return null
  const cents = parseInt(onlyDigits, 10)
  if (Number.isNaN(cents)) return null
  return cents
}

function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('viu_user') || '').id
  } catch {
    return null
  }
}

function mapProjeto(p: any): Projeto {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao ?? null,
    status: p.status as ProjetoStatus,
    orcamento: p.orcamento ?? null,
    prazo: p.prazo ?? null,
    designer: { id: p.designer?.id ?? '', nome: p.designer?.nome ?? '' },
    cliente: { id: p.cliente?.id ?? '', nome: p.cliente?.nome ?? '' },
    equipe: p.equipe
      ? { id: p.equipe.id, nome: p.equipe.nome, slug: p.equipe.slug ?? '' }
      : null,
    criado_em: p.criadoEm ?? p.criado_em ?? '',
    atualizado_em: p.atualizadoEm ?? p.atualizado_em ?? '',
  }
}

function validateProjetoInput(payload: ProjetoInput): string[] {
  const errs: string[] = []
  const nome = (payload.nome ?? '').trim()
  if (!nome) errs.push('Informe o nome')
  if (nome.length > 140) errs.push('Máx. 140 caracteres no nome')
  if (payload.descricao != null && payload.descricao.trim().length > 2000)
    errs.push('Máx. 2000 caracteres na descrição')
  if (!['EM_ANDAMENTO', 'CONCLUIDO', 'PAUSADO'].includes(payload.status))
    errs.push('Status inválido')
  if (
    typeof payload.orcamento !== 'number' ||
    !Number.isFinite(payload.orcamento) ||
    payload.orcamento < 0
  )
    errs.push('Orçamento deve ser um número ≥ 0')
  if (payload.prazo != null && !isValidISO(payload.prazo))
    errs.push('Prazo inválido (use ISO-8601)')
  if (!isCuid(payload.cliente_id)) errs.push('Selecione o cliente')
  return errs
}

function validateProjetoPatch(patch: Partial<ProjetoInput>): string[] {
  const errs: string[] = []
  if (patch.nome !== undefined) {
    const n = patch.nome.trim()
    if (!n) errs.push('Informe o nome')
    if (n.length > 140) errs.push('Máx. 140 caracteres no nome')
  }
  if (
    patch.descricao !== undefined &&
    patch.descricao != null &&
    patch.descricao.trim().length > 2000
  )
    errs.push('Máx. 2000 caracteres na descrição')
  if (
    patch.status !== undefined &&
    !['EM_ANDAMENTO', 'CONCLUIDO', 'PAUSADO'].includes(patch.status)
  )
    errs.push('Status inválido')
  if (
    patch.orcamento !== undefined &&
    (typeof patch.orcamento !== 'number' ||
      !Number.isFinite(patch.orcamento) ||
      patch.orcamento < 0)
  )
    errs.push('Orçamento deve ser um número ≥ 0')
  if (
    patch.prazo !== undefined &&
    patch.prazo != null &&
    !isValidISO(patch.prazo)
  )
    errs.push('Prazo inválido (use ISO-8601)')
  if (patch.cliente_id !== undefined && !isCuid(patch.cliente_id))
    errs.push('Selecione o cliente')
  return errs
}

export async function listProjetos(params?: {
  search?: string
  status?: ProjetoStatus | 'todos'
  orderBy?: string
  ascending?: boolean
  limit?: number
  offset?: number
}) {
  const { search, status, limit = 50, offset = 0 } = params || {}
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))
  if (status && status !== 'todos') qs.set('status', status)
  if (search?.trim()) qs.set('search', search.trim())

  const res = await api.get<{ data: any[]; total?: number; count?: number }>(
    `/projetos?${qs}`
  )
  const rows = (res.data ?? []).map(mapProjeto)
  return { rows, count: (res as any).total ?? (res as any).count ?? rows.length }
}

export async function getProjeto(id: string): Promise<Projeto> {
  const res = await api.get<{ data: any }>(`/projetos/${id}`)
  return mapProjeto(res.data)
}

export async function createProjeto(payload: ProjetoInput & { skipBriefingEval?: boolean }) {
  const errs = validateProjetoInput(payload)
  if (errs.length) throw new Error(errs.join(' | '))
  const designerId = getCurrentUserId()
  if (!designerId) throw new Error('Usuário não autenticado')
  const res = await api.post<{ data: any }>('/projetos', {
    nome: payload.nome.trim(),
    descricao: payload.descricao?.trim() || null,
    status: payload.status,
    orcamento: Math.round(payload.orcamento * 100),
    prazo: payload.prazo ?? null,
    clienteId: payload.cliente_id,
    designerId,
    ...(payload.equipe_id ? { equipeId: payload.equipe_id } : {}),
    ...(payload.skipBriefingEval ? { skipBriefingEval: true } : {}),
  })
  return mapProjeto(res.data)
}

export async function updateProjeto(id: string, patch: Partial<ProjetoInput>) {
  const errs = validateProjetoPatch(patch)
  if (errs.length) throw new Error(errs.join(' | '))
  const body: Record<string, unknown> = {}
  if (patch.nome !== undefined) body.nome = patch.nome.trim()
  if (patch.descricao !== undefined) body.descricao = patch.descricao?.trim() || null
  if (patch.status !== undefined) body.status = patch.status
  if (patch.prazo !== undefined) body.prazo = patch.prazo ?? null
  if (patch.cliente_id !== undefined) body.clienteId = patch.cliente_id
  // null é significativo aqui: desvincula o projeto da equipe.
  if (patch.equipe_id !== undefined) body.equipeId = patch.equipe_id
  if (patch.orcamento !== undefined) {
    body.orcamento =
      typeof patch.orcamento === 'number' && Number.isFinite(patch.orcamento)
        ? Math.round(patch.orcamento * 100)
        : null
  }
  const res = await api.put<{ data: any }>(`/projetos/${id}`, body)
  return mapProjeto(res.data)
}

export async function deleteProjeto(id: string) {
  await api.delete(`/projetos/${id}`)
  return true
}

export async function getProjetoCabecalho(id: string): Promise<Projeto> {
  return getProjeto(id)
}

/**
 * Designers e clientes já conhecidos, derivados dos projetos do usuário.
 *
 * GET /usuarios é restrito a ADMIN — chamá-lo aqui devolvia 403, que o
 * .catch() antigo transformava em lista vazia sem avisar ninguém. Para
 * descobrir alguém fora dessa lista, a UI usa o typeahead
 * /api/contacts/search, que roda sobre GET /usuarios/buscar.
 */
async function pessoasDosProjetos(campo: 'designer' | 'cliente') {
  const projetos = await getAll<any>('/projetos')
  const porId = new Map<string, { id: string; nome: string }>()
  for (const p of projetos) {
    const u = p[campo]
    if (u?.id && !porId.has(u.id)) porId.set(u.id, { id: u.id, nome: u.nome })
  }
  return [...porId.values()]
}

export async function listDesigners() {
  return pessoasDosProjetos('designer')
}

export async function listClientes() {
  return pessoasDosProjetos('cliente')
}

export interface ProjetoResumo {
  artesAprovadas: number
  artesPendentes: number
  artesRejeitadas: number
  artesTotal: number
  prazoProjeto: string | null
  proximaRevisao: string | null
  orcamentoCentavos: number | null
  pessoas: { designers: number; clientes: number; aprovadores: number; observadores: number }
  sparkline: Array<{ dia: string; qtd: number }>
}

export async function getProjetoResumo(id: string): Promise<ProjetoResumo> {
  const [proj, artes] = await Promise.all([
    getProjeto(id),
    // contagem precisa exige todas as artes, não as 200 primeiras
    getAll<any>(`/artes?projetoId=${id}`).catch(() => [] as any[]),
  ])
  const artesAprovadas = artes.filter((a: any) => a.status === 'APROVADO').length
  const artesRejeitadas = artes.filter((a: any) => a.status === 'REJEITADO').length
  const artesTotal = artes.length
  return {
    artesAprovadas,
    artesPendentes: artesTotal - artesAprovadas - artesRejeitadas,
    artesRejeitadas,
    artesTotal,
    prazoProjeto: proj.prazo,
    proximaRevisao: null,
    orcamentoCentavos: proj.orcamento,
    pessoas: { designers: 1, clientes: 1, aprovadores: 0, observadores: 0 },
    sparkline: [],
  }
}

export type ProximoPassoKind =
  | 'GENERIC'
  | 'APROVADOR'
  | 'PRAZO'
  | 'TAREFA'
  | 'APROVACAO'
  | 'ENVIAR_APROVACAO'
  | 'DEFINIR_PRAZO_PROJETO'
  | 'ATRIBUIR_TAREFA'
  | 'CONVIDAR_APROVADOR'
  | 'LEMBRAR_APROVADORES'

export interface ProximoPasso {
  tipo?: string
  kind: ProximoPassoKind
  label: string
  meta?: Record<string, any>
  done?: boolean
}

export async function getProximosPassos(id: string): Promise<ProximoPasso[]> {
  const passos: ProximoPasso[] = []
  const proj = await getProjeto(id).catch(() => null)
  if (!proj?.prazo)
    passos.push({ kind: 'DEFINIR_PRAZO_PROJETO', label: 'Definir prazo do projeto' })
  const artesRes = await api
    .get<{ data: any[] }>(`/artes?projetoId=${id}&limit=10`)
    .catch(() => ({ data: [] as any[] }))
  const pendentes = (artesRes.data ?? []).filter((a: any) =>
    ['EM_ANALISE', 'PENDENTE'].includes(a.status)
  )
  if (pendentes.length > 0) {
    passos.push({
      kind: 'ENVIAR_APROVACAO',
      label: `Enviar para aprovação: "${pendentes[0].nome}"`,
      meta: { arteId: pendentes[0].id },
    })
  }
  return passos
}

export interface ArteListItem {
  id: string
  nome: string
  descricao: string | null
  tipo: string
  versao: number
  status: string
  criado_em: string
  autor_nome: string | null
  versoes_qtd: number
  tags?: string[]
}

export interface ArteFilters {
  tipo?: string | null
  status?: string | null
  autorId?: string | null
  tag?: string | null
  limit?: number
  offset?: number
}

export async function listArtes(
  projetoId: string,
  filters?: ArteFilters
): Promise<{ rows: ArteListItem[]; count: number }> {
  const { tipo, status, limit = 12, offset = 0 } = filters || {}
  const qs = new URLSearchParams()
  qs.set('projetoId', projetoId)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))
  if (tipo) qs.set('tipo', tipo)
  if (status) qs.set('status', status)
  const res = await api
    .get<{ data: any[]; total?: number; count?: number }>(`/artes?${qs}`)
    .catch(() => ({ data: [] as any[], total: 0 }))
  const rows: ArteListItem[] = (res.data ?? []).map((a: any) => ({
    id: a.id,
    nome: a.nome,
    descricao: a.descricao ?? null,
    tipo: a.tipo,
    versao: a.versao,
    status: a.status,
    criado_em: a.criadoEm ?? a.criado_em ?? '',
    autor_nome: a.autor?.nome ?? null,
    versoes_qtd: 1,
    tags: [],
  }))
  return { rows, count: (res as any).total ?? (res as any).count ?? rows.length }
}

export interface ArteQuickPeek {
  arte: {
    id: string
    nome: string
    descricao: string | null
    tipo: string
    versao: number
    status: string
    criado_em: string
  }
  versoes: Array<{ id: string; versao: number; status: string; criado_em: string }>
  feedbacks: Array<{ id: string; conteudo: string; autor_id: string; criado_em: string }>
}

export async function getArteQuickPeek(arteId: string): Promise<ArteQuickPeek> {
  const res = await api.get<{ data: any }>(`/artes/${arteId}`)
  const a = res.data
  return {
    arte: {
      id: a.id,
      nome: a.nome,
      descricao: a.descricao ?? null,
      tipo: a.tipo,
      versao: a.versao,
      status: a.status,
      criado_em: a.criadoEm ?? a.criado_em ?? '',
    },
    versoes: [
      {
        id: a.id,
        versao: a.versao,
        status: a.status,
        criado_em: a.criadoEm ?? a.criado_em ?? '',
      },
    ],
    feedbacks: [],
  }
}

export type TarefaStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export interface TarefaCard {
  id: string
  titulo: string
  status: TarefaStatus
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  prazo: string | null
  responsavel_nome: string | null
}

export interface TarefasKanban {
  pendente: { top: TarefaCard[]; total: number }
  em_andamento: { top: TarefaCard[]; total: number }
  concluida: { top: TarefaCard[]; total: number }
}

export async function getTarefasKanban(projetoId: string): Promise<TarefasKanban> {
  const res = await api
    .get<{ data: any[] }>(`/tarefas?projetoId=${projetoId}&limit=50`)
    .catch(() => ({ data: [] as any[] }))
  const all = (res.data ?? []).map(
    (t: any): TarefaCard => ({
      id: t.id,
      titulo: t.titulo,
      status: t.status,
      prioridade: t.prioridade ?? 'MEDIA',
      prazo: t.prazo ?? null,
      responsavel_nome: t.responsavel?.nome ?? null,
    })
  )
  const byStatus = (s: TarefaStatus) => all.filter((t) => t.status === s)
  const pendentes = byStatus('PENDENTE')
  const emAndamento = byStatus('EM_ANDAMENTO')
  const concluidas = byStatus('CONCLUIDA')
  return {
    pendente: { top: pendentes.slice(0, 3), total: pendentes.length },
    em_andamento: { top: emAndamento.slice(0, 3), total: emAndamento.length },
    concluida: { top: concluidas.slice(0, 3), total: concluidas.length },
  }
}

export interface AprovadorEstado {
  aprovacao_id: string
  aprovador_nome: string | null
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  criado_em: string
  arte_id: string
  arte_nome: string | null
  versao: number
}

export interface AprovacaoPainel {
  regra: {
    todosAprovadores: boolean
    exigirAprovacaoDesigner: boolean
    prazoDias: number | null
  }
  estados: AprovadorEstado[]
}

export async function getAprovacaoPainel(projetoId: string): Promise<AprovacaoPainel> {
  // GET /artes não traz as aprovações (só _count), então a fonte é /aprovacoes
  // filtrado pelo projeto.
  const aprovacoes = await getAll<any>(`/aprovacoes?projetoId=${projetoId}`).catch(
    () => [] as any[]
  )

  const estados: AprovadorEstado[] = aprovacoes.map((ap: any) => ({
    aprovacao_id: ap.id,
    aprovador_nome: ap.aprovador?.nome ?? null,
    status: ap.status,
    criado_em: ap.criadoEm ?? ap.criado_em ?? '',
    arte_id: ap.arte?.id ?? ap.arteId,
    arte_nome: ap.arte?.nome ?? null,
    versao: ap.arte?.versao ?? 1,
  }))

  return {
    regra: { todosAprovadores: false, exigirAprovacaoDesigner: false, prazoDias: null },
    estados,
  }
}

export async function lembrarAprovadores(aprovacaoId: string): Promise<{ ok: true }> {
  await api.put(`/aprovacoes/${aprovacaoId}/lembrar`, {})
  return { ok: true }
}

export type AtividadeTipo =
  | 'ARTE_CRIADA'
  | 'ARTE_VERSAO'
  | 'FEEDBACK'
  | 'TAREFA_CRIADA'
  | 'APROVACAO'
  | 'CONVITE'

export interface AtividadeItem {
  tipo: AtividadeTipo
  ref_id: string
  titulo: string
  autor_id: string | null
  autor_nome: string | null
  autor_avatar: string | null
  versao: number | null
  criado_em: string
  texto: string | null
}

export async function listAtividade(
  projetoId: string,
  params?: { limit?: number; offset?: number }
): Promise<{ rows: AtividadeItem[]; count: number }> {
  const limit = params?.limit ?? 20
  const offset = params?.offset ?? 0
  const page = Math.floor(offset / limit) + 1
  const res = await api
    .get<{ data: any[]; pagination?: { total: number } }>(
      `/artes?projetoId=${projetoId}&page=${page}&limit=${limit}`
    )
    .catch(() => ({ data: [] as any[], pagination: { total: 0 } }))
  const rows: AtividadeItem[] = (res.data ?? []).map((a: any) => ({
    tipo: 'ARTE_CRIADA' as AtividadeTipo,
    ref_id: a.id,
    titulo: a.nome,
    autor_id: a.autor?.id ?? a.autorId ?? null,
    autor_nome: a.autor?.nome ?? null,
    autor_avatar: a.autor?.avatar ?? null,
    versao: a.versao ?? null,
    criado_em: a.criadoEm ?? a.criado_em ?? '',
    texto: null,
  }))
  return { rows, count: res.pagination?.total ?? rows.length }
}

export interface Participante {
  usuario_id: string
  papel: 'OWNER' | 'DESIGNER' | 'CLIENTE' | 'APROVADOR' | 'OBSERVADOR'
  nome: string
  email: string
}

export interface ConviteRow {
  email: string
  papel: 'DESIGNER' | 'CLIENTE' | 'APROVADOR' | 'OBSERVADOR'
  status: 'PENDENTE' | 'ACEITO' | 'EXPIRADO'
  criado_em: string
}

export async function listParticipantes(projetoId: string): Promise<Participante[]> {
  const proj = await getProjeto(projetoId).catch(() => null)
  if (!proj) return []
  const parts: Participante[] = []
  if (proj.designer?.id)
    parts.push({ usuario_id: proj.designer.id, papel: 'DESIGNER', nome: proj.designer.nome, email: '' })
  if (proj.cliente?.id)
    parts.push({ usuario_id: proj.cliente.id, papel: 'CLIENTE', nome: proj.cliente.nome, email: '' })
  return parts
}

export async function listConvites(projetoId: string): Promise<ConviteRow[]> {
  const res = await api
    .get<{ data: any[] }>(`/projetos/${projetoId}/convites`)
    .catch(() => ({ data: [] as any[] }))
  return (res.data ?? []).map((c: any) => ({
    email: c.convidado?.email ?? '',
    papel: c.papel ?? 'CLIENTE',
    status: c.status,
    criado_em: c.criadoEm ?? '',
  })) as ConviteRow[]
}

export async function getNarrativaContagens(projetoId: string) {
  const artesRes = await api
    .get<{ data: any[] }>(`/artes?projetoId=${projetoId}&limit=200`)
    .catch(() => ({ data: [] as any[] }))
  const artes = artesRes.data ?? []
  return {
    artesTotal: artes.length,
    artesAprovadas: artes.filter((a: any) => a.status === 'APROVADO').length,
    artesPendentes: artes.filter(
      (a: any) => !['APROVADO', 'REJEITADO'].includes(a.status)
    ).length,
    tarefasUrgentes: 0,
    aprovacoesVencendoHoje: 0,
  }
}

export async function getProjetoAlertas(projetoId: string) {
  const artesRes = await api
    .get<{ data: any[] }>(`/artes?projetoId=${projetoId}&limit=200`)
    .catch(() => ({ data: [] as any[] }))
  const artes = artesRes.data ?? []
  const semAprovador = artes.some((a: any) =>
    ['EM_ANALISE', 'PENDENTE'].includes(a.status)
  )
  return { prazosSemana: 0, aprovacaoTravada: 0, semAprovador }
}
