// lib/artes.ts — usa a API REST do backend
import { api, apiUpload } from '@/lib/api'

// O backend emite EM_ANALISE | APROVADO | REJEITADO. `REVISAO` continua no
// tipo porque linha antiga em produção ainda pode trazê-lo até a migração
// de dados rodar — o produto não oferece mais esse status em lugar nenhum.
// (src/types/enums.ts). PENDENTE e RASCUNHO nunca existiram: filtravam nada e
// deixavam a arte em revisão sem rótulo.
export type ArteStatus =
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REJEITADO'
  | 'REVISAO'

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
  /**
   * O cliente por id, e não só por nome.
   *
   * O filtro de cliente da tela de Artes guardava o NOME na URL e o mandava
   * como se fosse filtro — mas o servidor filtra por id, e nome não é chave:
   * dois clientes homônimos são duas pessoas. Sem este campo a tela não tinha
   * o que mandar.
   */
  cliente_id?: string | null
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
  /**
   * Estado da licença de uso, vindo das faturas do projeto (cláusula 7.1 do
   * anexo de revisão). `null` quando o projeto não tem fatura — sem cobrança
   * não há o que afirmar sobre licença.
   */
  licenca?: { estado: 'QUITADO' | 'EM_ABERTO' | 'ESTORNADO' | 'NAO_FATURADO'; quitadoEm: string | null } | null
  /**
   * As rodadas de revisão já usadas NESTA peça — cláusula 3.2 do anexo.
   *
   * Por peça e não por projeto, como manda a 3.1: um projeto com três artes
   * tem o número acordado de rodadas para cada uma, não somado entre elas.
   *
   * A conta vem do servidor. Refazê-la aqui, a partir da lista de feedbacks
   * que a tela já tem, daria um segundo número — e o número que a outra parte
   * contesta numa disputa não pode depender de qual tela abriu.
   */
  rodadas?: Rodadas | null
  feedbacks?: Array<any>
  tarefas?: Array<any>
  aprovacoes?: Array<any>
}

/** O que o servidor responde sobre as rodadas de uma peça. */
export interface Rodadas {
  usadas: number
  /** O combinado. Nulo quando ninguém combinou ainda. */
  incluidas: number | null
  /** Comentários do cliente anteriores ao carimbo de versão. Fora da conta. */
  semVersao: number
  versoes: number[]
}

/**
 * "2 de 3 rodadas usadas" — ou "2 rodadas usadas", quando nada foi combinado.
 *
 * Inventar um teto onde não houve acordo seria o VIU decidindo uma cláusula no
 * lugar das partes; e dizer "2 de 0" quando o acordo foi "nenhuma revisão
 * inclusa" é correto, não erro — a primeira rodada já é extra, pela 3.3.
 */
export function fraseDeRodadas(r: Rodadas): string {
  /*
   * Substantivo e particípio concordam com O MESMO número, senão sai "1 de 0
   * rodadas usada" — a primeira versão disto pluralizava "rodada" pelo total e
   * "usada" pelo usado, e os dois discordavam sempre que um era 1 e o outro
   * não. Com teto, quem manda é o teto ("1 de 3 rodadas usadas"); sem teto, o
   * usado ("1 rodada usada").
   */
  const concordar = (n: number) => (n === 1 ? ['rodada', 'usada'] : ['rodadas', 'usadas'])

  if (r.incluidas === null) {
    const [subst, part] = concordar(r.usadas)
    return `${r.usadas} ${subst} ${part}`
  }
  const [subst, part] = concordar(r.incluidas)
  return `${r.usadas} de ${r.incluidas} ${subst} ${part}`
}

/** Passou do combinado — a 3.3 manda orçar à parte, então a tela avisa. */
export function passouDoCombinado(r: Rodadas): boolean {
  return r.incluidas !== null && r.usadas > r.incluidas
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
    cliente_id: a.projeto?.cliente?.id ?? null,
    autor_nome: a.autor?.nome ?? null,
    feedbacks_count: a._count?.feedbacks ?? 0,
    tem_aprovacao_aprovada:
      (a.aprovacoes ?? []).some((ap: any) => ap.status === 'APROVADO'),
  }
}

export type OrdemDeArtes = 'criado_em' | 'nome' | 'projeto' | 'versao' | 'tamanho'

type ListArtesParams = {
  q?: string
  status?: ArteStatus | 'todos'
  tipo?: string | 'todos'
  /*
   * Ids, não nomes.
   *
   * Estes três chegavam aqui como nome ("Maria Oliveira") e eram descartados
   * na desestruturação logo abaixo: o tipo os aceitava, a tela os mandava, e
   * nada disso saía daqui. Quem filtra é o servidor, e ele filtra por id.
   */
  projetoId?: string
  clienteId?: string
  autorId?: string
  orderBy?: OrdemDeArtes
  page?: number
  pageSize?: number
}

/**
 * A listagem de artes, com os filtros da tela.
 *
 * O contrato é o do backend — `page` e `limit`, e o total em `pagination`.
 * Esta função mandava `offset`, que a rota não lê (ela calcula o pulo a partir
 * de `page`), então toda página pedida devolvia a primeira; e lia o total em
 * `res.total`, que não existe na resposta, caindo no `data.length` — ou seja,
 * "3 itens" era "3 nesta página", e a paginação nascia sempre com uma página
 * só.
 */
