/**
 * Chamadas server-side para a API do backend.
 *
 * O backend rejeita qualquer request sem header Origin — a checagem de CORS
 * devolve 500 com "Origin header ausente". Um fetch() de servidor não manda
 * Origin sozinho, então toda chamada daqui falhava silenciosamente: res.ok
 * era false e o chamador caía no fallback vazio.
 *
 * NEXT_PUBLIC_APP_URL precisa estar listada em ALLOWED_ORIGINS no backend.
 *
 * ---
 *
 * Este módulo tinha também `credenciaisDaRequisicao`, `credenciaisDaSessao` e
 * `acessoAArte`, que liam o cookie de sessão do lado do servidor Next para
 * repassá-lo ao backend. Nenhuma delas podia funcionar publicado, e as três
 * foram embora junto com as rotas que as usavam.
 *
 * O motivo, para não ser reinventado: o backend grava o cookie SEM atributo
 * `Domain`, o que o torna host-only — o navegador só o entrega ao host exato
 * que o criou. Em desenvolvimento a API e o app dividem o host `localhost`
 * (porta não conta para cookie) e o servidor Next enxergava tudo; publicados
 * em domínios diferentes, ele nunca via cookie nenhum. O resultado era um
 * app que funcionava inteiro na máquina e, no ar, mandava quem estava logada
 * de volta ao login a cada clique, recusava comentário no link compartilhado
 * e devolvia busca de pessoas vazia, em silêncio.
 *
 * Por isso só sobra aqui o que NÃO depende de sessão: leitura pública, onde
 * resolver no servidor dá a primeira pintura já pronta. Tudo que precisa
 * saber quem é a pessoa é feito pelo navegador, que é quem tem o cookie.
 *
 * Se um dia a API passar a morar no mesmo site registrável que o app
 * (`app.dominio` e `api.dominio`, com `COOKIE_DOMAIN=.dominio`), a leitura
 * do cookie no servidor volta a ser possível — mas aí será uma escolha, e
 * não um acidente que só aparece em produção.
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
