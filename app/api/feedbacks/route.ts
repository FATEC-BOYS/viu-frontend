import { backendFetch } from "@/lib/serverBackend";
import { NextResponse } from 'next/server'


export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // JSON (texto/posicional) — proxy direto para o backend
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { token, conteudo, tipo, guestNome, guestEmail, posicao_x, posicao_y } = body

      const res = await backendFetch(`/links/${token}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudo: conteudo ?? '',
          tipo: tipo ?? 'TEXTO',
          guestNome: guestNome ?? null,
          guestEmail: guestEmail ?? null,
          posicaoX: posicao_x ?? null,
          posicaoY: posicao_y ?? null,
        }),
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.ok ? 201 : res.status })
    }

    // Form-data (áudio) — encaminha multipart ao backend
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const token = String(form.get('token') || '')
      const file = form.get('file') as File | null

      if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
      if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

      // Monta novo FormData para encaminhar ao backend
      const fwd = new FormData()
      fwd.append('audio', file, file.name)
      const arteId = form.get('arteId'); if (arteId) fwd.append('arteId', String(arteId))
      const guestNome = form.get('nome'); if (guestNome) fwd.append('guestNome', String(guestNome))
      const guestEmail = form.get('email'); if (guestEmail) fwd.append('guestEmail', String(guestEmail))
      const posX = form.get('posicao_x'); if (posX) fwd.append('posicaoX', String(posX))
      const posY = form.get('posicao_y'); if (posY) fwd.append('posicaoY', String(posY))

      const res = await backendFetch(`/links/${token}/feedbacks/audio`, {
        method: 'POST',
        body: fwd,
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.ok ? 201 : res.status })
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 415 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
