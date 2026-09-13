// app/viewer/arte/[id]/page.tsx
import { notFound } from 'next/navigation'
import ViewerShell from '@/components/viewer/ViewerShell'
import { backendFetch } from '@/lib/serverBackend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ token?: string }>
}

export default async function ArteViewerPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const token = sp.token ?? ''
  if (!token) return notFound()

  let raw: any
  try {
    // Mesmo motivo do resolvedor de link: sem header Origin o backend recusa,
    // e a arte compartilhada virava 404.
    const res = await backendFetch(`/preview/${token}`)
    if (!res.ok) return notFound()
    raw = await res.json()
  } catch {
    return notFound()
  }

  const d = raw.data ?? raw
  if (!d?.arte) return notFound()

  const arte = d.arte
  if (arte.id !== id) return notFound()

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
