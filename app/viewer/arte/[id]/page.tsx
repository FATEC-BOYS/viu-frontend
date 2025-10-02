// app/viewer/arte/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import FeedbackViewer from '@/components/viewer/FeedbackViewer';
import FeedbackPanel from '@/components/viewer/FeedbackPanel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  params: { id: string };
  searchParams?: { token?: string };
};

export default async function ArteViewerPage({ params, searchParams }: Props) {
  const token = searchParams?.token || '';
  if (!token) return notFound();

  const supabase = getSupabaseServer();

  // 1) link
  const { data: link } = await supabase
    .from('link_compartilhado')
    .select('id, tipo, arte_id, expira_em, somente_leitura, can_comment, can_download')
    .eq('token', token)
    .maybeSingle();

  if (!link) return notFound();
  if (link.expira_em && new Date(link.expira_em) < new Date()) return notFound();
  if (link.tipo !== 'ARTE' || link.arte_id !== params.id) return notFound();

  // 2) arte
  const { data: arte } = await supabase
    .from('artes')
    .select('id, nome, arquivo, largura_px, altura_px, versao, status, tipo')
    .eq('id', params.id)
    .maybeSingle();

  if (!arte) return notFound();

  // 3) URL pública se for path
  let previewUrl = arte.arquivo ?? null;
  if (previewUrl && typeof previewUrl === 'string' && !previewUrl.startsWith('http')) {
    const { data } = await supabase.storage.from('uploads').getPublicUrl(previewUrl);
    previewUrl = data.publicUrl;
  }
  const arteForClient = { ...arte, arquivo: previewUrl };

  // 4) feedbacks
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id, arte_versao_id')
    .eq('arte_id', arte.id)
    .order('criado_em', { ascending: false });

  const initialFeedbacks = feedbacks ?? [];

  // ⚠️ Se can_comment for false, trava a UI de comentário mesmo que somente_leitura seja false
  const readOnly = !!(link.somente_leitura || !link.can_comment);

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
              Clique na arte para marcar um ponto e deixar um comentário ✨
            </p>
          </div>
        </header>

        <FeedbackViewer
          arte={arteForClient}
          initialFeedbacks={initialFeedbacks}
          readOnly={readOnly}
          token={token}
        />
      </section>

      <FeedbackPanel
        arteId={arte.id}
        initialFeedbacks={initialFeedbacks}
        readOnly={readOnly}
        token={token}
      />
    </main>
  );
}
