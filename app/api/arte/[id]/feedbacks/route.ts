// app/api/arte/[id]/feedbacks/route.ts
import { acessoAArte, backendFetch } from "@/lib/serverBackend";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/arte/[id]/feedbacks?token=XYZ
 *
 * Os comentários da arte, para quem pode vê-la — por token de link OU por
 * sessão. Antes só existia o primeiro caminho, e sem token a rota respondia
 * 400: quem está logado não tinha como abrir a própria arte fora do link.
 *
 * As duas fontes são diferentes de propósito. Pelo token, os comentários vêm
 * de `/preview/:token`, que é o que o link entrega e já respeita as regras do
 * link. Pela sessão, vêm de `/feedbacks?arteId=`, que aplica o acesso ao
 * projeto. Não dá para usar `/preview` sem token nem `/feedbacks` sem sessão.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params;
  const token = req.nextUrl.searchParams.get("token");

  const acesso = await acessoAArte(req, arteId, token);
  if (!acesso.ok) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 403 });
  }

  try {
    if (acesso.via === "token") {
      const res = await backendFetch(`/preview/${token}`, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 403 });
      }
      const body = await res.json();
      return NextResponse.json(body?.data?.feedbacks ?? []);
    }

    const res = await backendFetch(
      `/feedbacks?arteId=${encodeURIComponent(arteId)}&limit=200`,
      { headers: { ...acesso.credenciais }, cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar feedbacks." }, { status: res.status });
    }
    const body = await res.json();
    return NextResponse.json(body?.data ?? []);
  } catch (err) {
    console.error("[GET /api/arte/[id]/feedbacks] erro:", err);
    return NextResponse.json({ error: "Erro ao buscar feedbacks." }, { status: 500 });
  }
}
