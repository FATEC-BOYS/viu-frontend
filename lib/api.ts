const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Cliente HTTP do backend.
 *
 * A sessão vive em cookie HttpOnly: o navegador anexa o cookie sozinho quando
 * a requisição vai com `credentials: 'include'`, e o JavaScript da página
 * nunca vê o token — que é o ponto de ter saído do localStorage.
 *
 * Aqui não há mais nada de token para ler, guardar ou injetar em header.
 */
const USER_KEY = 'viu_user'

/**
 * Só o perfil (nome, e-mail, tipo) fica no localStorage, para a interface não
 * piscar deslogada a cada carga. Não é credencial: quem manda é o cookie, e
 * apagar isto não derruba a sessão nem mantê-lo a sustenta.
 */
export function temSessao(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem(USER_KEY))
  } catch {
    return false
  }
}

let isRefreshing = false
let refreshQueue: Array<(ok: boolean) => void> = []

/**
 * Renova a sessão. O refresh token vem do cookie — não há corpo para enviar.
 *
 * Chamadas simultâneas que tomam 401 juntas compartilham a mesma renovação:
 * cada refresh rotaciona a sessão no servidor, então duas em paralelo
 * derrubariam uma à outra.
 */
async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => { refreshQueue.push(resolve) })
  }

  isRefreshing = true
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    let ok = res.ok
    if (ok) {
      const body = await res.json().catch(() => null)
      if (body?.data?.usuario) {
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(body.data.usuario))
        } catch {
          // Modo privado ou storage cheio: perder o cache do perfil não impede
          // a sessão de funcionar.
        }
      }
    } else {
      try {
        localStorage.removeItem(USER_KEY)
      } catch {
        ok = false
      }
    }

    refreshQueue.forEach((cb) => cb(ok))
    refreshQueue = []
    return ok
  } catch {
    refreshQueue.forEach((cb) => cb(false))
    refreshQueue = []
    return false
  } finally {
    isRefreshing = false
  }
}

export interface ApiError extends Error {
  status: number
  body: unknown
}

function erroDeApi(mensagem: string, status: number, body: unknown): ApiError {
  const err = new Error(mensagem) as ApiError
  err.status = status
  err.body = body
  return err
}

/**
 * Redireciona para o login preservando a rota atual.
 *
 * Sessão expirada terminava em um erro solto na tela: a pessoa via
 * "Sessão expirada" e continuava numa página vazia, sem saber que era só
 * entrar de novo.
 */
function irParaLogin() {
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/login')) return
  const destino = `${window.location.pathname}${window.location.search}`
  // `replace`, não `href`: a página que acabou de tomar 401 não pode continuar
  // no histórico. Com `href` ela ficava, o Voltar caía nela de novo, ela tomava
  // 401 de novo e mandava para /login outra vez — a pessoa ficava presa.
  window.location.replace(`/login?next=${encodeURIComponent(destino)}`)
}

/** 204 e afins não têm corpo; `res.json()` direto quebrava nesses casos. */
async function lerCorpo(res: Response): Promise<any> {
  const texto = await res.text()
  if (!texto) return {}
  try {
    return JSON.parse(texto)
  } catch {
    return { message: texto }
  }
}

const RETRY_MAX_429 = 2

function ehIdempotente(init: RequestInit): boolean {
  const metodo = (init.method ?? 'GET').toUpperCase()
  return metodo === 'GET' || metodo === 'HEAD'
}

/**
 * Espera indicada pelo servidor no header Retry-After, em milissegundos.
 * Sem header, backoff exponencial a partir de 1s.
 */
function esperaDoRetryAfter(res: Response, tentativa: number): number {
  const header = res.headers.get('retry-after')
  const segundos = header ? Number(header) : NaN
  if (Number.isFinite(segundos) && segundos >= 0) return Math.min(segundos * 1000, 10_000)
  return Math.min(1000 * 2 ** tentativa, 10_000)
}

/**
 * `redirecionarNo401: false` é para sondagem de sessão.
 *
 * Um 401 em `/auth/me` não quer dizer "sua sessão expirou": quer dizer "você
 * não está logado", que é a resposta correta para um visitante anônimo. Quem
 * pergunta isso precisa da resposta, não de um redirect — o AuthProvider mora
 * no root layout e consulta /auth/me em toda página, landing e /cadastro
 * inclusive.
 */
export type OpcoesRequest = { redirecionarNo401?: boolean }

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  tentativa429 = 0,
  opcoes: OpcoesRequest = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }

  // `credentials: 'include'` é o que faz o cookie de sessão viajar: a API está
  // em outra origem, e sem isso o navegador simplesmente não o envia.
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: 'include' })

  if (res.status === 401 && retry) {
    if (await tryRefresh()) {
      return request<T>(path, init, false, 0, opcoes)
    }
    if (opcoes.redirecionarNo401 !== false) irParaLogin()
    throw erroDeApi('Sessão expirada. Faça login novamente.', 401, null)
  }

  // 429: o backend limita rotas sensíveis (login, upload, transcrição). Só
  // repetimos o que é seguro repetir — refazer um POST às cegas duplicaria
  // feedback, convite ou saque.
  if (res.status === 429 && ehIdempotente(init) && tentativa429 < RETRY_MAX_429) {
    const espera = esperaDoRetryAfter(res, tentativa429)
    await new Promise((resolve) => setTimeout(resolve, espera))
    return request<T>(path, init, retry, tentativa429 + 1, opcoes)
  }

  const body = await lerCorpo(res)
  if (!res.ok) {
    if (res.status === 403) {
      throw erroDeApi(
        body.message ?? 'Você não tem permissão para esta ação.',
        403,
        body,
      )
    }
    if (res.status === 429) {
      throw erroDeApi(
        body.message ?? 'Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.',
        429,
        body,
      )
    }
    if (res.status === 401) {
      if (opcoes.redirecionarNo401 !== false) irParaLogin()
      throw erroDeApi(body.message ?? 'Sessão expirada. Faça login novamente.', 401, body)
    }
    throw erroDeApi(body.message ?? `Erro ${res.status}`, res.status, body)
  }
  return body
}

