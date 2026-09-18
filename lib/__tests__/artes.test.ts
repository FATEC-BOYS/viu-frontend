import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  apiUpload: vi.fn(),
}))

import { api, apiUpload } from '@/lib/api'
import { createNovaVersao, idDoFiltro, listArtesOverview, listVersoes } from '../artes'

beforeEach(() => vi.clearAllMocks())

/**
 * O path do upload de versão apontava para `/artes/:id/versoes`, onde o backend
 * só registra GET — o POST vive em `/versoes/upload`. Fastify devolve 404 para
 * método não registrado, então "Nova versão" nunca funcionou.
 */
describe('createNovaVersao', () => {
  it('envia para /versoes/upload, não para /versoes', async () => {
    vi.mocked(apiUpload).mockResolvedValue({ data: { versao: 2, arquivo: 'k' } } as any)

    await createNovaVersao({ arteId: 'arte1', file: new File([], 'x.png') })

    const [path] = vi.mocked(apiUpload).mock.calls[0]
    expect(path).toBe('/artes/arte1/versoes/upload')
  })

  it('repassa onProgress para o upload', async () => {
    vi.mocked(apiUpload).mockResolvedValue({ data: {} } as any)
    const onProgress = vi.fn()

    await createNovaVersao({ arteId: 'arte1', file: new File([], 'x.png'), onProgress })

    const [, , init] = vi.mocked(apiUpload).mock.calls[0]
    expect((init as any).onProgress).toBe(onProgress)
  })
})

/**
 * listVersoes derivava tudo de GET /artes/:id e devolvia sempre UM grupo — a
 * versão atual. O histórico existia no backend (ArteVersao) e a tela nunca o
 * mostrava.
 */
describe('listVersoes', () => {
  const RESPOSTA_BACKEND = {
    data: [
      {
        id: 'v2',
        numero: 2,
        arquivo: 'artes/p/a/v2/a.png',
        arquivoUrl: 'https://r2.example.com/v2?assinado',
        tipo: 'image/png',
        tamanho: 2048,
        criadoEm: '2026-02-02T10:00:00.000Z',
        criadoPor: { id: 'd1', nome: 'Designer' },
      },
      {
        id: 'v1',
        numero: 1,
        arquivo: 'artes/p/a/v1/a.png',
        arquivoUrl: 'https://r2.example.com/v1?assinado',
        tipo: 'image/png',
        tamanho: 1024,
        criadoEm: '2026-02-01T10:00:00.000Z',
        criadoPor: { id: 'd1', nome: 'Designer' },
      },
    ],
  }

  it('consulta a rota de versões, não o detalhe da arte', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA_BACKEND as any)

    await listVersoes('arte1')

    expect(api.get).toHaveBeenCalledWith('/artes/arte1/versoes')
  })

  it('devolve um grupo por versão, preservando a ordem do backend', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA_BACKEND as any)

    const grupos = await listVersoes('arte1')

    expect(grupos).toHaveLength(2)
    expect(grupos.map((g) => g.versao)).toEqual([2, 1])
  })

  it('usa a URL assinada, não a chave crua do bucket', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA_BACKEND as any)

    const [maisRecente] = await listVersoes('arte1')

    // A chave sozinha não abre nada: quem assina é o backend.
    expect(maisRecente.arquivos[0].arquivo).toBe('https://r2.example.com/v2?assinado')
    expect(maisRecente.arquivos[0].mime).toBe('image/png')
    expect(maisRecente.arquivos[0].tamanho).toBe(2048)
  })

  it('devolve lista vazia quando a arte não tem versões', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] } as any)
    await expect(listVersoes('arte1')).resolves.toEqual([])
  })

  it('não quebra a tela quando a chamada falha', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('rede'))
    await expect(listVersoes('arte1')).resolves.toEqual([])
  })
})

/**
 * O contrato da listagem com o backend.
 *
 * Aqui moravam três desencontros que a tela não tinha como denunciar, porque
 * uma lista errada parece uma lista:
 *
 *  - os filtros de projeto, cliente e autor chegavam como NOME e eram jogados
 *    fora na desestruturação — três controles que mudavam a URL e não mudavam
 *    o pedido;
 *  - o pulo de página ia em `offset`, que a rota não lê (ela calcula a partir
 *    de `page`), então toda página pedida devolvia a primeira;
 *  - o total era lido em `res.total`, que não existe na resposta, caindo no
 *    tamanho da página — "3 itens" quando eram trinta.
 */
