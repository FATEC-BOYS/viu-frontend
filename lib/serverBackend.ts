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

const COOKIES_DE_SESSAO = ['viu_token', 'viu_refresh_token']

/**
 * Credenciais a repassar do navegador para o backend nas rotas BFF.
 *
 * A sessão é um cookie HttpOnly: o navegador o entrega ao servidor Next (mesma
 * origem), e é este que precisa reencaminhá-lo — um fetch de servidor não
 * herda cookie nenhum.
 *
 * Só os cookies de sessão seguem adiante; repassar o header inteiro mandaria
 * para a API qualquer outro cookie do domínio, que não é da conta dela.
 *
 * `Authorization` continua tendo precedência, para clientes que usam bearer.
 */
export function credenciaisDaRequisicao(req: Request): Record<string, string> | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader) return { Authorization: authHeader }

  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  const daSessao = cookieHeader
    .split(';')
    .map((parte) => parte.trim())
    .filter((parte) => COOKIES_DE_SESSAO.some((nome) => parte.startsWith(`${nome}=`)))

  return daSessao.length > 0 ? { cookie: daSessao.join('; ') } : null
}
