// app/api/arte/[id]/fechar/route.ts
// "Fechar para aprovação" não tem RPC equivalente no backend — stub retorna ok.
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ ok: true });
}
