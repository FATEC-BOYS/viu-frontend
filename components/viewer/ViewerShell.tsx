// components/viewer/ViewerShell.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, CheckCircle2, Users, MessageSquare, ShieldCheck } from 'lucide-react';
import ViewerIdentityGate from './ViewerIdentityGate';
import ApprovalBar from './approvals/ApprovalBar';
import VersionTimeline from './versions/VersionTimeline';

type Arte = {
  id: string;
  nome: string;
  arquivo: string; // url resolvida
  versao: number;
  status: string | null;
  tipo: string | null;
  largura_px?: number | null;
  altura_px?: number | null;
};

type Feedback = {
  id: string;
  conteudo: string;
  tipo: 'TEXTO' | 'AUDIO' | string;
  arquivo?: string | null;
  posicao_x?: number | null;
  posicao_y?: number | null;
  posicao_x_abs?: number | null;
  posicao_y_abs?: number | null;
  status?: string | null;
  criado_em: string;
  autor_id?: string | null;
  arte_versao_id?: string | null;
  autor_nome?: string | null;
  autor_email?: string | null;
};

type Versao = { id: string | null; numero: number; criado_em: string; status: string | null };

export default function ViewerShell({
  arte,
  initialFeedbacks,
  versoes,
  aprovacoesByVersao,
  readOnly,
  token,
  FeedbackViewer,
  FeedbackPanel,
}: {
  arte: Arte;
  initialFeedbacks: Feedback[];
  versoes: Versao[];
  aprovacoesByVersao: Record<string, any[]>;
  readOnly: boolean;
  token: string;
  FeedbackViewer: any;
  FeedbackPanel: any;
}) {
  // ===== 1) Identidade do visitante (obrigatória para comentar) =====
  const [visitor, setVisitor] = useState<{ email: string; nome?: string } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('viu.viewer.identity');
      if (raw) setVisitor(JSON.parse(raw));
    } catch {}
  }, []);
  const canComment = !readOnly && !!visitor;

  // ===== 2) Versão selecionada (timeline/chat por versão) =====
  const [activeVersao, setActiveVersao] = useState<string | 'all'>(() => {
    const last = versoes[versoes.length - 1];
    return last?.id || 'all';
  });

  const feedbacksByVersao = useMemo(() => {
    const map: Record<string, Feedback[]> = {};
    for (const f of initialFeedbacks) {
      const key = f.arte_versao_id ?? 'unknown';
      map[key] = map[key] || [];
      map[key].push(f);
    }
    return map;
  }, [initialFeedbacks]);

  // lista para a UI atual
  const feedbacksForUI =
    activeVersao === 'all'
      ? initialFeedbacks
      : initialFeedbacks.filter((f) => f.arte_versao_id === activeVersao);

  // ===== 3) Layout =====
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      {/* GATE: modal para capturar e-mail/nome antes de comentar */}
      <ViewerIdentityGate onConfirm={setVisitor} />

      {/* Coluna esquerda: header + viewer */}
      <section className="space-y-4">
        <header className="rounded-2xl overflow-hidden border bg-background">
          <div className="h-20 bg-[radial-gradient(ellipse_at_top_left,theme(colors.indigo.400),theme(colors.sky.400),theme(colors.emerald.400))]" />
          <div className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {arte.nome} <span className="text-muted-foreground">— v{arte.versao}</span>
              </h1>
              {arte.status && <Badge variant="secondary">{arte.status}</Badge>}
              {arte.tipo && <Badge variant="outline">{arte.tipo}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Clique na arte para marcar um ponto e deixar um comentário. <MessageSquare className="inline h-3.5 w-3.5 -mt-0.5" />{' '}
              Comentários são agrupados por versão.
            </p>
          </div>
        </header>

        {/* Viewer da arte */}
        <Card className="overflow-hidden">
          <FeedbackViewer
            arte={arte}
            initialFeedbacks={feedbacksForUI}
            readOnly={!canComment}
            token={token}
            // dica: seu componente já lida com criação; ele pode enviar
            // autor_nome / autor_email (se existirem) junto do payload
            // (implemente no lado que cria o feedback)
            visitor={visitor}
            activeVersaoId={activeVersao === 'all' ? null : activeVersao}
          />
        </Card>
      </section>

      {/* Coluna direita: versões, approvals e o painel/chat */}
      <aside className="space-y-4">
        {/* Linha do tempo de versões */}
        <VersionTimeline
          versoes={versoes}
          activeVersao={activeVersao}
          onChange={setActiveVersao}
          countsByVersao={Object.fromEntries(
            Object.entries(feedbacksByVersao).map(([k, arr]) => [k, arr.length])
          )}
        />

        {/* Barra de aprovação (ver/viu/aprovar) */}
        <ApprovalBar
          activeVersaoId={activeVersao === 'all' ? versoes.at(-1)?.id ?? null : (activeVersao as string | null)}
          aprovacoesByVersao={aprovacoesByVersao}
          disabled={!visitor}
        />

        <Separator />

        {/* Painel de feedback (chat) */}
        <Tabs defaultValue="lista">
          <TabsList className="w-full justify-between">
            <div className="flex gap-2">
              <TabsTrigger value="lista">Discussão</TabsTrigger>
              <TabsTrigger value="tudo">Todas as versões</TabsTrigger>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Somente quem se identificou pode comentar
            </div>
          </TabsList>

          <TabsContent value="lista" className="mt-3">
            <FeedbackPanel
              arteId={arte.id}
              initialFeedbacks={feedbacksForUI}
              readOnly={!canComment}
              token={token}
              visitor={visitor}
              activeVersaoId={activeVersao === 'all' ? null : activeVersao}
            />
          </TabsContent>

          <TabsContent value="tudo" className="mt-3">
            <FeedbackPanel
              arteId={arte.id}
              initialFeedbacks={initialFeedbacks}
              readOnly={!canComment}
              token={token}
              visitor={visitor}
              activeVersaoId={null}
            />
          </TabsContent>
        </Tabs>

        {!visitor && (
          <Alert className="mt-2">
            <AlertTitle>Identifique-se para comentar</AlertTitle>
            <AlertDescription>
              Para registrar seu feedback e receber retorno, precisamos do seu e-mail. Clique no topo da página para se identificar.
            </AlertDescription>
          </Alert>
        )}
      </aside>
    </main>
  );
}
