// app/l/[token]/page.tsx
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import FeedbackViewer from "./viewer/_components/FeedbackViewer";
import FeedbackPanel from "./viewer/_components/FeedbackPanel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // <- importante no Vercel

type Props = { params: { token: string } };
type SharedLink = {
  id: string; token: string; somente_leitura: boolean;
  expira_em: string | null; arte_id: string; projeto_id: string | null;
};

export default async function PublicLinkPage({ params }: Props) {
  const { token } = params;
  const supabase = getSupabaseServer();

  // usa SÓ SELECT (evita diferenças da RPC em prod)
  const nowIso = new Date().toISOString();
  const { data: link, error: linkErr } = await supabase
    .from("link_compartilhado")
    .select("id, token, somente_leitura, expira_em, arte_id, projeto_id")
    .eq("token", token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle<SharedLink>();
  if (linkErr || !link) return notFound();

  const { data: arte, error: arteErr } = await supabase
    .from("artes")
    .select("id, nome, largura_px, altura_px, versao, status, arquivo, tipo")
    .eq("id", link.arte_id)
    .single();
  if (arteErr || !arte) return notFound();

  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select("id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id")
    .eq("arte_id", arte.id)
    .order("criado_em", { ascending: false });

  const readOnly = !!link.somente_leitura;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">{arte.nome} — v{arte.versao}</h1>
        <FeedbackViewer arte={arte} initialFeedbacks={feedbacks || []} readOnly={readOnly} token={token} />
      </section>
      <FeedbackPanel arteId={arte.id} initialFeedbacks={feedbacks || []} readOnly={readOnly} token={token} />
    </main>
  );
}
