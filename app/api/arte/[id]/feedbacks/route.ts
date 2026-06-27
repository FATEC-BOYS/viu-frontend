// app/api/arte/[id]/feedbacks/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/**
 * GET /api/arte/[id]/feedbacks?token=XYZ
 * Valida o token via GET /preview/:token (que já filtra por arte)
 * e retorna os feedbacks incluídos na resposta de preview.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/preview/${token}`, { cache: "no-store" });
    if (!res.ok) {
      const status = res.status === 404 ? 404 : 403;
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status });
    }

    const body = await res.json();
    const preview = body?.data;

    if (!preview?.arte?.id) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }

    if (preview.arte.id !== arteId) {
      return NextResponse.json({ error: "Token não corresponde a esta arte." }, { status: 403 });
    }

    return NextResponse.json(preview.feedbacks ?? []);
  } catch (err) {
    console.error("[GET /api/arte/[id]/feedbacks] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar feedbacks." }, { status: 500 });
  }
}
