// app/api/link-debug/[token]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const supabase = getSupabaseServer();
  const nowIso = new Date().toISOString();

  const sel = await supabase
    .from("link_compartilhado")
    .select("id, token, somente_leitura, expira_em, arte_id, projeto_id")
    .eq("token", params.token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle();

  const out: any = { env: {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }, link: sel };

  if (sel.data) {
    const arte = await supabase
      .from("artes")
      .select("id, nome, arquivo")
      .eq("id", sel.data.arte_id)
      .single();
    out.arte = arte;
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