export const api = {
  get: <T>(path: string, opcoes?: OpcoesRequest) =>
    request<T>(path, { method: 'GET' }, true, 0, opcoes),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/**
 * Envio de arquivo (multipart) para o backend.
 *
 * Não passa pelo `request` porque o corpo não é JSON: definir
 * `Content-Type: application/json` aqui quebraria o parse do multipart, e
 * deixar o navegador montar o boundary é o único jeito que funciona.
 *
 * Assim como o resto, a credencial é o cookie — nada de header manual.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  init: { method?: string; onProgress?: (porcentagem: number) => void } = {},
): Promise<T> {
  if (init.onProgress) {
    return uploadComProgresso<T>(path, form, init.method ?? 'POST', init.onProgress)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'POST',
    body: form,
    credentials: 'include',
  })

  const body = await lerCorpo(res)
  if (!res.ok) {
    if (res.status === 401) {
      irParaLogin()
      throw erroDeApi(body.message ?? 'Sessão expirada. Faça login novamente.', 401, body)
    }
    throw erroDeApi(body.message ?? `Erro ${res.status}`, res.status, body)
  }
  return body as T
}

/** Mesma leitura tolerante de `lerCorpo`, para a resposta que vem do XHR. */
function lerTexto(texto: string): any {
  if (!texto) return {}
  try {
    return JSON.parse(texto)
  } catch {
    return { message: texto }
  }
}

/**
 * Upload com progresso real.
 *
 * `fetch()` não informa quanto do corpo já subiu — a barra que existia era um
 * número fixo esperando o fim da requisição, o que em arquivo grande parece
 * travamento. `XMLHttpRequest` continua sendo a única API do navegador com
 * `upload.onprogress`, então este caminho existe só por isso, e o de `fetch`
 * segue sendo o padrão para quem não pede progresso.
 *
 * O contrato precisa ser idêntico ao do outro caminho: cookie junto
 * (`withCredentials`), sem `Content-Type` manual — o boundary do multipart é o
 * navegador que monta —, erro com status e 401 levando ao login.
 */
function uploadComProgresso<T>(
  path: string,
  form: FormData,
  metodo: string,
  onProgress: (porcentagem: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(metodo, `${BASE_URL}${path}`)
    xhr.withCredentials = true

    xhr.upload.onprogress = (e) => {
      // Sem lengthComputable não há total: emitir aqui daria NaN na barra.
      if (!e.lengthComputable || !e.total) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      const body = lerTexto(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T)
        return
      }
      if (xhr.status === 401) {
        irParaLogin()
        reject(erroDeApi(body.message ?? 'Sessão expirada. Faça login novamente.', 401, body))
        return
      }
      reject(erroDeApi(body.message ?? `Erro ${xhr.status}`, xhr.status, body))
    }

    // Sem estes três a promessa ficaria pendurada quando a rede cai, o usuário
    // cancela ou o servidor não responde — e a UI travaria em "enviando".
    xhr.onerror = () => reject(erroDeApi('Falha de rede durante o upload', 0, null))
    xhr.onabort = () => reject(erroDeApi('Upload cancelado', 0, null))
    xhr.ontimeout = () => reject(erroDeApi('Tempo esgotado durante o upload', 0, null))

    xhr.send(form)
  })
}

/**
 * Limite máximo de itens por página aceito pelo backend.
 * Rotas com validatePagination (/projetos, /usuarios) rejeitam limit > 100 com 400.
 */
export const MAX_PAGE_SIZE = 100

type Paginated<T> = {
  data: T[]
  pagination?: { page: number; limit: number; total: number }
}

/**
 * Busca todas as páginas de um endpoint paginado, respeitando MAX_PAGE_SIZE.
 *
 * Usar no lugar de `limit=200` & cia: além de estourar o limite do backend,
 * um limite fixo trunca silenciosamente quem tem mais itens que o chute.
 *
 * `path` pode já conter query string — o page/limit é anexado corretamente.
 */
export async function getAll<T>(path: string, maxPages = 20): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?'
  const out: T[] = []

  for (let page = 1; page <= maxPages; page++) {
    const res = await api.get<Paginated<T>>(
      `${path}${sep}page=${page}&limit=${MAX_PAGE_SIZE}`,
    )
    const rows = res.data ?? []
    out.push(...rows)

    const total = res.pagination?.total
    if (total !== undefined ? out.length >= total : rows.length < MAX_PAGE_SIZE) break
  }

  return out
}
