// app/l/[token]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import FeedbackViewer from "./viewer/_components/FeedbackViewer";
import FeedbackPanel from "./viewer/_components/FeedbackPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: { token: string } };
type SharedLink = {
  id: string; token: string; somente_leitura: boolean;
  expira_em: string | null; arte_id: string; projeto_id: string | null;
};

export default async function PublicLinkPage({ params }: Props) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const nowIso = new Date().toISOString();
  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, token, somente_leitura, expira_em, arte_id, projeto_id")
    .eq("token", params.token)
    .or(`expira_em.is.null,expira_em.gt.${nowIso}`)
    .maybeSingle<SharedLink>();
  if (!link) return notFound();

  const { data: arte } = await supabase
    .from("artes")
    .select("id, nome, largura_px, altura_px, versao, status, arquivo, tipo")
    .eq("id", link.arte_id)
    .single();
  if (!arte) return notFound();

  // Se arte.arquivo for PATH do Storage, gere a URL aqui.
  // Se já for uma URL pública, deixamos como está.
  let previewUrl = arte.arquivo ?? null;
  if (previewUrl && !previewUrl.startsWith("http")) {
    const { data } = await supabase.storage.from("uploads").getPublicUrl(previewUrl);
    previewUrl = data.publicUrl;
  }
  const arteForClient = { ...arte, arquivo: previewUrl };

  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select("id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id")
    .eq("arte_id", arte.id)
    .order("criado_em", { ascending: false });

  const readOnly = !!link.somente_leitura;

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <section className="space-y-4">
        <header className="rounded-2xl overflow-hidden border">
          <div className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-20" />
          <div className="p-4 bg-white">
            <h1 className="text-2xl font-semibold tracking-tight">
              {arte.nome} <span className="text-muted-foreground">— v{arte.versao}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clique na arte para marcar um ponto e deixar um comentário elegante ✨
            </p>
          </div>
        </header>

        <FeedbackViewer
          arte={arteForClient}
          initialFeedbacks={feedbacks || []}
          readOnly={readOnly}
          token={params.token}
        />
      </section>

      <FeedbackPanel
        arteId={arte.id}
        initialFeedbacks={feedbacks || []}
        readOnly={readOnly}
        token={params.token}
      />
    </main>
  );
}
