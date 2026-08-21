import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../api'

/**
 * Comportamento do cliente HTTP diante das respostas que o backend realmente
 * devolve: 403 do RBAC, 429 do rate limit por rota e corpos vazios (204).
 */
function resposta(status: number, body?: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (nome: string) => headers[nome.toLowerCase()] ?? null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('api — respostas de erro', () => {
  it('403 vira erro com a mensagem do backend e status preservado', async () => {
    fetchMock.mockResolvedValueOnce(resposta(403, { message: 'Acesso negado' }))

    await expect(api.get('/projetos/abc')).rejects.toMatchObject({
      status: 403,
      message: 'Acesso negado',
    })
  })

  it('403 sem mensagem explica o que aconteceu', async () => {
    fetchMock.mockResolvedValueOnce(resposta(403, {}))

    await expect(api.get('/projetos/abc')).rejects.toMatchObject({
      message: 'Você não tem permissão para esta ação.',
    })
  })

  it('corpo vazio (204) não quebra o parse', async () => {
    fetchMock.mockResolvedValueOnce(resposta(204))

    await expect(api.delete('/tarefas/abc')).resolves.toEqual({})
  })
})

describe('api — 429', () => {
  it('repete GET respeitando Retry-After e devolve o resultado', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(resposta(429, { message: 'Rate limit' }, { 'retry-after': '0' }))
      .mockResolvedValueOnce(resposta(200, { data: [] }))

    const promessa = api.get('/projetos')
    await vi.runAllTimersAsync()

    await expect(promessa).resolves.toEqual({ data: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('não repete POST — refazer escrita duplicaria o efeito', async () => {
    fetchMock.mockResolvedValueOnce(resposta(429, {}, { 'retry-after': '0' }))

    await expect(api.post('/feedbacks', { conteudo: 'oi' })).rejects.toMatchObject({
      status: 429,
      message: 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('desiste depois do limite de tentativas', async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(resposta(429, {}, { 'retry-after': '0' }))

    const promessa = api.get('/projetos')
    const esperado = expect(promessa).rejects.toMatchObject({ status: 429 })
    await vi.runAllTimersAsync()
    await esperado

    // 1 tentativa original + RETRY_MAX_429 repetições
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
