// app/l/[token]/page.tsx
import 'server-only';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import FeedbackViewer from '../../../components/viewer/FeedbackViewer';
import FeedbackPanel from '../../../components/viewer/FeedbackPanel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: { token: string } };

export default async function PublicLinkPage({ params }: Props) {
  // ✅ Usa APENAS a ANON KEY (essas envs você já tem)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // 1) Resolve o link via RPC (bypass RLS controlado)
  const { data: link, error: linkErr } = await supabase
    .rpc('consume_short_link', { p_token: params.token });

  if (linkErr || !link) return notFound();

  // 2) Carrega a arte via RPC pública
  const { data: arte, error: arteErr } = await supabase
    .rpc('get_public_arte_by_id', { p_arte_id: link.arte_id });

  if (arteErr || !arte) return notFound();

  // 3) Se o campo arquivo for path do storage, gere URL pública
  let previewUrl = arte.arquivo ?? null;
  if (previewUrl && typeof previewUrl === 'string' && !previewUrl.startsWith('http')) {
    const { data } = await supabase.storage.from('uploads').getPublicUrl(previewUrl);
    previewUrl = data.publicUrl;
  }
  const arteForClient = { ...arte, arquivo: previewUrl };

  // 4) (Opcional) feedbacks públicos
  const { data: feedbacks, error: fbErr } = await supabase
    .rpc('get_public_feedbacks_by_arte', { p_arte_id: arte.id });
  // Se der erro, só segue sem feedbacks
  const initialFeedbacks = fbErr || !feedbacks ? [] : feedbacks;

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
              Clique na arte para marcar um ponto e deixar um comentário ✨
            </p>
          </div>
        </header>

        <FeedbackViewer
          arte={arteForClient}
          initialFeedbacks={initialFeedbacks}
          readOnly={readOnly}
          token={params.token}
        />
      </section>

      <FeedbackPanel
        arteId={arte.id}
        initialFeedbacks={initialFeedbacks}
        readOnly={readOnly}
        token={params.token}
      />
    </main>
  );
}
