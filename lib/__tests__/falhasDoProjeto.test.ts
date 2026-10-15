import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() }, getAll: vi.fn() }))
import { api, getAll } from '@/lib/api'
import { getAprovacaoPainel, getProjetoResumo, listArtes } from '../projects'
beforeEach(() => vi.clearAllMocks())
it('não transforma erro das artes em zero artes no resumo', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: { id: 'p1' } })
  vi.mocked(getAll).mockRejectedValue(new Error('rede'))
  await expect(getProjetoResumo('p1')).rejects.toThrow('rede')
})
it('não transforma erro das aprovações em histórico vazio', async () => {
  vi.mocked(getAll).mockRejectedValue(new Error('rede'))
  await expect(getAprovacaoPainel('p1')).rejects.toThrow('rede')
})
it('usa a paginação que o backend aceita e o total real', async () => {
  vi.mocked(api.get).mockResolvedValue({ data: [], pagination: { total: 37 } })
  expect((await listArtes('p1', { offset: 12, limit: 12 })).count).toBe(37)
  expect(vi.mocked(api.get).mock.calls[0][0]).toContain('page=2')
})
