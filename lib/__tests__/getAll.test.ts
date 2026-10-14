import { afterEach, expect, it, vi } from 'vitest'
import { api, getAll } from '../api'
afterEach(() => vi.restoreAllMocks())
it('busca a segunda página em vez de apresentar apenas as primeiras linhas', async () => {
  const get = vi.spyOn(api, 'get')
    .mockResolvedValueOnce({ data: ['primeira'], pagination: { total: 2 } })
    .mockResolvedValueOnce({ data: ['segunda'], pagination: { total: 2 } })
  expect(await getAll('/projetos')).toEqual(['primeira', 'segunda'])
  expect(get.mock.calls[1][0]).toContain('page=2')
})
it('falha explicitamente em vez de devolver um total parcial ao alcançar o teto', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: ['parcial'], pagination: { total: 10 } })
  await expect(getAll('/projetos', 1)).rejects.toThrow('Não foi possível carregar todos')
})
