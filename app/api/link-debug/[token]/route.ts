import type { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SharedLink = {
  id: string;
  token: string;
  somente_leitura: boolean;
  expira_em: string | null;
  arte_id: string;
  projeto_id: string | null;
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> } // 👈 Next 15: Promise
) {
  const { token } = await ctx.params; // 👈 await aqui
  const supabase = getSupabaseServer();

  const nowIso = new Date().toISOString();

  const sel = await supabase
    .from("link_compartilhado")
    .select("id, token, somente_leitura, expira_em, arte_id, projeto_id")
    .eq("token", token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle<SharedLink>();

  const out: any = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    link: { data: sel.data, error: sel.error?.message ?? null, code: sel.error?.code ?? null },
  };

  if (sel.data) {
    const arte = await supabase
      .from("artes")
      .select("id, nome, arquivo, largura_px, altura_px, versao, status, tipo")
      .eq("id", sel.data.arte_id)
      .single();
    out.arte = { data: arte.data, error: arte.error?.message ?? null, code: arte.error?.code ?? null };
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
