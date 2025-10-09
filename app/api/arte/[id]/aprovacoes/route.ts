// app/api/arte/[id]/aprovacoes/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/** Tipos mínimos */
type Arte = { id: string; versao_atual: number | null; versao: number | null };
type ArteVersao = { id: string; versao: number };
type Usuario = { id: string; nome: string | null; email: string | null };
type AprovacaoRow = {
  id: string;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  comentario: string | null;
  aprovador_id: string;
  criado_em: string;
  arte_versao_id: string;
  usuarios?: Usuario | null;
};
type AprovGuestRow = {
  id: string;
  aprovado: boolean;
  atualizado_em: string | null;
  guest_id: string;
  viewer_guests?: { id: string; nome: string | null; email: string | null } | null;
};
type Decisao = "APROVADO" | "REJEITADO";

/** utils */
function parseVersaoParam(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function getArteVersaoId(
  supabase: ReturnType<typeof getSupabaseServer>,
  arteId: string,
  versao?: number
): Promise<{ id: string; numero: number } | null> {
  if (versao != null) {
    const { data, error } = await supabase
      .from("arte_versoes")
      .select("id, versao")
      .eq("arte_id", arteId)
      .eq("versao", versao)
      .maybeSingle<ArteVersao>();
    if (error) throw error;
    return data ? { id: data.id, numero: data.versao } : null;
  }

  const { data: art, error: eArt } = await supabase
    .from("artes")
    .select("versao_atual, versao")
    .eq("id", arteId)
    .maybeSingle<Arte>();
  if (eArt) throw eArt;

  const numero = art?.versao_atual ?? art?.versao ?? 1;

  const { data: av, error: eAv } = await supabase
    .from("arte_versoes")
    .select("id, versao")
    .eq("arte_id", arteId)
    .eq("versao", numero)
    .maybeSingle<ArteVersao>();
  if (eAv) throw eAv;

  return av ? { id: av.id, numero: av.versao } : null;
}

async function validateToken(
  supabase: ReturnType<typeof getSupabaseServer>,
  arteId: string,
  token?: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: "Token ausente." };

  const { data: link, error } = await supabase
    .from("link_compartilhado")
    .select("id, tipo, arte_id, expira_em, somente_leitura, can_comment")
    .eq("token", token)
    .maybeSingle<{
      id: string;
      tipo: string;
      arte_id: string | null;
      expira_em: string | null;
      somente_leitura: boolean;
      can_comment: boolean;
    }>();

  if (error) return { ok: false, reason: error.message };
  if (!link) return { ok: false, reason: "Link inválido." };
  if (link.tipo !== "ARTE" || link.arte_id !== arteId)
    return { ok: false, reason: "Token não pertence à arte." };
  if (link.expira_em && new Date(link.expira_em) < new Date())
    return { ok: false, reason: "Link expirado." };

  return { ok: true };
}

/** GET */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  try {
    const { id: arteId } = await ctx.params; // ✅ Next 15: await
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const versaoNum = parseVersaoParam(searchParams.get("versao"));

    const ok = await validateToken(supabase, arteId, token);
    if (!ok.ok) return NextResponse.json({ error: ok.reason }, { status: 403 });

    const versao = await getArteVersaoId(supabase, arteId, versaoNum);
    if (!versao) {
      return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
    }

    // internos
    const { data: aprovInt, error: e1 } = await supabase
      .from("aprovacoes")
      .select(
        "id, status, comentario, aprovador_id, criado_em, arte_versao_id, usuarios:aprovador_id ( id, nome, email )"
      )
      .eq("arte_versao_id", versao.id)
      .order("criado_em", { ascending: true })
      .returns<AprovacaoRow[]>();
    if (e1) throw e1;

    // convidados
    const { data: aprovGuest, error: e2 } = await supabase
      .from("arte_versao_aprovacoes")
      .select(
        "id, aprovado, atualizado_em, guest_id, viewer_guests:guest_id ( id, nome, email )"
      )
      .eq("arte_id", arteId)
      .eq("versao", versao.numero)
      .order("atualizado_em", { ascending: true })
      .returns<AprovGuestRow[]>();
    if (e2) throw e2;

    return NextResponse.json({
      versao: versao.numero,
      internos: (aprovInt ?? []).map((a) => ({
        id: a.id,
        status: a.status,
        comentario: a.comentario,
        criado_em: a.criado_em,
        aprovador: {
          id: a.aprovador_id,
          nome: a.usuarios?.nome ?? null,
          email: a.usuarios?.email ?? null,
        },
      })),
      convidados: (aprovGuest ?? []).map((g) => ({
        id: g.id,
        aprovado: g.aprovado,
        atualizado_em: g.atualizado_em,
        convidado: {
          id: g.viewer_guests?.id ?? null,
          nome: g.viewer_guests?.nome ?? null,
          email: g.viewer_guests?.email ?? null,
        },
      })),
    });
  } catch (err: any) {
    console.error("[GET /arte/[id]/aprovacoes] erro:", err?.message || err);
    return NextResponse.json({ error: "Erro ao listar aprovações." }, { status: 500 });
  }
}

/** PATCH */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  try {
    const { id: arteId } = await ctx.params; // ✅ Next 15: await
    const bodyRaw = await req.json();

    const body = ((): {
      versao?: number;
      aprovadorId?: string;
      decisao: Decisao;
      comentario?: string | null;
    } => {
      const d = bodyRaw?.decisao as string | undefined;
      const decisao = d === "APROVADO" || d === "REJEITADO" ? d : undefined;
      const aprovadorId =
        typeof bodyRaw?.aprovadorId === "string" ? bodyRaw.aprovadorId : undefined;
      const versao =
        typeof bodyRaw?.versao === "number" && Number.isFinite(bodyRaw.versao)
          ? bodyRaw.versao
          : undefined;
      const comentario =
        typeof bodyRaw?.comentario === "string" ? bodyRaw.comentario : undefined;
      if (!decisao) throw new Error("Decisão inválida. Use 'APROVADO' ou 'REJEITADO'.");
      return { decisao, aprovadorId, versao, comentario: comentario ?? null };
    })();

    if (!body.aprovadorId) {
      return NextResponse.json(
        { error: "aprovadorId ausente. Integre sessão para omitir." },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("decidir_aprovacao", {
      p_arte_id: arteId,
      p_aprovador_id: body.aprovadorId,
      p_decisao: body.decisao,
      p_comentario: body.comentario ?? null,
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PATCH /arte/[id]/aprovacoes] erro:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Erro ao decidir aprovação." },
      { status: 500 }
    );
  }
}
