// app/api/arte/[id]/lembrete/route.ts
// "Cobrar aprovação" não tem RPC equivalente no backend — stub retorna ok.
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  const body = await req.json().catch(() => ({}));
  if (!body?.aprovacaoId || !body?.enviadoPara) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