describe('listArtesOverview', () => {
  const RESPOSTA = {
    data: [],
    pagination: { page: 2, limit: 24, total: 57, pages: 3 },
    porStatus: { EM_ANALISE: 40, APROVADO: 17 },
  }

  function paramsDaChamada() {
    const [path] = vi.mocked(api.get).mock.calls[0]
    return new URLSearchParams(String(path).split('?')[1])
  }

  it('manda os filtros que a tela oferece', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)

    await listArtesOverview({
      q: 'logo',
      status: 'APROVADO',
      tipo: 'IMAGEM',
      projetoId: 'proj1',
      clienteId: 'cli1',
      autorId: 'aut1',
      orderBy: 'nome',
    })

    const qs = paramsDaChamada()
    expect(qs.get('search')).toBe('logo')
    expect(qs.get('status')).toBe('APROVADO')
    expect(qs.get('tipo')).toBe('IMAGEM')
    expect(qs.get('projetoId')).toBe('proj1')
    expect(qs.get('clienteId')).toBe('cli1')
    expect(qs.get('autorId')).toBe('aut1')
    expect(qs.get('orderBy')).toBe('nome')
  })

  it('pagina por `page`, que é o que a rota lê', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)

    await listArtesOverview({ page: 3, pageSize: 12 })

    const qs = paramsDaChamada()
    expect(qs.get('page')).toBe('3')
    expect(qs.get('limit')).toBe('12')
    // `offset` fazia a rota cair no padrão e devolver sempre a página 1.
    expect(qs.get('offset')).toBeNull()
  })

  it('lê o total de `pagination`, e não o tamanho da página', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)

    const { count } = await listArtesOverview({})

    expect(count).toBe(57)
  })

  it('devolve as contagens por status do conjunto filtrado', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)

    const { porStatus } = await listArtesOverview({})

    expect(porStatus).toEqual({ EM_ANALISE: 40, APROVADO: 17 })
  })

  it('não manda filtro nenhum quando nada foi escolhido', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)

    await listArtesOverview({ status: 'todos', tipo: 'todos' })

    const qs = paramsDaChamada()
    expect(qs.get('status')).toBeNull()
    expect(qs.get('tipo')).toBeNull()
  })

  it('não derruba a tela quando a chamada falha', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('rede'))

    await expect(listArtesOverview({})).resolves.toEqual({
      data: [],
      count: 0,
      porStatus: {},
    })
  })
})

/**
 * A URL é memória de longo prazo: link guardado, link mandado, botão voltar.
 *
 * Os filtros de projeto, cliente e autor guardavam NOME e passaram a guardar
 * id. Um endereço de antes traz "Maria Oliveira" onde hoje se espera um id —
 * e mandá-lo como `clienteId` devolve lista vazia com o chip dizendo "—".
 * Antes ele não filtrava nada e mostrava tudo; passaria a mostrar nada.
 */
describe('idDoFiltro', () => {
  const CLIENTES = [
    { id: 'c1', nome: 'Maria Oliveira' },
    { id: 'c2', nome: 'João Santos' },
  ]

  it('deixa passar o id que já é id', () => {
    expect(idDoFiltro('c1', CLIENTES)).toBe('c1')
  })

  it('traduz o nome que veio de um link antigo', () => {
    expect(idDoFiltro('Maria Oliveira', CLIENTES)).toBe('c1')
  })

  it('não se perde na caixa das letras', () => {
    // Quem escreveu foi um navegador, não uma escolha de lista.
    expect(idDoFiltro('maria oliveira', CLIENTES)).toBe('c1')
  })

  it('devolve null para o que não dá para reconhecer', () => {
    // Cliente removido, projeto de outra conta, endereço digitado à mão: um
    // filtro que não dá para honrar não pode ficar de pé esvaziando a lista.
    expect(idDoFiltro('c99', CLIENTES)).toBeNull()
    expect(idDoFiltro('Fulano de Tal', CLIENTES)).toBeNull()
  })

  it('devolve null quando não há opção nenhuma', () => {
    expect(idDoFiltro('c1', [])).toBeNull()
  })
})
