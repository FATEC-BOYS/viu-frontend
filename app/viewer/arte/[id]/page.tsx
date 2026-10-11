// app/viewer/arte/[id]/page.tsx
import { notFound } from 'next/navigation'
import ArteNaTela from '@/components/viewer/ArteNaTela'
import ArtePorSessao from '@/components/viewer/ArtePorSessao'
import LinkIndisponivel, { motivoDaResposta } from '@/components/viewer/LinkIndisponivel'
import { backendFetch } from '@/lib/serverBackend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ token?: string }>
}

/**
 * A arte por duas origens, e só uma delas cabe no servidor.
 *
 * Por TOKEN continua aqui: `GET /preview/:token` é leitura pública, não
 * precisa de cookie nenhum, e resolver no servidor dá a primeira pintura já
 * com a arte — o link vai para o WhatsApp e abre em rede de celular.
 *
 * Por SESSÃO saiu para o navegador. Este arquivo lia o cookie com
 * `credenciaisDaSessao()`, e isso só podia funcionar em desenvolvimento: o
 * cookie vem do backend sem atributo `Domain`, logo host-only, e o navegador
 * só o entrega ao host que o criou. Local o host é o mesmo (`localhost`, e
 * porta não conta para cookie); publicados são dois domínios, o servidor Next
 * nunca via o cookie, e toda abertura pela conta virava `/login?next=…` —
 * inclusive logo depois de fazer login, de novo e de novo.
 */
export default async function ArteViewerPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const token = sp.token ?? ''

  if (!token) return <ArtePorSessao id={id} />

  let raw: any
  try {
    // Mesmo motivo do resolvedor de link: sem header Origin o backend recusa,
    // e a arte compartilhada virava 404.
    const res = await backendFetch(`/preview/${token}`)
    if (!res.ok) {
      /*
       * O motivo vem do backend e é MOSTRADO, em vez de virar página em branco.
       *
       * `notFound()` aqui tratava revogado, expirado, limite atingido e token
       * inexistente como a mesma coisa: nada. O cliente abria no celular, via
       * branco, e voltava para o WhatsApp dizendo "não abriu" — e cada um
       * desses casos tem um próximo passo diferente.
       *
       * A classificação é lista de PERMISSÃO, a mesma de `/l/[token]`: só os
       * motivos que o backend atribui ao link acusam o link, e qualquer outra
       * recusa — 429 do limitador, 403, 502 — cai em falha nossa. Enumerar as
       * falhas em vez das recusas é o que fazia um link bom ser chamado de
       * incompleto.
       */
      const corpo = await res.json().catch(() => null)
      const motivo = motivoDaResposta(corpo)
      if (motivo === 'FALHA_TEMPORARIA') {
        console.error('[/viewer/arte] backend recusou sem motivo de link', {
          status: res.status,
          token: token.slice(0, 8),
        })
        return <LinkIndisponivel motivo={motivo} tentarEm={`/viewer/arte/${id}?token=${token}`} />
      }
      return <LinkIndisponivel motivo={motivo} expiraEm={corpo?.expiraEm ?? null} />
    }
    raw = await res.json()
  } catch {
    // Rede fora, backend fora: o problema é nosso, e insistir é o que resolve.
    console.error('[/viewer/arte] falha ao falar com o backend', { token: token.slice(0, 8) })
    return (
      <LinkIndisponivel
        motivo="FALHA_TEMPORARIA"
        tentarEm={`/viewer/arte/${id}?token=${token}`}
      />
    )
  }

  const d = raw.data ?? raw
  if (!d?.arte) return notFound()
  if (d.arte.id !== id) return notFound()

  return <ArteNaTela token={token} d={d} />
}
