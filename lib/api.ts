const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const TOKEN_KEY = 'viu_token'
const REFRESH_KEY = 'viu_refresh_token'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

async function tryRefresh(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null
  if (!refreshToken) return null

  if (isRefreshing) {
    return new Promise((resolve) => { refreshQueue.push(resolve) })
  }

  isRefreshing = true
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_KEY)
      refreshQueue.forEach((cb) => cb(null))
      refreshQueue = []
      return null
    }
    const body = await res.json()
    const newToken: string = body.data.token
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(REFRESH_KEY, body.data.refreshToken)
    if (body.data.usuario) {
      localStorage.setItem('viu_user', JSON.stringify(body.data.usuario))
    }
    refreshQueue.forEach((cb) => cb(newToken))
    refreshQueue = []
    return newToken
  } catch {
    refreshQueue.forEach((cb) => cb(null))
    refreshQueue = []
    return null
  } finally {
    isRefreshing = false
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (res.status === 401 && retry) {
    const newToken = await tryRefresh()
    if (newToken) {
      return request<T>(path, init, false)
    }
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const body = await res.json()
  if (!res.ok) {
    const err = new Error(body.message ?? `Erro ${res.status}`) as Error & { status: number; body: unknown }
    err.status = res.status
    err.body = body
    throw err
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
 * Header de auth para chamadas que não passam por api.* — por exemplo os
 * fetch() diretos nas rotas BFF /api/contacts/*, que repassam o token adiante.
 */
export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
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
