// app/api/arte/[id]/aprovacoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/** Helpers */
async function validateToken(
  supabase: ReturnType<typeof getSupabaseServer>,
  arteId: string,
  token: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: link, error } = await supabase
    .from("link_compartilhado")
    .select("id, tipo, arte_id, expira_em")
    .eq("token", token)
    .maybeSingle();

  if (error) return { ok: false, reason: "Falha ao validar link." };
  if (!link) return { ok: false, reason: "Link inválido." };
  if (link.tipo !== "ARTE" || link.arte_id !== arteId)
    return { ok: false, reason: "Token não corresponde à arte." };
  if (link.expira_em && new Date(link.expira_em) < new Date())
    return { ok: false, reason: "Link expirado." };

  return { ok: true };
}

async function getArteVersaoId(
  supabase: ReturnType<typeof getSupabaseServer>,
  arteId: string,
  versaoNum?: number | null
): Promise<{ id: string; versao: number } | null> {
  if (versaoNum && Number.isFinite(versaoNum)) {
    const { data, error } = await supabase
      .from("arte_versoes")
      .select("id, versao")
      .eq("arte_id", arteId)
      .eq("versao", versaoNum)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return { id: data.id, versao: data.versao };
  }

  // pega a última (maior) versão
  const { data, error } = await supabase
    .from("arte_versoes")
    .select("id, versao")
    .eq("arte_id", arteId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, versao: data.versao };
}

/** GET
 * /api/arte/[id]/aprovacoes?token=...&versao=...
 * Retorna aprovadores internos e aprovações via link (convidados) da versão alvo (ou última).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params; // Next 15: params é Promise
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const versaoStr = req.nextUrl.searchParams.get("versao");
  const versaoNum = versaoStr ? Number(versaoStr) : undefined;

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // valida token
  const ok = await validateToken(supabase, arteId, token);
  if (!ok.ok) {
    return NextResponse.json({ error: ok.reason }, { status: 403 });
  }

  // resolve versão alvo
  const versao = await getArteVersaoId(supabase, arteId, versaoNum ?? null);
  if (!versao) {
    return NextResponse.json(
      { error: "Versão não encontrada." },
      { status: 404 }
    );
  }

  try {
    // internos (aprovacoes)
    const { data: internosRaw, error: internosErr } = await supabase
      .from("aprovacoes")
      .select(
        `
        id,
        status,
        comentario,
        criado_em,
        aprovador:aprovador_id ( id, nome, email )
      `
      )
      .eq("arte_id", arteId)
      .eq("arte_versao_id", versao.id);

    if (internosErr) throw internosErr;

    // convidados (arte_versao_aprovacoes) + viewer_guests
    const { data: convidadosRaw, error: convidadosErr } = await supabase
      .from("arte_versao_aprovacoes")
      .select(
        `
        id,
        aprovado,
        atualizado_em,
        convidado:guest_id ( id, nome, email )
      `
      )
      .eq("arte_id", arteId)
      .eq("versao", versao.versao);

    if (convidadosErr) throw convidadosErr;

    return NextResponse.json({
      versao: versao.versao,
      internos: (internosRaw ?? []).map((i: any) => ({
        id: i.id,
        status: i.status,
        comentario: i.comentario,
        criado_em: i.criado_em,
        aprovador: {
          id: i.aprovador?.id ?? null,
          nome: i.aprovador?.nome ?? null,
          email: i.aprovador?.email ?? null,
        },
      })),
      convidados: (convidadosRaw ?? []).map((g: any) => ({
        id: g.id,
        aprovado: !!g.aprovado,
        atualizado_em: g.atualizado_em ?? null,
        convidado: {
          id: g.convidado?.id ?? null,
          nome: g.convidado?.nome ?? null,
          email: g.convidado?.email ?? null,
        },
      })),
    });
  } catch (e) {
    console.error("[GET /api/arte/[id]/aprovacoes] erro:", e);
    return NextResponse.json(
      { error: "Erro ao carregar aprovações." },
      { status: 500 }
    );
  }
}

/** PATCH
 * Body: { aprovadorId: string, decisao: "APROVADO" | "REJEITADO", comentario?: string, versao?: number }
 * Atualiza a decisão de um aprovador interno na versão alvo (ou última).
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params;
  const supabase = getSupabaseServer();

  // (opcional) exigir user autenticado para decidir
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const aprovadorId: string | undefined = body?.aprovadorId;
  const decisao: "APROVADO" | "REJEITADO" | undefined = body?.decisao;
  const comentario: string | undefined = body?.comentario;
  const versaoNum: number | undefined = body?.versao;

  if (!aprovadorId || !decisao) {
    return NextResponse.json(
      { error: "aprovadorId e decisao são obrigatórios." },
      { status: 400 }
    );
  }

  const versao = await getArteVersaoId(supabase, arteId, versaoNum ?? null);
  if (!versao) {
    return NextResponse.json(
      { error: "Versão não encontrada." },
      { status: 404 }
    );
  }

  try {
    // saneia comentário curto
    const comentarioFinal =
      typeof comentario === "string" && comentario.trim().length > 0
        ? comentario.trim()
        : null;

    const { error: upErr } = await supabase
      .from("aprovacoes")
      .update({
        status: decisao,
        comentario: comentarioFinal,
      })
      .eq("arte_id", arteId)
      .eq("arte_versao_id", versao.id)
      .eq("aprovador_id", aprovadorId);

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/arte/[id]/aprovacoes] erro:", e);
    return NextResponse.json(
      { error: "Não foi possível aplicar a decisão." },
      { status: 500 }
    );
  }
}
