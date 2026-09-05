// lib/feedbacks.ts — usa a API REST do backend
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function resolveLinkToken(token: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/preview/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const d = json.data ?? json
    if (!d?.arte) return null
    return {
      arte_id: d.arte.id,
      arte_nome: d.arte.nome,
      arquivo: d.arte.previewUrl ?? d.arte.arquivo ?? '',
      tipo: d.arte.tipo,
      versao: d.arte.versao,
      projeto_id: d.arte.projetoId ?? '',
      projeto_nome: '',
      cliente_id: '',
      cliente_nome: '',
      expira_em: null as string | null,
      somente_leitura: d.somenteLeitura ?? false,
    }
  } catch {
    return null
  }
}

export async function insertFeedbackViaToken(params: {
  token: string
  conteudo: string
  tipo?: 'TEXTO' | 'AUDIO'
  arquivo?: string | null
  pos_x?: number | null
  pos_y?: number | null
  pos_x_abs?: number | null
  pos_y_abs?: number | null
  versao?: number | null
}) {
  const res = await fetch(`${BACKEND_URL}/links/${params.token}/feedbacks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conteudo: params.conteudo,
      tipo: params.tipo ?? 'TEXTO',
      arquivo: params.arquivo ?? null,
      posicaoX: params.pos_x ?? null,
      posicaoY: params.pos_y ?? null,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.id ?? data.data?.id ?? ''
}

export async function listFeedbacksByArte(arteId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/artes/${arteId}/feedbacks`, { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? json ?? []
  } catch {
    return []
  }
}

export async function listRespostas(_feedbackId: string) {
  return []
}

export async function addResposta(
  _feedbackId: string,
  _conteudo: string,
  _autorId: string
) {
  // não implementado ainda no backend
}
