// app/api/arte/[id]/aprovacoes/lembrete/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  try {
    const body = (await req.json()) as {
      aprovacaoId: string;
      enviadoPara: string; // usuarios.id
      enviadoPor?: string; // opcional: se você não tiver sessão ainda
      cooldownHoras?: number;
    };

    if (!body?.aprovacaoId || !body?.enviadoPara) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const { error } = await supabase.rpc("cobrar_aprovacao", {
      p_aprovacao_id: body.aprovacaoId,
      p_enviado_por: body.enviadoPor ?? null, // se usar sessão, substitua aqui
      p_enviado_para: body.enviadoPara,
      p_cooldown_horas: body.cooldownHoras ?? 24,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Erro ao enviar lembrete." }, { status: 500 });
  }
}
