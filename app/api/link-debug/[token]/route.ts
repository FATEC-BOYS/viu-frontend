export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

export async function GET(_req: Request, ctx: any) {
  const p = ctx?.params;
  const { token } = p && typeof p.then === "function" ? await p : p || {};
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server role
    { auth: { persistSession: false } }
  );

  const out: any = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    token,
  };

  const nowIso = new Date().toISOString();
  const sel = await supabase
    .from("link_compartilhado")
    .select("id, token, somente_leitura, expira_em, arte_id, projeto_id")
    .eq("token", token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle();
  out.link = { data: sel.data, error: sel.error?.message ?? null, code: sel.error?.code ?? null };

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
