// app/l/[token]/page.tsx
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import FeedbackViewer from "../[token]/viewer/_components/FeedbackViewer";
import FeedbackPanel from "../[token]/viewer/_components/FeedbackPanel";

export const dynamic = "force-dynamic";

type Props = { params: { token: string } };

type SharedLink = {
  id: string;
  token: string;
  somente_leitura: boolean;
  expira_em: string | null;
  arte_id: string;
  projeto_id: string | null;
};

export default async function PublicLinkPage({ params }: Props) {
  const supabase = getSupabaseServer();

  // Lê via RPC (retorna 1 linha se token válido e não expirado)
  const { data: link, error: linkErr } = await supabase
    .rpc("get_link_by_token", { p_token: params.token })
    .single<SharedLink>();

  if (linkErr || !link) return notFound();

  const { data: arte, error: arteErr } = await supabase
    .from("artes")
    .select(
      "id, nome, largura_px, altura_px, versao, status, arquivo, tipo"
    )
    .eq("id", link.arte_id)
    .single();

  if (arteErr || !arte) return notFound();

  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select(
      "id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id"
    )
    .eq("arte_id", arte.id)
    .order("criado_em", { ascending: false });

  const readOnly = Boolean(link.somente_leitura);

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">
          {arte.nome} — v{arte.versao}
        </h1>

        {/* Cabeçalho didático */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: "Seja específico", s: "Aponte o que não funciona e por quê." },
            { t: "Explique o impacto", s: "O que isso afeta no resultado?" },
            { t: "Conecte ao objetivo", s: "Ex.: transmitir confiança, destacar benefício." },
            { t: "Abra espaço p/ solução", s: "Tem sugestão de ajuste?" },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-4 bg-yellow-100/70">
              <div className="font-semibold">{c.t}</div>
              <div className="text-sm text-muted-foreground">{c.s}</div>
            </div>
          ))}
        </div>

        <FeedbackViewer
          arte={arte}
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
