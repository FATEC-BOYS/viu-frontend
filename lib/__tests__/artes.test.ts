import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  apiUpload: vi.fn(),
}))

import { api, apiUpload } from '@/lib/api'
import { createNovaVersao, listVersoes } from '../artes'

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
