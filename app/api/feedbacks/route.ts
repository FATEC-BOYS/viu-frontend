import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase storage não configurado')
  return createClient(url, key)
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''

    // JSON (texto/posicional) — proxy direto para o backend
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { token, conteudo, tipo, guestNome, guestEmail, posicao_x, posicao_y } = body

      const res = await fetch(`${BACKEND_URL}/links/${token}/feedbacks`, {
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

    // Form-data (áudio) — upload no Supabase Storage (service role), envia URL ao backend
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const token = String(form.get('token') || '')
      const arteId = String(form.get('arteId') || '')
      const guestEmail = String(form.get('email') || '')
      const guestNome = (form.get('nome') as string) || null
      const file = form.get('file') as File | null
      const posX = form.get('posicao_x')
      const posY = form.get('posicao_y')

      if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })

      const supabase = getSupabaseAdmin()
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const ext = file.name.split('.').pop() || 'webm'
      const path = `${arteId}/${crypto.randomUUID()}.${ext}`

      const { data: up, error: upErr } = await supabase.storage
        .from('feedbacks')
        .upload(path, bytes, { contentType: file.type || 'audio/webm' })

      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('feedbacks').getPublicUrl(up.path)

      const res = await fetch(`${BACKEND_URL}/links/${token}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudo: '',
          tipo: 'AUDIO',
          arquivo: pub.publicUrl,
          guestNome,
          guestEmail,
          posicaoX: posX ? parseFloat(String(posX)) : null,
          posicaoY: posY ? parseFloat(String(posY)) : null,
        }),
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
