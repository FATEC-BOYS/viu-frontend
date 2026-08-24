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
  window.location.href = `/login?next=${encodeURIComponent(destino)}`
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

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  tentativa429 = 0,
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
      return request<T>(path, init, false)
    }
    irParaLogin()
    throw erroDeApi('Sessão expirada. Faça login novamente.', 401, null)
  }

  // 429: o backend limita rotas sensíveis (login, upload, transcrição). Só
  // repetimos o que é seguro repetir — refazer um POST às cegas duplicaria
  // feedback, convite ou saque.
  if (res.status === 429 && ehIdempotente(init) && tentativa429 < RETRY_MAX_429) {
    const espera = esperaDoRetryAfter(res, tentativa429)
    await new Promise((resolve) => setTimeout(resolve, espera))
    return request<T>(path, init, retry, tentativa429 + 1)
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
      irParaLogin()
      throw erroDeApi(body.message ?? 'Sessão expirada. Faça login novamente.', 401, body)
    }
    throw erroDeApi(body.message ?? `Erro ${res.status}`, res.status, body)
  }
  return body
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
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
  init: { method?: string } = {},
): Promise<T> {
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