export async function listArtesOverview({
  q: searchTerm,
  status,
  tipo,
  projetoId,
  clienteId,
  autorId,
  orderBy,
  page = 1,
  pageSize = 24,
}: ListArtesParams = {}): Promise<{
  data: ArteOverview[]
  count: number
  /** Quantas artes por status no conjunto filtrado — não nesta página. */
  porStatus: Record<string, number>
}> {
  const qs = new URLSearchParams()
  qs.set('limit', String(pageSize))
  qs.set('page', String(page))
  if (projetoId) qs.set('projetoId', projetoId)
  if (clienteId) qs.set('clienteId', clienteId)
  if (autorId) qs.set('autorId', autorId)
  if (orderBy) qs.set('orderBy', orderBy)
  if (searchTerm?.trim()) qs.set('search', searchTerm.trim())
  if (status && status !== 'todos') qs.set('status', status)
  if (tipo && tipo !== 'todos') qs.set('tipo', tipo)

  const res = await api
    .get<{ data: any[]; pagination?: { total?: number }; porStatus?: Record<string, number> }>(
      `/artes?${qs}`,
    )
    .catch(() => ({ data: [] as any[], pagination: { total: 0 }, porStatus: {} }))
  const data = (res.data ?? []).map(mapArte)
  return { data, count: res.pagination?.total ?? data.length, porStatus: res.porStatus ?? {} }
}

/** Os valores por que dá para filtrar — projetos, clientes, autores e tipos. */
export type FacetasDeArtes = {
  projetos: Array<{ id: string; nome: string }>
  clientes: Array<{ id: string; nome: string }>
  autores: Array<{ id: string; nome: string }>
  tipos: string[]
}

const SEM_FACETAS: FacetasDeArtes = { projetos: [], clientes: [], autores: [], tipos: [] }

/**
 * As opções de filtro, do servidor.
 *
 * A tela montava estas listas a partir das artes que já tinha na mão — o
 * resultado atual, que já vem filtrado e paginado. Filtrar por um cliente
 * deixava só ele na lista de clientes, então trocar exigia limpar antes; e um
 * filtro sem resultado esvaziava a lista, fazendo o valor escolhido sumir do
 * próprio campo — aplicado e invisível.
 */
export async function listFacetasDeArtes(): Promise<FacetasDeArtes> {
  const res = await api
    .get<{ data: FacetasDeArtes }>('/artes/facetas')
    .catch(() => null)
  return res?.data ?? SEM_FACETAS
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
    licenca: a.licenca ?? null,
    rodadas: a.rodadas ?? null,
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
  /** Recebe 0–100 conforme o arquivo sobe. Sem isto o upload usa fetch(). */
  onProgress?: (porcentagem: number) => void
}) {
  const form = new FormData()
  form.set('file', params.file, params.file.name)
  if (params.novoNomeOpcional) form.set('nome', params.novoNomeOpcional)
  if (params.largura_px != null) form.set('largura_px', String(params.largura_px))
  if (params.altura_px != null) form.set('altura_px', String(params.altura_px))

  // `/versoes/upload`, não `/versoes`: o backend registra apenas GET no path
  // sem sufixo, e Fastify devolve 404 para método não registrado. Enquanto o
  // path esteve errado, criar nova versão nunca chegou ao servidor.
  const data = await apiUpload<{ data?: { versao?: number; arquivo?: string } }>(
    `/artes/${params.arteId}/versoes/upload`,
    form,
    { onProgress: params.onProgress },
  )
  return { versao: data.data?.versao ?? 1, path: data.data?.arquivo ?? '' }
}

/**
 * Histórico de versões da arte.
 *
 * Antes isto derivava de `GET /artes/:id` e devolvia sempre um único grupo — a
 * versão corrente —, então a tela dizia "sem histórico" mesmo com várias
 * versões gravadas. O backend expõe `GET /artes/:id/versoes` com a lista real,
 * já ordenada da mais recente para a mais antiga.
 *
 * `arquivoUrl` é a URL assinada; `arquivo` é a chave crua do bucket, que não
 * abre nada sozinha. É a assinada que vai para a UI.
 */
export async function listVersoes(arteId: string): Promise<VersaoGroup[]> {
  const res = await api.get<{ data: any[] }>(`/artes/${arteId}/versoes`).catch(() => null)
  if (!res) return []

  return (res.data ?? []).map((v: any) => ({
    versao: v.numero ?? 1,
    arquivos: [
      {
        id: v.id,
        kind: 'FONTE' as const,
        arquivo: v.arquivoUrl ?? v.arquivo ?? '',
        mime: v.tipo ?? null,
        tamanho: typeof v.tamanho === 'number' ? v.tamanho : Number(v.tamanho ?? 0) || null,
        criado_em: v.criadoEm ?? v.criado_em ?? null,
      },
    ],
    criado_em: v.criadoEm ?? v.criado_em ?? null,
  }))
}

/** Rótulo legível do status da arte. O enum cru vazava para a UI em vários lugares. */
export function arteStatusLabel(status?: string | null) {
  switch (status) {
    case 'EM_ANALISE': return 'Em análise'
    case 'APROVADO': return 'Aprovado'
    case 'REJEITADO': return 'Rejeitado'
    case 'REVISAO': return 'Em revisão'
    default: return status ?? '—'
  }
}
