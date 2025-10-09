// app/api/feedbacks/[id]/respostas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type RespostaRow = {
  id: string;
  feedback_id: string;
  autor_id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  criado_em: string;
  usuarios?: { id: string; nome: string | null } | null;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  try {
    const { id: feedbackId } = await ctx.params;

    const { data, error } = await supabase
      .from("feedback_respostas")
      .select(
        "id, feedback_id, autor_id, conteudo, tipo, arquivo, criado_em, usuarios:autor_id ( id, nome )"
      )
      .eq("feedback_id", feedbackId)
      .order("criado_em", { ascending: true })
      .returns<RespostaRow[]>();

    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((r) => ({
        id: r.id,
        feedback_id: r.feedback_id,
        autor: { id: r.autor_id, nome: r.usuarios?.nome ?? null },
        conteudo: r.conteudo,
        tipo: r.tipo,
        arquivo: r.arquivo,
        criado_em: r.criado_em,
      }))
    );
  } catch (e: any) {
    console.error("[GET /feedbacks/[id]/respostas] err:", e?.message || e);
    return NextResponse.json({ error: "Erro ao listar respostas." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();
  try {
    const { id: feedbackId } = await ctx.params;
    const body = await req.json();

    // corpo esperado: { conteudo: string, statusAfter?: 'EM_ANALISE'|'RESOLVIDO'|'ARQUIVADO'|'ABERTO' }
    const conteudo: string | undefined =
      typeof body?.conteudo === "string" ? body.conteudo.trim() : undefined;
    const statusAfter: string | undefined =
      typeof body?.statusAfter === "string" ? body.statusAfter : undefined;

    if (!conteudo) {
      return NextResponse.json({ error: "conteudo obrigatório." }, { status: 400 });
    }

    // resolve autor_id a partir do auth user
    const { data: auth } = await supabase.auth.getUser();
    const authUserId = auth?.user?.id;
    if (!authUserId) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: link, error: linkErr } = await supabase
      .from("usuario_auth")
      .select("usuario_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle<{ usuario_id: string }>();
    if (linkErr || !link) {
      return NextResponse.json(
        { error: "Não foi possível mapear o usuário logado." },
        { status: 403 }
      );
    }

    // cria a resposta
    const { data: inserted, error: insErr } = await supabase
      .from("feedback_respostas")
      .insert({
        feedback_id: feedbackId,
        autor_id: link.usuario_id,
        conteudo,
        tipo: "TEXTO",
        arquivo: null,
      })
      .select(
        "id, feedback_id, autor_id, conteudo, tipo, arquivo, criado_em, usuarios:autor_id ( id, nome )"
      )
      .single<RespostaRow>();
    if (insErr) throw insErr;

    // opcional: atualizar status do feedback após responder
    let statusChanged = false;
    if (
      statusAfter &&
      ["ABERTO", "EM_ANALISE", "RESOLVIDO", "ARQUIVADO"].includes(statusAfter)
    ) {
      const { error: updErr } = await supabase
        .from("feedbacks")
        .update({ status: statusAfter })
        .eq("id", feedbackId);
      if (!updErr) statusChanged = true;
    }

    return NextResponse.json({
      ok: true,
      statusChanged,
      resposta: {
        id: inserted.id,
        feedback_id: inserted.feedback_id,
        autor: { id: inserted.autor_id, nome: inserted.usuarios?.nome ?? null },
        conteudo: inserted.conteudo,
        tipo: inserted.tipo,
        arquivo: inserted.arquivo,
        criado_em: inserted.criado_em,
      },
    });
  } catch (e: any) {
    console.error("[POST /feedbacks/[id]/respostas] err:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao enviar resposta." },
      { status: 500 }
    );
  }
}
