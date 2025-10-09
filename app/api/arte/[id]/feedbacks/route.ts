// app/api/arte/[id]/feedbacks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/**
 * GET /api/arte/[id]/feedbacks?token=XYZ
 * Retorna todos os feedbacks de uma arte vinculada a um link compartilhado válido.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params; // <= Next 15: params é Promise
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  try {
    // 1) Valida o link compartilhado
    const { data: link, error: linkError } = await supabase
      .from("link_compartilhado")
      .select(
        "id, tipo, expira_em, arte_id, can_comment, can_download, somente_leitura"
      )
      .eq("token", token)
      .maybeSingle();

    if (linkError) throw linkError;
    if (!link) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }

    // Garante que o link é do tipo ARTE e aponta para a mesma arte
    if (link.tipo !== "ARTE" || link.arte_id !== arteId) {
      return NextResponse.json(
        { error: "Token não corresponde a esta arte." },
        { status: 403 }
      );
    }

    // 2) Verifica expiração (se houver)
    if (link.expira_em && new Date(link.expira_em) < new Date()) {
      return NextResponse.json({ error: "Link expirado." }, { status: 403 });
    }

    // 3) Busca os feedbacks relacionados à arte
    const { data: feedbacks, error: fbError } = await supabase
      .from("feedbacks")
      .select(
        `
        id,
        conteudo,
        tipo,
        arquivo,
        status,
        criado_em,
        arte_versao_id,
        autor_nome,
        autor_email,
        autor_externo_id
        `
      )
      .eq("arte_id", arteId)
      .order("criado_em", { ascending: true });

    if (fbError) throw fbError;

    return NextResponse.json(feedbacks ?? []);
  } catch (err) {
    console.error("[GET /api/arte/[id]/feedbacks] erro:", err);
    return NextResponse.json(
      { error: "Erro ao buscar feedbacks." },
      { status: 500 }
    );
  }
}
