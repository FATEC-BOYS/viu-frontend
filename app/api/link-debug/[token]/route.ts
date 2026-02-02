// app/api/link-debug/[token]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

export async function GET(_req: Request, ctx: any) {
  const p = ctx?.params;
  const { token } = p && typeof p.then === "function" ? await p : p || {};

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Supabase environment variables not configured" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  // sanity: inspeciona metadados da chave (sem vazar segredo)
  const meta = (() => {
    try {
      const payload = JSON.parse(
        Buffer.from(serviceKey.split(".")[1], "base64").toString("utf8")
      );
      return { ref: payload?.ref ?? null, role: payload?.role ?? null };
    } catch {
      return null;
    }
  })();

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();
  const sel = await supabase
    .from("link_compartilhado")
    .select("id, token, expira_em, somente_leitura, arte_id, projeto_id")
    .eq("token", token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle();

  const out: any = {
    keyMeta: meta, // { ref, role }
    link: { data: sel.data, error: sel.error?.message ?? null, code: sel.error?.code ?? null },
  };

  if (sel.data) {
    const arte = await supabase.from("artes")
      .select("id, nome, arquivo")
      .eq("id", sel.data.arte_id)
      .single();
    out.arte = { data: arte.data, error: arte.error?.message ?? null, code: arte.error?.code ?? null };
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
