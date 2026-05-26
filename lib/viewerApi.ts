// lib/viewerApi.ts — sem Supabase Edge Functions; usa /api/feedbacks (proxy Next.js)
const NEXT_FEEDBACKS_URL = '/api/feedbacks'

type BasePayload = {
  token: string
  arteId: string
  arteVersaoId?: string | null
  posX?: number | null
  posY?: number | null
  posXAbs?: number | null
  posYAbs?: number | null
  viewerEmail: string
  viewerNome?: string | null
}

export async function postTextFeedback(payload: BasePayload & { content: string }) {
  const res = await fetch(NEXT_FEEDBACKS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: payload.token,
      conteudo: payload.content,
      tipo: 'TEXTO',
      guestEmail: payload.viewerEmail,
      guestNome: payload.viewerNome ?? null,
      posicao_x: payload.posX ?? null,
      posicao_y: payload.posY ?? null,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function postAudioFeedback(payload: BasePayload & { blob: Blob }) {
  const form = new FormData()
  form.set('token', payload.token)
  form.set('arteId', payload.arteId)
  form.set('email', payload.viewerEmail)
  if (payload.viewerNome) form.set('nome', payload.viewerNome)
  form.set('file', payload.blob, `feedback-${Date.now()}.webm`)
  if (payload.posX != null) form.set('posicao_x', String(payload.posX))
  if (payload.posY != null) form.set('posicao_y', String(payload.posY))
  const res = await fetch(NEXT_FEEDBACKS_URL, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function getAudioStreamUrl(path: string, _token: string) {
  if (/^https?:\/\//i.test(path)) return path
  return path
}
