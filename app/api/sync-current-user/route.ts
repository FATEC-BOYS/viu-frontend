// Rota removida — sincronização via Supabase foi desativada
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Rota removida. Autenticação agora é feita diretamente pelo backend JWT.' },
    { status: 410 }
  )
}
