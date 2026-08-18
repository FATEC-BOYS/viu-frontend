/**
 * Chamadas server-side (rotas BFF em app/api/*) para a API do backend.
 *
 * O backend rejeita qualquer request sem header Origin — a checagem de CORS
 * devolve 500 com "Origin header ausente". Um fetch() de servidor não manda
 * Origin sozinho, então toda rota BFF falhava silenciosamente: res.ok era
 * false e o handler caía no fallback vazio.
 *
 * NEXT_PUBLIC_APP_URL precisa estar listada em ALLOWED_ORIGINS no backend.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(`${BACKEND_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      Origin: APP_ORIGIN,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}
