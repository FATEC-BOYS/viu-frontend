// app/viewer/arte/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';
import FeedbackViewer from '@/components/viewer/FeedbackViewer';
import FeedbackPanel from '@/components/viewer/FeedbackPanel';
import ViewerShell from '@/components/viewer/ViewerShell';

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

  // 1) Valida link compartilhado
  const { data: link } = await supabase
    .from('link_compartilhado')
    .select('id, tipo, arte_id, expira_em, somente_leitura, can_comment, can_download')
    .eq('token', token)
    .maybeSingle();

  if (!link) return notFound();
  if (link.expira_em && new Date(link.expira_em) < new Date()) return notFound();
  if (link.tipo !== 'ARTE' || link.arte_id !== params.id) return notFound();

  // 2) Arte
  const { data: arte } = await supabase
    .from('artes')
    .select('id, nome, arquivo, preview_path, largura_px, altura_px, versao, status, tipo, projeto_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!arte) return notFound();

  // 3) URL de preview
  let previewUrl: string | null = null;
  if (arte.preview_path) {
    const key = arte.preview_path.replace(/^previews\//, '');
    const { data } = await supabase.storage.from('previews').getPublicUrl(key);
    previewUrl = data.publicUrl ?? null;
  } else if (arte.arquivo && typeof arte.arquivo === 'string' && !arte.arquivo.startsWith('http')) {
    const { data } = await supabase.storage.from('artes').createSignedUrl(arte.arquivo, 60 * 60 * 6);
    previewUrl = data?.signedUrl ?? null;
  } else {
    previewUrl = (arte.arquivo as string) ?? null;
  }
  const arteForClient = { ...arte, arquivo: previewUrl ?? '' };

  // 4) Feedbacks (todas as versões; o painel filtra por versão)
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('id, conteudo, tipo, arquivo, posicao_x, posicao_y, posicao_x_abs, posicao_y_abs, status, criado_em, autor_id, arte_versao_id, autor_nome, autor_email')
    .eq('arte_id', arte.id)
    .order('criado_em', { ascending: true }); // cronológico

  // 5) Versões desta arte (se não tiver tabela, cai em fallback com apenas a atual)
  const { data: versoesRaw } = await supabase
    .from('arte_versoes')
    .select('id, numero, criado_em, status')
    .eq('arte_id', arte.id)
    .order('numero', { ascending: true });

  const versoes =
    versoesRaw?.map(v => ({
      id: v.id,
      numero: v.numero,
      criado_em: v.criado_em,
      status: v.status ?? null,
    })) ??
    [
      { id: null as any, numero: arte.versao, criado_em: new Date().toISOString(), status: arte.status ?? null },
    ];

  // 6) Aprovações por versão (opcional, se não existir a tabela a UI lida)
  // modelo esperado: aprovacoes (id, arte_versao_id, aprovador_email, aprovador_nome, visto_em, aprovado_em)
  const { data: aprovRaw } = await supabase
    .from('aprovacoes')
    .select('id, arte_versao_id, aprovador_email, aprovador_nome, visto_em, aprovado_em')
    .in('arte_versao_id', versoes.filter(v => v.id).map(v => v.id as string));

  const aprovacoesByVersao = (aprovRaw ?? []).reduce((acc: Record<string, any[]>, a) => {
    const k = a.arte_versao_id;
    acc[k] = acc[k] || [];
    acc[k].push(a);
    return acc;
  }, {});

  const readOnly = !!(link.somente_leitura || !link.can_comment);

  return (
    <ViewerShell
      arte={arteForClient}
      initialFeedbacks={feedbacks ?? []}
      versoes={versoes}
      aprovacoesByVersao={aprovacoesByVersao}
      readOnly={readOnly}
      token={token}
      FeedbackViewer={FeedbackViewer}
      FeedbackPanel={FeedbackPanel}
    />
  );
}
