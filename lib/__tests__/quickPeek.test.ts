import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  getAll: vi.fn(),
  MAX_PAGE_SIZE: 100,
}))
vi.mock('@/lib/artes', () => ({ listVersoes: vi.fn() }))

import { api } from '@/lib/api'
import { listVersoes } from '@/lib/artes'
import { getArteQuickPeek } from '../projects'

beforeEach(() => vi.clearAllMocks())

/**
 * O drawer de espiada rápida dizia "Sem preview disponível", "Sem feedbacks" e
 * um traço no lugar do autor — sobre uma arte que tinha as três coisas. O
 * mapeador montava a resposta campo a campo e esquecia o que o servidor já
 * mandava; um `as unknown as PeekData` no componente calava o compilador.
 */
const RESPOSTA = {
  data: {
    id: 'a1',
    nome: 'Teste',
    descricao: null,
    tipo: 'image/jpeg',
    versao: 1,
    status: 'EM_ANALISE',
    criadoEm: '2026-09-19T00:00:00.000Z',
    previewUrl: 'https://r2.example.com/a1?assinado',
    arquivo_url: 'https://r2.example.com/a1?assinado',
    autor: { id: 'd1', nome: 'Ana Silva' },
    feedbacks: [
      { id: 'f1', conteudo: 'Ajusta o kerning', autor: { id: 'c1', nome: 'João Santos' }, criadoEm: '2026-09-19T01:00:00.000Z' },
    ],
  },
}

describe('getArteQuickPeek', () => {
  it('usa a URL assinada que o servidor manda', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)
    vi.mocked(listVersoes).mockResolvedValue([] as any)

    const peek = await getArteQuickPeek('a1')

    expect(peek.versoes[0].preview_url).toBe('https://r2.example.com/a1?assinado')
  })

  it('devolve os feedbacks com o nome de quem escreveu', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)
    vi.mocked(listVersoes).mockResolvedValue([] as any)

    const peek = await getArteQuickPeek('a1')

    expect(peek.feedbacks).toHaveLength(1)
    expect(peek.feedbacks[0].autor.nome).toBe('João Santos')
    expect(peek.feedbacks[0].conteudo).toBe('Ajusta o kerning')
  })

  it('devolve o autor da arte', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)
    vi.mocked(listVersoes).mockResolvedValue([] as any)

    const peek = await getArteQuickPeek('a1')

    expect(peek.arte.autor?.nome).toBe('Ana Silva')
  })

  it('mostra o histórico de versões, não uma linha inventada', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)
    vi.mocked(listVersoes).mockResolvedValue([
      { versao: 2, criado_em: '2026-09-19T02:00:00.000Z', arquivos: [{ arquivo: 'url-v2' }] },
      { versao: 1, criado_em: '2026-09-19T00:00:00.000Z', arquivos: [{ arquivo: 'url-v1' }] },
    ] as any)

    const peek = await getArteQuickPeek('a1')

    expect(peek.versoes.map((v) => v.versao)).toEqual([2, 1])
    expect(peek.versoes[0].preview_url).toBe('url-v2')
  })

  it('cai na versão atual quando o histórico falha, sem esvaziar a tela', async () => {
    vi.mocked(api.get).mockResolvedValue(RESPOSTA as any)
    vi.mocked(listVersoes).mockRejectedValue(new Error('rede'))

    const peek = await getArteQuickPeek('a1')

    expect(peek.versoes).toHaveLength(1)
    expect(peek.versoes[0].preview_url).toBe('https://r2.example.com/a1?assinado')
  })

  it('não quebra quando a arte não tem feedback nem autor', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...RESPOSTA.data, feedbacks: undefined, autor: null } } as any)
    vi.mocked(listVersoes).mockResolvedValue([] as any)

    const peek = await getArteQuickPeek('a1')

    expect(peek.feedbacks).toEqual([])
    expect(peek.arte.autor).toBeNull()
  })
})
