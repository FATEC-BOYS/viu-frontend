// app/api/arte/[id]/aprovacoes/lembrete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();

  try {
    const { id: arteId } = await context.params; // Next 15: params é Promise
    const body = (await req.json()) as {
      aprovacaoId: string;
      enviadoPara: string; // usuarios.id
      enviadoPor?: string; // opcional: se você não tiver sessão ainda
      cooldownHoras?: number;
    };

    if (!body?.aprovacaoId || !body?.enviadoPara) {
      return NextResponse.json(
        { error: "Parâmetros inválidos." },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("cobrar_aprovacao", {
      p_aprovacao_id: body.aprovacaoId,
      p_enviado_por: body.enviadoPor ?? null,
      p_enviado_para: body.enviadoPara,
      p_cooldown_horas: body.cooldownHoras ?? 24,
    });

    if (error) {
      console.error("[POST /api/arte/[id]/aprovacoes/lembrete] RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/arte/[id]/aprovacoes/lembrete] error:", e);
    return NextResponse.json(
      { error: e?.message || "Erro ao enviar lembrete." },
      { status: 500 }
    );
  }
}
