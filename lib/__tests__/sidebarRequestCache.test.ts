import { beforeEach, expect, it, vi } from 'vitest'
import { consultarSidebar, limparCacheSidebar } from '../sidebarRequestCache'
beforeEach(limparCacheSidebar)
it('compartilha consultas entre montagens do menu sem misturar contas', async () => {
  const buscar = vi.fn(async () => 3)
  await Promise.all([consultarSidebar('a', 'artes', buscar), consultarSidebar('a', 'artes', buscar)])
  expect(buscar).toHaveBeenCalledTimes(1)
  await consultarSidebar('b', 'artes', buscar)
  expect(buscar).toHaveBeenCalledTimes(2)
})
it('não mantém falhas em cache e permite recuperar', async () => {
  const buscar = vi.fn().mockRejectedValueOnce(new Error('429')).mockResolvedValueOnce(3)
  await expect(consultarSidebar('a', 'artes', buscar)).rejects.toThrow('429')
  await expect(consultarSidebar('a', 'artes', buscar)).resolves.toBe(3)
  expect(buscar).toHaveBeenCalledTimes(2)
})
it('atualiza após a janela de 30 segundos', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100)
  try {
    const buscar = vi.fn(async () => 3)
    await consultarSidebar('a', 'artes', buscar)
    clock.mockReturnValue(30101)
    await consultarSidebar('a', 'artes', buscar)
    expect(buscar).toHaveBeenCalledTimes(2)
  } finally { clock.mockRestore() }
})
