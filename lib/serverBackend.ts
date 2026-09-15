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

/**
 * Quem pode ver esta arte — por token de link OU por sessão.
 *
 * As rotas BFF do visualizador nasceram todas do link: validavam `?token=` em
 * `/preview/:token` e, sem token, respondiam 400. Isso deixou a arte sem
 * endereço para quem está logado — o dashboard linkava `/artes/<id>`, que é
 * 404, e a única porta para a peça era o link do WhatsApp.
 *
 * As duas credenciais são legítimas e diferentes:
 *
 *   token   — quem recebeu o link. O backend já decide se ele vale (revogado,
 *             expirado, limite atingido) e a qual arte pertence.
 *   sessão  — quem é do projeto. `GET /artes/:id` aplica a mesma regra de
 *             acesso do resto da API; um 200 aqui É a autorização.
 *
 * Nenhuma das duas é checada aqui: as duas são delegadas ao backend, que é
 * onde a regra mora. Esta função só diz qual delas respondeu sim.
 */
export type AcessoAArte =
  | { ok: true; via: 'token'; credenciais: Record<string, string> | null }
  | { ok: true; via: 'sessao'; credenciais: Record<string, string> }
  | { ok: false }

export async function acessoAArte(
  req: Request,
  arteId: string,
  token: string | null,
): Promise<AcessoAArte> {
  const credenciais = credenciaisDaRequisicao(req)

  if (token) {
    try {
      const res = await backendFetch(`/preview/${token}`)
      if (res.ok) {
        const corpo = await res.json()
        // O token precisa ser DESTA arte: um token válido de outra peça não
        // vira crachá para qualquer id na URL.
        if (corpo?.data?.arte?.id === arteId) return { ok: true, via: 'token', credenciais }
      }
    } catch {
      // Cai para a sessão: token quebrado não deve derrubar quem é do projeto.
    }
  }

  if (credenciais) {
    try {
      const res = await backendFetch(`/artes/${encodeURIComponent(arteId)}`, {
        headers: { ...credenciais },
      })
      if (res.ok) return { ok: true, via: 'sessao', credenciais }
    } catch {
      // idem
    }
  }

  return { ok: false }
}

/**
 * As mesmas credenciais, num Server Component.
 *
 * As rotas BFF recebem um `Request` e leem o cookie dele; uma página servida
 * no servidor não tem `Request` na mão — o cookie vem de `next/headers`. É a
 * mesma sessão e a mesma lista de cookies; muda só de onde se lê.
 */
export async function credenciaisDaSessao(): Promise<Record<string, string> | null> {
  const { cookies } = await import('next/headers')
  const jar = await cookies()

  const daSessao = COOKIES_DE_SESSAO.map((nome) => {
    const c = jar.get(nome)
    return c ? `${nome}=${c.value}` : null
  }).filter((p): p is string => p !== null)

  return daSessao.length > 0 ? { cookie: daSessao.join('; ') } : null
}
