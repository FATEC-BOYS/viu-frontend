// app/api/arte/[id]/fechar/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServer();

  try {
    const { id: arteId } = await ctx.params; // Next 15: await
    const { error } = await supabase.rpc("fechar_para_aprovacao", {
      p_arte_id: arteId,
    });

    if (error) {
      console.error("[POST /arte/[id]/fechar] RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /arte/[id]/fechar] error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Erro ao fechar para aprovação." },
      { status: 500 }
    );
  }
}
