// app/viewer/arte/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import ViewerShell from '@/components/viewer/ViewerShell'
import LinkIndisponivel from '@/components/viewer/LinkIndisponivel'
import { backendFetch, credenciaisDaSessao } from '@/lib/serverBackend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ token?: string }>
}

/**
 * A arte pela sessão — sem token nenhum.
 *
 * Este endereço era exclusivo de quem tinha o link, e por isso a peça não
 * tinha endereço nenhum para quem está logado: o dashboard apontava para
 * `/artes/<id>`, que é 404, e a única porta para a arte era o WhatsApp.
 *
 * `GET /artes/:id` aplica a mesma regra de acesso do resto da API — um 200
 * aqui É a autorização. Os comentários vêm à parte porque `/preview` (que os
 * traz junto) só existe para token.
 */
async function porSessao(id: string) {
  const auth = await credenciaisDaSessao()
  if (!auth) redirect(`/login?next=${encodeURIComponent(`/viewer/arte/${id}`)}`)

  const res = await backendFetch(`/artes/${encodeURIComponent(id)}`, { headers: { ...auth } })
  if (res.status === 401) redirect(`/login?next=${encodeURIComponent(`/viewer/arte/${id}`)}`)
  if (!res.ok) return null

  const arte = (await res.json())?.data
  if (!arte?.id) return null

  const resFb = await backendFetch(
    `/feedbacks?arteId=${encodeURIComponent(id)}&limit=200`,
    { headers: { ...auth } },
  )
  const feedbacks = resFb.ok ? ((await resFb.json())?.data ?? []) : []

  return {
    arte,
    feedbacks,
    licenca: arte.licenca ?? null,
    /*
     * `somenteLeitura` é do LINK, e aqui não há link. A permissão de quem está
     * na própria conta vem do acesso ao projeto — que o backend já checou para
     * devolver esta arte. Herdar o switch de algum link faria a mesma pessoa
     * poder ou não comentar conforme qual link o designer configurou por
     * último.
     */
    somenteLeitura: false,
  }
}

export default async function ArteViewerPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const token = sp.token ?? ''

  if (!token) {
    const daSessao = await porSessao(id)
    if (!daSessao) return notFound()
    return <ArteNaTela token="" d={daSessao} />
  }

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
       */
      const corpo = await res.json().catch(() => null)
      return (
        <LinkIndisponivel
          motivo={corpo?.motivo ?? 'NAO_ENCONTRADO'}
          expiraEm={corpo?.expiraEm ?? null}
        />
      )
    }
    raw = await res.json()
  } catch {
    // Rede fora, backend fora: não dá para dizer o motivo, e chutar um seria
    // pior do que o genérico.
    return <LinkIndisponivel motivo="NAO_ENCONTRADO" />
  }

  const d = raw.data ?? raw
  if (!d?.arte) return notFound()
  if (d.arte.id !== id) return notFound()

  return <ArteNaTela token={token} d={d} />
}

/** A tela em si, alimentada por qualquer uma das duas origens. */
function ArteNaTela({ token, d }: { token: string; d: any }) {
  const arte = d.arte

  const feedbacks = (d.feedbacks ?? []).map((f: any) => ({
    id: f.id,
    conteudo: f.conteudo,
    tipo: f.tipo,
    arquivo: f.arquivo ?? null,
    posicao_x: f.posicaoX ?? f.posicao_x ?? null,
    posicao_y: f.posicaoY ?? f.posicao_y ?? null,
    posicao_x_abs: null,
    posicao_y_abs: null,
    status: f.status ?? 'PENDENTE',
    criado_em: f.criadoEm ?? f.criado_em ?? '',
    autor_id: f.autorId ?? null,
    arte_versao_id: null,
    autor_nome: f.autor?.nome ?? f.guestNome ?? null,
    autor_email: f.autor?.email ?? f.guestEmail ?? null,
    // Sobre qual versão o comentário foi feito (cláusula 3.2). Nulo em
    // comentário anterior ao campo — e nulo fica nulo: preencher por dedução
    // produziria um palpite indistinguível de um registro.
    versao_numero: f.versaoNumero ?? null,
  }))

  // `canComment` nunca existiu: GET /preview/:token devolve
  // { somenteLeitura, acessos, arte, feedbacks }. Como `!undefined` é sempre
  // true, TODO link ficava em modo leitura — o cliente nunca conseguiu
  // comentar por link, que é a promessa central do produto. Quem decide é o
  // somenteLeitura do link, e o backend ja recusa feedback nele (403).
  const readOnly = Boolean(d.somenteLeitura)

  const arteForClient = {
    id: arte.id,
    nome: arte.nome,
    arquivo: arte.previewUrl ?? arte.arquivo ?? '',
    largura_px: arte.larguraPx ?? arte.largura_px ?? null,
    altura_px: arte.alturaPx ?? arte.altura_px ?? null,
    versao: arte.versao ?? 1,
    status: arte.status ?? null,
    tipo: arte.tipo ?? null,
    projeto_id: arte.projetoId ?? arte.projeto_id ?? null,
  }

  if (!arteForClient.arquivo) {
    /*
     * Sem URL de exibição não há o que olhar, e este é o único caminho honesto
     * entre mostrar a tela inteira vazia e não mostrar nada. Acontece quando a
     * assinatura do arquivo falha — `signPath` devolve `null` e a arte existe,
     * mas não tem por onde ser vista.
     */
    return (
      <main className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <header className="flex shrink-0 items-baseline gap-2 border-b px-4 py-2.5">
          <h1 className="truncate text-sm font-semibold tracking-tight">{arte.nome}</h1>
          <span className="font-mono text-xs text-muted-foreground">v{arte.versao}</span>
        </header>
        <div className="grid flex-1 place-items-center bg-canvas p-6 text-center">
          <div className="max-w-sm space-y-1">
            <p className="text-sm font-medium">Não consegui abrir esta arte</p>
            <p className="text-sm text-muted-foreground">
              O arquivo existe, mas o endereço de visualização não foi gerado. Recarregue a
              página; se continuar assim, avise quem mandou o link.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const versoes = [
    {
      id: arte.id,
      numero: arte.versao ?? 1,
      criado_em: arte.criadoEm ?? arte.criado_em ?? new Date().toISOString(),
      status: arte.status ?? null,
    },
  ]

  return (
    <ViewerShell
      arte={arteForClient}
      initialFeedbacks={feedbacks}
      versoes={versoes}
      aprovacoesByVersao={{}}
      readOnly={readOnly}
      token={token}
      /* Cláusula 7.1 do anexo: quem abre o link é quem vai usar a peça, e o
         uso só é licenciado depois da quitação. Vem calculado do backend a
         partir das faturas do projeto. */
      licenca={d.licenca ?? null}
    />
  )
}
