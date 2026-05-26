// Rota removida — Supabase foi desativado
export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Supabase foi removido desta aplicação.' }),
    { status: 410, headers: { 'content-type': 'application/json' } }
  )
}
