// app/viewer/arte/[id]/page.tsx
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";
import ViewerShell from "@/components/viewer/ViewerShell";
import FeedbackViewer from "@/components/viewer/FeedbackViewer";
import FeedbackPanel from "@/components/viewer/FeedbackPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export default async function ArteViewerPage({ params, searchParams }: Props) {
  // Next 15: params/searchParams são assíncronos
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? "";
  if (!token) return notFound();

  const supabase = getSupabaseServer();

  // 1) Valida link
  const { data: link } = await supabase
    .from("link_compartilhado")
    .select(
      "id, tipo, arte_id, expira_em, somente_leitura, can_comment, can_download"
    )
    .eq("token", token)
    .maybeSingle();

  if (!link) return notFound();
  if (link.tipo !== "ARTE" || link.arte_id !== id) return notFound();
  if (link.expira_em && new Date(link.expira_em) < new Date()) return notFound();

  // 2) Arte
  const { data: arte } = await supabase
    .from("artes")
    .select(
      "id, nome, arquivo, preview_path, largura_px, altura_px, versao, status, tipo, projeto_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (!arte) return notFound();

  // 3) Resolve preview URL (igual ao seu original)
  let previewUrl: string | null = null;
  if (arte.preview_path) {
    const key = arte.preview_path.replace(/^previews\//, "");
    const { data } = await supabase.storage.from("previews").getPublicUrl(key);
    previewUrl = data.publicUrl ?? null;
  } else if (
    arte.arquivo &&
    typeof arte.arquivo === "string" &&
    !arte.arquivo.startsWith("http")
  ) {
    const { data } = await supabase.storage
      .from("artes")
      .createSignedUrl(arte.arquivo, 60 * 60 * 6);
    previewUrl = data?.signedUrl ?? null;
  } else {
    previewUrl = (arte.arquivo as string) ?? null;
  }

  const arteForClient: {
    id: string;
    nome: string;
    arquivo: string;
    largura_px?: number | null;
    altura_px?: number | null;
    versao: number;
    status: string | null;
    tipo: string | null;
    projeto_id: string | null;
  } = { ...arte, arquivo: previewUrl ?? "" };

  // 4) Feedbacks
  const { data: feedbacks } = await supabase
    .from("feedbacks")
    .select(
      "id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id, arte_versao_id, autor_nome, autor_email"
    )
    .eq("arte_id", arte.id)
    .order("criado_em", { ascending: true });

  // 5) Versões
  const { data: versoesRaw } = await supabase
    .from("arte_versoes")
    .select("id, versao, criado_em, status")
    .eq("arte_id", arte.id)
    .order("versao", { ascending: true });

  const versoes =
    versoesRaw?.map((v) => ({
      id: v.id,
      numero: v.versao,
      criado_em: v.criado_em,
      status: v.status ?? null,
    })) ??
    [
      {
        id: null as any,
        numero: arte.versao,
        criado_em: new Date().toISOString(),
        status: arte.status ?? null,
      },
    ];

  // 6) Aprovações por versão (se existir)
  const versaoIds = versoes.filter((v) => v.id).map((v) => v.id as string);
  let aprovacoesByVersao: Record<string, any[]> = {};
  if (versaoIds.length > 0) {
    const { data: aprovRaw } = await supabase
      .from("aprovacoes")
      .select(
        "id, arte_versao_id, aprovador_id, status, comentario, criado_em"
      )
      .in("arte_versao_id", versaoIds);
    aprovacoesByVersao = (aprovRaw ?? []).reduce(
      (acc: Record<string, any[]>, a) => {
        const k = a.arte_versao_id;
        (acc[k] ||= []).push(a);
        return acc;
      },
      {}
    );
  }

  // 7) Flags do link
  const readOnly = Boolean(link.somente_leitura || !link.can_comment);

  // 8) Se não tiver preview, skeleton
  if (!arteForClient.arquivo) {
    return (
      <main className="mx-auto max-w-7xl p-4 md:p-8">
        <header className="rounded-2xl overflow-hidden border mb-4">
          <div className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 h-20" />
          <div className="p-4 bg-white">
            <h1 className="text-2xl font-semibold tracking-tight">
              {arte.nome}{" "}
              <span className="text-muted-foreground">— v{arte.versao}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preparando visualização…
            </p>
          </div>
        </header>
        <div className="rounded-2xl border overflow-hidden">
          <div className="aspect-video bg-muted animate-pulse" />
        </div>
      </main>
    );
  }

  // 9) Render
  return (
    <ViewerShell
      arte={arteForClient}
      initialFeedbacks={feedbacks ?? []}
      versoes={versoes}
      aprovacoesByVersao={aprovacoesByVersao}
      readOnly={readOnly}
      token={token}
    />
  );
}
