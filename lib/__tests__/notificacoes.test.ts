import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { api } from '@/lib/api'
import {
  destinoDaNotificacao, listFacetasDeNotificacoes, listNotificacoes,
  marcarTodasComoLidas, type Notificacao,
} from '../notificacoes'

beforeEach(() => vi.clearAllMocks())

function query(chamada: string) {
  return new URLSearchParams(chamada.split('?')[1] ?? '')
}

/**
 * A tela pedia `?limit=100` fixo e filtrava em memória. Passando de cem, filtrar
 * por um tipo escondia o que existisse além da centésima linha — sem avisar que
 * estava escondendo. Quem sabe quantas são é o banco.
 */
describe('listNotificacoes', () => {
  it('manda os filtros para o servidor', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 }, naoLidas: 0 } as any)

    await listNotificacoes({ tipo: 'NOVO_FEEDBACK', canal: 'SISTEMA', lida: false, page: 2, limit: 50 })

    const q = query(vi.mocked(api.get).mock.calls[0][0] as string)
    expect(q.get('tipo')).toBe('NOVO_FEEDBACK')
    expect(q.get('canal')).toBe('SISTEMA')
    expect(q.get('lida')).toBe('false')
    expect(q.get('page')).toBe('2')
    expect(q.get('limit')).toBe('50')
  })

  it('omite lida quando é "todas" — o servidor distingue pela ausência', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [], pagination: { total: 0 }, naoLidas: 0 } as any)
    await listNotificacoes({ page: 1, limit: 20 })
    const q = query(vi.mocked(api.get).mock.calls[0][0] as string)
    // `lida=false` aqui significaria "só as não lidas" — o oposto de todas.
    expect(q.has('lida')).toBe(false)
    expect(q.has('tipo')).toBe(false)
  })

  it('lê total e naoLidas do servidor, não do tamanho da página', async () => {
    // Contar as linhas carregadas era o que fazia a tela discordar do sino da
    // lateral, que sempre leu o total do servidor.
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 'n1', titulo: 't', conteudo: 'c', tipo: 'SISTEMA', canal: 'SISTEMA', lida: false, criadoEm: 'x' }],
      pagination: { total: 137, pages: 7 },
      naoLidas: 42,
    } as any)

    const pagina = await listNotificacoes({ page: 1, limit: 20 })

    expect(pagina.itens).toHaveLength(1)
    expect(pagina.total).toBe(137)
    expect(pagina.naoLidas).toBe(42)
    expect(pagina.paginas).toBe(7)
  })

  it('normaliza o destino ausente para null', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 'n1', titulo: 't', conteudo: 'c', tipo: 'SISTEMA', canal: 'SISTEMA', lida: true, criadoEm: 'x' }],
      pagination: { total: 1 }, naoLidas: 0,
    } as any)
    const { itens } = await listNotificacoes({ page: 1, limit: 20 })
    expect(itens[0].entidadeTipo).toBeNull()
    expect(itens[0].entidadeId).toBeNull()
  })
})

describe('listFacetasDeNotificacoes', () => {
  it('devolve listas vazias quando o corpo vem estranho', async () => {
    // Faceta quebrada não pode levar a tela junto: sem opção de filtro ainda
    // dá para ler a caixa de entrada.
    vi.mocked(api.get).mockResolvedValue({} as any)
    expect(await listFacetasDeNotificacoes()).toEqual({ tipos: [], canais: [] })
  })
})

/**
 * Um clique disparava um PUT por linha com `Promise.allSettled` — cem
 * requisições — e marcava só as que o filtro deixava à vista, apesar de o botão
 * dizer "todas". A rota de uma tirada existia e estava sem uso.
 */
describe('marcarTodasComoLidas', () => {
  it('usa a rota única do servidor', async () => {
    vi.mocked(api.put).mockResolvedValue({} as any)
    await marcarTodasComoLidas()
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.put).mock.calls[0][0]).toBe('/notificacoes/lidas/todas')
  })
})

/**
 * A notificação avisava e abandonava: "'Logo TechStart' aguarda sua aprovação"
 * sem caminho até a arte.
 */
describe('destinoDaNotificacao', () => {
  function n(extra: Partial<Notificacao>): Notificacao {
    return {
      id: 'n1', titulo: 't', conteudo: 'c', tipo: 'SISTEMA', canal: 'SISTEMA',
      lida: false, criadoEm: '', entidadeTipo: null, entidadeId: null, ...extra,
    }
  }

  it('arte leva ao viewer, que é onde se decide e se comenta', () => {
    expect(destinoDaNotificacao(n({ entidadeTipo: 'ARTE', entidadeId: 'a1' }))).toBe('/viewer/arte/a1')
  })

  it('projeto e fatura levam às suas telas', () => {
    expect(destinoDaNotificacao(n({ entidadeTipo: 'PROJETO', entidadeId: 'p1' }))).toBe('/projetos/p1')
    expect(destinoDaNotificacao(n({ entidadeTipo: 'FATURA', entidadeId: 'f1' }))).toBe('/faturas/f1')
  })

  it('assinatura leva à lista — não há tela por assinatura', () => {
    expect(destinoDaNotificacao(n({ entidadeTipo: 'ASSINATURA', entidadeId: 's1' }))).toBe('/assinaturas')
  })

  it('sem destino não vira link', () => {
    expect(destinoDaNotificacao(n({}))).toBeNull()
    // Metade do par não basta: `/viewer/arte/undefined` é pior que não clicar.
    expect(destinoDaNotificacao(n({ entidadeTipo: 'ARTE', entidadeId: null }))).toBeNull()
    expect(destinoDaNotificacao(n({ entidadeTipo: null, entidadeId: 'a1' }))).toBeNull()
  })

  it('entidade desconhecida não vira link', () => {
    // Linha antiga em produção pode trazer algo que esta versão não conhece.
    expect(destinoDaNotificacao(n({ entidadeTipo: 'ALGO' as any, entidadeId: 'x' }))).toBeNull()
  })
})
