// app/viewer/arte/[id]/page.tsx
import { notFound } from 'next/navigation'
import ViewerShell from '@/components/viewer/ViewerShell'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

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
    const res = await fetch(`${BACKEND_URL}/preview/${token}`, { cache: 'no-store' })
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
  }))

  const readOnly = Boolean(d.somenteLeitura || !d.canComment)

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
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="rounded-2xl overflow-hidden border mb-4">
          <div className="bg-gradient-to-r from-primary/70 to-primary/25 h-20" />
          <div className="p-4 bg-card">
            <h1 className="text-2xl font-semibold tracking-tight">
              {arte.nome}{' '}
              <span className="text-muted-foreground">— v{arte.versao}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Preparando visualização…</p>
          </div>
        </header>
        <div className="rounded-2xl border overflow-hidden">
          <div className="aspect-video bg-muted animate-pulse" />
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
    />
  )
}
