import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() }, getAll: vi.fn() }))
import { api, getAll } from '@/lib/api'
import { getProximosPassos } from '@/lib/projects'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.get).mockResolvedValue({ data: { id: 'p1', prazo: '2026-12-01' } })
})

describe('próximo passo de aprovação por versão', () => {
  it.each(['PENDENTE', 'APROVADO', 'REJEITADO'])('não oferece reenviar uma versão com decisão %s', async (status) => {
    vi.mocked(getAll).mockImplementation(async (url) => url.startsWith('/artes')
      ? [{ id: 'a1', nome: 'Capa', status: 'EM_ANALISE', versao: 1 }]
      : [{ arteId: 'a1', versaoNumero: 1, status }])
    expect(await getProximosPassos('p1')).toEqual([])
  })
  it('a aprovação da v1 não impede enviar a v2', async () => {
    vi.mocked(getAll).mockImplementation(async (url) => url.startsWith('/artes')
      ? [{ id: 'a1', nome: 'Capa', status: 'EM_ANALISE', versao: 2 }]
      : [{ arteId: 'a1', versaoNumero: 1, status: 'APROVADO' }])
    expect(await getProximosPassos('p1')).toEqual([expect.objectContaining({ kind: 'ENVIAR_APROVACAO', arteId: 'a1' })])
  })
  it('não inventa ação quando a consulta de aprovações falha', async () => {
    vi.mocked(getAll).mockRejectedValue(new Error('rede'))
    await expect(getProximosPassos('p1')).rejects.toThrow('rede')
  })
})
