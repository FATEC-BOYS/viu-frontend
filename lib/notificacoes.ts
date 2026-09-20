// lib/notificacoes.ts — usa a API REST do backend
import { api } from '@/lib/api'

/**
 * Para onde a notificação leva.
 *
 * O backend guarda `entidadeTipo`/`entidadeId`; o caminho é conhecimento desta
 * aplicação, então a tradução mora aqui. Sem destino a linha não vira link —
 * é melhor não ser clicável do que levar a lugar nenhum.
 */
export type EntidadeNotificacao = 'ARTE' | 'PROJETO' | 'FATURA' | 'ASSINATURA' | 'DISPUTA'

export type Notificacao = {
  id: string
  titulo: string
  conteudo: string
  /**
   * String livre de propósito.
   *
   * O vocabulário é declarado no backend (`TipoNotificacao`), mas linha antiga
   * em produção pode trazer um tipo já aposentado. Estreitar aqui faria a tela
   * quebrar por causa de um dado que ela só precisa mostrar.
   */
  tipo: string
  canal: string
  lida: boolean
  criadoEm: string
  entidadeTipo: EntidadeNotificacao | null
  entidadeId: string | null
}

export type FacetasDeNotificacoes = {
  tipos: Array<{ tipo: string; rotulo: string; total: number }>
  canais: Array<{ canal: string; total: number }>
}

export type PaginaDeNotificacoes = {
  itens: Notificacao[]
  /** Quantas casam com o filtro atual — não quantas couberam na página. */
  total: number
  /** Quantas te esperam, ignorando o filtro. É o número do sino. */
  naoLidas: number
  paginas: number
}

export type FiltrosDeNotificacao = {
  tipo?: string
  canal?: string
  /** `undefined` = todas; o backend distingue por ausência do parâmetro. */
  lida?: boolean
  page: number
  limit: number
}

function normalizar(bruto: any): Notificacao {
  return {
    id: String(bruto.id),
    titulo: String(bruto.titulo ?? ''),
    conteudo: String(bruto.conteudo ?? ''),
    tipo: String(bruto.tipo ?? ''),
    canal: String(bruto.canal ?? ''),
    lida: Boolean(bruto.lida),
    criadoEm: bruto.criadoEm ?? '',
    entidadeTipo: bruto.entidadeTipo ?? null,
    entidadeId: bruto.entidadeId ?? null,
  }
}

/**
 * Uma página de notificações, filtrada no servidor.
 *
 * A tela filtrava e ordenava em memória sobre um `?limit=100` fixo. Passando de
 * cem, filtrar por um tipo escondia o que existia além da centésima linha — sem
 * dizer que estava escondendo. Quem sabe quantas são é o banco.
 */
export async function listNotificacoes(f: FiltrosDeNotificacao): Promise<PaginaDeNotificacoes> {
  const p = new URLSearchParams()
  p.set('page', String(f.page))
  p.set('limit', String(f.limit))
  if (f.tipo) p.set('tipo', f.tipo)
  if (f.canal) p.set('canal', f.canal)
  if (f.lida !== undefined) p.set('lida', String(f.lida))

  const res = await api.get<{
    data: any[]
    pagination?: { total?: number; pages?: number }
    naoLidas?: number
  }>(`/notificacoes?${p.toString()}`)

  return {
    itens: (res.data ?? []).map(normalizar),
    total: res.pagination?.total ?? 0,
    naoLidas: res.naoLidas ?? 0,
    paginas: res.pagination?.pages ?? 1,
  }
}

/**
 * As opções de filtro desta pessoa, vindas do banco.
 *
 * A tela trazia a lista escrita à mão, copiada de um enum que o sistema havia
 * parado de falar: quatro dos seis tipos não casavam com nada. Vindo daqui,
 * a opção existe porque existe linha.
 */
export async function listFacetasDeNotificacoes(): Promise<FacetasDeNotificacoes> {
  const res = await api.get<{ data: FacetasDeNotificacoes }>('/notificacoes/facetas')
  return { tipos: res.data?.tipos ?? [], canais: res.data?.canais ?? [] }
}

export async function marcarComoLida(id: string, lida: boolean): Promise<void> {
  await api.put(`/notificacoes/${id}/lida`, { lida })
}

/**
 * Marca todas de uma vez — no servidor.
 *
 * A tela disparava um PUT por linha com `Promise.allSettled`: cem requisições
 * para um clique, e marcava só as que o filtro deixava à vista, apesar de o
 * botão dizer "todas". A rota existia e estava sem uso.
 */
export async function marcarTodasComoLidas(): Promise<void> {
  await api.put('/notificacoes/lidas/todas', {})
}

export async function excluirNotificacao(id: string): Promise<void> {
  await api.delete(`/notificacoes/${id}`)
}

/**
 * O caminho até o que a notificação está falando.
 *
 * `null` quando não há destino — e aí a linha não vira link.
 */
export function destinoDaNotificacao(n: Notificacao): string | null {
  if (!n.entidadeTipo || !n.entidadeId) return null
  switch (n.entidadeTipo) {
    case 'ARTE':
      // O viewer é onde se comenta e se decide — é para lá que o aviso aponta.
      return `/viewer/arte/${n.entidadeId}`
    case 'PROJETO':
      return `/projetos/${n.entidadeId}`
    case 'FATURA':
      return `/faturas/${n.entidadeId}`
    case 'ASSINATURA':
      // Não há tela por assinatura; a lista é o lugar certo.
      return '/assinaturas'
    case 'DISPUTA':
      // Idem: não há tela por disputa, e a lista mostra tanto quem abriu
      // quanto o outro lado — que é quem costuma receber este aviso.
      return '/disputas'
    default:
      return null
  }
}
