import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, apiUpload, temSessao } from '../api'

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
    // tryRefresh lê o corpo com json(); o resto do cliente usa text().
    json: async () => (body === undefined ? null : body),
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

describe('api — sessão por cookie', () => {
  it('toda requisição vai com credentials include: é o que leva o cookie', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, { data: [] }))

    await api.get('/projetos')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('include')
    // Nada de Authorization: o token é HttpOnly e o JavaScript não o alcança.
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('401 renova pelo /auth/refresh sem corpo e repete a chamada', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(401, { message: 'expirado' }))
      .mockResolvedValueOnce(resposta(200, { data: { usuario: { id: 'u1', nome: 'Teste' } } }))
      .mockResolvedValueOnce(resposta(200, { data: ['ok'] }))

    await expect(api.get('/projetos')).resolves.toEqual({ data: ['ok'] })

    const [urlRefresh, initRefresh] = fetchMock.mock.calls[1]
    expect(String(urlRefresh)).toContain('/auth/refresh')
    expect(initRefresh.method).toBe('POST')
    expect(initRefresh.credentials).toBe('include')
    // O refresh token vem do cookie — não há o que mandar no corpo.
    expect(initRefresh.body).toBeUndefined()
  })

  it('renovação bem-sucedida atualiza o perfil em cache', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(401, {}))
      .mockResolvedValueOnce(resposta(200, { data: { usuario: { id: 'u9', nome: 'Renovado' } } }))
      .mockResolvedValueOnce(resposta(200, { data: [] }))

    await api.get('/projetos')

    expect(JSON.parse(localStorage.getItem('viu_user') ?? '{}')).toMatchObject({ id: 'u9' })
    expect(temSessao()).toBe(true)
  })

  it('temSessao reflete o perfil em cache, não uma credencial', () => {
    expect(temSessao()).toBe(false)
    localStorage.setItem('viu_user', JSON.stringify({ id: 'u1' }))
    expect(temSessao()).toBe(true)
  })
})

describe('apiUpload', () => {
  it('envia multipart com o cookie e sem Content-Type manual', async () => {
    fetchMock.mockResolvedValueOnce(resposta(201, { data: { id: 'arte1' } }))
    const form = new FormData()
    form.set('nome', 'capa')

    await expect(apiUpload('/artes/upload', form)).resolves.toEqual({ data: { id: 'arte1' } })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.credentials).toBe('include')
    expect(init.body).toBe(form)
    // O boundary do multipart quem monta é o navegador; fixar Content-Type aqui
    // quebraria o parse do lado do servidor.
    expect(init.headers).toBeUndefined()
  })

  it('propaga erro do backend com status', async () => {
    fetchMock.mockResolvedValueOnce(resposta(413, { message: 'Arquivo grande demais' }))

    await expect(apiUpload('/artes/upload', new FormData())).rejects.toMatchObject({
      status: 413,
      message: 'Arquivo grande demais',
    })
  })
})

/**
 * Com onProgress o upload troca fetch() por XMLHttpRequest — é a única API do
 * navegador que informa quanto do corpo já subiu. O resto do contrato tem que
 * ser idêntico ao caminho com fetch: cookie junto, sem Content-Type manual,
 * erro com status, e 401 mandando para o login.
 */
describe('apiUpload com onProgress (XHR)', () => {
  class XHRFake {
    static ultima: XHRFake
    upload = { onprogress: null as null | ((e: any) => void) }
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    onabort: null | (() => void) = null
    ontimeout: null | (() => void) = null
    withCredentials = false
    status = 200
    responseText = '{}'
    metodo = ''
    url = ''
    enviado: unknown = null
    cabecalhos: Record<string, string> = {}

    constructor() {
      XHRFake.ultima = this
    }
    open(metodo: string, url: string) {
      this.metodo = metodo
      this.url = url
    }
    setRequestHeader(k: string, v: string) {
      this.cabecalhos[k] = v
    }
    send(body: unknown) {
      this.enviado = body
    }
    /** Simula o navegador emitindo progresso e concluindo. */
    concluir(status: number, corpo: unknown) {
      this.status = status
      this.responseText = JSON.stringify(corpo)
      this.onload?.()
    }
    progredir(loaded: number, total: number) {
      this.upload.onprogress?.({ lengthComputable: true, loaded, total })
    }
  }

  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', XHRFake as unknown as typeof XMLHttpRequest)
  })

  it('reporta progresso em porcentagem e resolve com o corpo', async () => {
    const vistos: number[] = []
    const form = new FormData()
    const p = apiUpload('/artes/upload', form, { onProgress: (pct) => vistos.push(pct) })

    const xhr = XHRFake.ultima
    xhr.progredir(25, 100)
    xhr.progredir(100, 100)
    xhr.concluir(201, { data: { id: 'arte1' } })

    await expect(p).resolves.toEqual({ data: { id: 'arte1' } })
    expect(vistos).toEqual([25, 100])
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.enviado).toBe(form)
    // Mesmo motivo do caminho com fetch: o boundary é do navegador.
    expect(xhr.cabecalhos['Content-Type']).toBeUndefined()
  })

  it('ignora eventos sem lengthComputable em vez de emitir NaN', async () => {
    const vistos: number[] = []
    const p = apiUpload('/artes/upload', new FormData(), { onProgress: (pct) => vistos.push(pct) })

    const xhr = XHRFake.ultima
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 10, total: 0 })
    xhr.concluir(200, {})

    await p
    expect(vistos).toEqual([])
  })

  it('propaga erro do backend com status', async () => {
    const p = apiUpload('/artes/upload', new FormData(), { onProgress: () => {} })
    XHRFake.ultima.concluir(413, { message: 'Arquivo grande demais' })

    await expect(p).rejects.toMatchObject({ status: 413, message: 'Arquivo grande demais' })
  })

  it('falha de rede vira erro tratável, não promessa pendurada', async () => {
    const p = apiUpload('/artes/upload', new FormData(), { onProgress: () => {} })
    XHRFake.ultima.onerror?.()

    await expect(p).rejects.toMatchObject({ status: 0 })
  })

  it('corpo não-JSON não quebra o parse', async () => {
    const p = apiUpload('/artes/upload', new FormData(), { onProgress: () => {} })
    const xhr = XHRFake.ultima
    xhr.status = 502
    xhr.responseText = '<html>Bad Gateway</html>'
    xhr.onload?.()

    await expect(p).rejects.toMatchObject({ status: 502, message: '<html>Bad Gateway</html>' })
  })
})
