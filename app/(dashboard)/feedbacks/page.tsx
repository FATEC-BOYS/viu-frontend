'use client';

import Thumb from "@/components/layout/Thumb";
import EmptyState from "@/components/layout/EmptyState";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  MessageSquare, Search, Mic, Check, RotateCcw, Eye, Download, PlusCircle,
} from 'lucide-react';

/* =========================
   Tipos
   ========================= */
/*
 * `tipo` é uma coluna String, não um enum do banco, e o backend grava três
 * valores nela: TEXTO, AUDIO e POSICIONAL. POSICIONAL mistura duas coisas que
 * não são a mesma — o meio (texto ou áudio) e o fato de o comentário ter um
 * ponto na arte, que já está em posicaoX/posicaoY. O union daqui dizia só
 * 'TEXTO' | 'AUDIO', então POSICIONAL vazava cru: o selo escrevia "POSICIONAL"
 * em caixa alta e, pior, `tipo === 'AUDIO'` dava falso — um áudio gravado em
 * cima da arte nunca ganhava player. O cliente falou e ninguém conseguia ouvir.
 */
type FeedbackTipo = 'TEXTO' | 'AUDIO' | 'POSICIONAL';
type AutorTipo = 'CLIENTE' | 'DESIGNER';
// O schema não tem coluna de status: uma thread está aberta ou resolvida,
// conforme resolvidoEm. Estados intermediários não existem no banco.
type FeedbackStatus = 'ABERTO' | 'RESOLVIDO';

type RowBase = {
  id: string;
  conteudo: string;
  status: FeedbackStatus;
  tipo: FeedbackTipo;
  arquivo: string | null;
  criado_em: string;
  arte_id: string;
  arte_nome: string;
  arte_status_atual?: string | null;
  arte_preview_path?: string | null;
  projeto_id: string;
  projeto_nome: string;
  cliente_id: string;
  cliente_nome: string;
  autor_id: string;
  autor_nome: string;
  autor_tipo: AutorTipo;
  posicao_x?: number | null;
  posicao_y?: number | null;
};

type FeedbackRow = RowBase & {
  audio_signed_url?: string | null;
  preview_signed_url?: string | null;
};

type FilterTipo = 'todos' | FeedbackTipo;
type FilterAutor = 'todos' | AutorTipo;
type FilterStatus = 'todos' | FeedbackStatus;

/* =========================
   UI helpers
   ========================= */
const LOADER_LINES = ['Afiando os lápis…','Abrindo pastas…','Buscando inspirações…','Alinhando pixels…'] as const;

/**
 * Um feedback é de áudio quando tem áudio — e não quando o rótulo diz AUDIO.
 * `arquivo` só é preenchido pelo caminho de upload de voz, então ele responde
 * certo para as três variantes de `tipo`, inclusive as linhas antigas.
 */
function ehAudio(fb: Pick<FeedbackRow, 'arquivo' | 'audio_signed_url'>) {
  return !!(fb.audio_signed_url || fb.arquivo);
}

function formatDateTime(s: string) { return new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }

/* =========================
   API mapper
   ========================= */
function mapFeedback(fb: any): FeedbackRow {
  return {
    id: fb.id,
    conteudo: fb.conteudo,
    status: (fb.resolvidoEm ?? fb.resolvido_em) ? 'RESOLVIDO' : 'ABERTO',
    tipo: fb.tipo,
    arquivo: fb.arquivo ?? null,
    criado_em: fb.criadoEm ?? fb.criado_em ?? '',
    posicao_x: fb.posicaoX ?? null,
    posicao_y: fb.posicaoY ?? null,
    arte_id: fb.arte?.id ?? '',
    arte_nome: fb.arte?.nome ?? '',
    arte_status_atual: fb.arte?.status ?? null,
    arte_preview_path: fb.arte?.arquivo ?? null,
    projeto_id: fb.arte?.projeto?.id ?? '',
    projeto_nome: fb.arte?.projeto?.nome ?? '',
    cliente_id: fb.arte?.projeto?.cliente?.id ?? '',
    cliente_nome: fb.arte?.projeto?.cliente?.nome ?? '',
    autor_id: fb.autor?.id ?? '',
    autor_nome: fb.autor?.nome ?? '',
    autor_tipo: (fb.autor?.tipo ?? 'CLIENTE') as AutorTipo,
    audio_signed_url: fb.arquivo_url ?? null,
    preview_signed_url: fb.arte_preview_url ?? null,
  };
}

/* =========================
   List item
   ========================= */
function ListItem({
  fb, selected, onOpen, onVerNaArte, onAlternarResolvido, onCriarTarefa,
}: {
  fb: FeedbackRow; selected?: boolean;
  onOpen: (id: string) => void;
  onVerNaArte: (f: FeedbackRow) => void;
  onAlternarResolvido: (f: FeedbackRow) => void;
  onCriarTarefa: (f: FeedbackRow) => void;
}) {
  const hasPos = fb.posicao_x != null && fb.posicao_y != null;
  const isResolved = fb.status === 'RESOLVIDO';
  const audio = ehAudio(fb);

  return (
    /*
     * O comentário do cliente é o produto desta tela, e era o menor elemento
     * dela: vinha depois do breadcrumb, do selo de estado, do chip de tipo, e
     * antes da data, do autor e de "posicionado" — oito pedaços de metadado
     * ao redor de uma frase. Aqui a frase vem primeiro e grande; o resto é
     * uma linha de apoio.
     */
    <div
      className={`group relative flex flex-wrap items-start gap-3 rounded-lg border p-3 card-interativo ${selected ? 'ring-2 ring-primary' : ''} ${isResolved ? 'opacity-70' : ''}`}
      role="button"
      onClick={() => onOpen(fb.id)}
    >
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
        <Thumb src={fb.preview_signed_url} alt={fb.arte_nome} sizes="80px" iconClassName="h-4 w-4" />
        {hasPos && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${fb.posicao_x}%`, top: `${fb.posicao_y}%` }}
          >
            {/* O pino já diz que o comentário tem lugar na arte — a palavra
                "posicionado" na linha de apoio dizia a mesma coisa de novo. */}
            <span className="inline-block h-3 w-3 rounded-full bg-primary ring-2 ring-white shadow" />
          </div>
        )}
      </div>

      {/*
        O selo e os três botões ficavam numa coluna `shrink-0` de ~130px que no
        celular não tinha para onde ir: sobravam 90px para o comentário, que
        quebrava em cinco linhas, e a linha de apoio virava "João Santos ·…".
        Com `flex-wrap` e uma largura mínima no texto, esse bloco desce inteiro
        para a linha de baixo quando não cabe — e continua à direita no desktop.
      */}
      <div className="min-w-[180px] flex-1">
        <p className={`text-sm leading-snug ${isResolved ? 'text-muted-foreground line-through decoration-1' : 'font-medium'}`}>
          {audio && (
            <Mic aria-hidden className="mr-1.5 inline size-3.5 -translate-y-[1px] text-primary" />
          )}
          {fb.conteudo || <em className="font-normal text-muted-foreground">Áudio sem transcrição</em>}
        </p>

        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {fb.autor_nome} · {fb.arte_nome} · {new Date(fb.criado_em).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {!isResolved && (
          <span className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
            Aguardando resposta
          </span>
        )}
        {/*
          O botao do meio era um "Responder" que so chamava setSelectedId — o
          mesmo que clicar na linha. Resolver, a acao que de fato tira o item
          da fila, so existia dentro da aba Quadro, atras de um <select> que
          mostrava "ABERTO" em caixa alta. Trocamos um pelo outro.
        */}
        <div className="flex gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); onVerNaArte(fb); }} title="Ver na arte">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => { e.stopPropagation(); onAlternarResolvido(fb); }}
            title={isResolved ? 'Reabrir' : 'Marcar como resolvido'}
          >
            {isResolved ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => { e.stopPropagation(); onCriarTarefa(fb); }} title="Criar tarefa">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Detail (com thread)
   ========================= */
function AudioInline({ src }: { src: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
      <audio controls className="w-full"><source src={src} />Seu navegador não suporta áudio embutido.</audio>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(src, '_blank')}><Download className="h-4 w-4" /></Button>
    </div>
  );
}

function FeedbackDetail({
  fb, onVerNaArte, onAlternarResolvido, onCriarTarefa,
}: {
  fb: FeedbackRow;
  onVerNaArte: (f: FeedbackRow) => void;
  onAlternarResolvido: (f: FeedbackRow) => void;
  onCriarTarefa: (f: FeedbackRow) => void;
}) {
  const isResolved = fb.status === 'RESOLVIDO';
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<
    { id: string; conteudo: string; criado_em: string; autor: { id: string; nome: string | null } }[]
  >([]);
  const [loadingThread, setLoadingThread] = useState(false);

  async function loadThread() {
    try {
      setLoadingThread(true);
      const res = await fetch(`/api/feedbacks/${encodeURIComponent(fb.id)}/respostas`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Falha ao carregar respostas');
      const data = await res.json();
      setThread(data);
    } catch (e) {
      console.error('[FeedbackDetail] loadThread error', e);
      setThread([]);
    } finally {
      setLoadingThread(false);
    }
  }

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fb.id]);

  async function sendReply() {
    if (!reply.trim()) return;
    try {
      setSending(true);
      const res = await fetch(`/api/feedbacks/${encodeURIComponent(fb.id)}/respostas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ conteudo: reply.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Falha ao enviar resposta');
      setThread((prev) => [...prev, j.resposta]);
      setReply('');
      toast.success('Resposta enviada!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar resposta.');
    } finally {
      setSending(false);
    }
  }

  /*
   * O painel repetia a lista inteira: chip de tipo, selo de estado, nome da
   * arte, projeto, cliente e data no cabeçalho — e só então o comentário, numa
   * caixa cinza igual à das respostas. Quem já tinha lido o item na esquerda
   * lia tudo de novo antes de chegar ao que importa.
   *
   * Aqui o cabeçalho diz só onde estamos (arte, e abaixo projeto · cliente), o
   * comentário original ganha a barra da cor do pino — a mesma que marca o
   * ponto na miniatura — e as respostas ficam em caixas neutras. A diferença
   * visual entre "o que o cliente disse" e "o que respondemos" passa a ser a
   * primeira coisa que se enxerga.
   */
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fb.arte_nome}</p>
            {/* O projeto já é o caminho de volta — não precisa de um botão
                "Abrir projeto" repetindo-o lá embaixo, numa quarta linha de
                ações que quebrava sozinha. */}
            <p className="truncate text-xs text-muted-foreground">
              <Link href={`/projetos/${fb.projeto_id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                {fb.projeto_nome}
              </Link>
              {' · '}{fb.cliente_nome}
            </p>
          </div>
          {isResolved && (
            <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
              Resolvido
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {fb.preview_signed_url && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border">
            <Thumb src={fb.preview_signed_url} alt={fb.arte_nome} sizes="(max-width: 1024px) 100vw, 420px" iconClassName="h-8 w-8" />
          </div>
        )}

        <div className="border-l-2 border-primary pl-3">
          <p className="text-xs text-muted-foreground">
            {fb.autor_nome} · {formatDateTime(fb.criado_em)}
          </p>
          {fb.conteudo && (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{fb.conteudo}</p>
          )}
          {ehAudio(fb) && (
            <div className="mt-2">
              <AudioInline src={fb.audio_signed_url || fb.arquivo!} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onAlternarResolvido(fb)}>
            {isResolved
              ? (<><RotateCcw className="mr-1.5 h-4 w-4" /> Reabrir</>)
              : (<><Check className="mr-1.5 h-4 w-4" /> Resolver</>)}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onVerNaArte(fb)}><Eye className="mr-1.5 h-4 w-4" /> Ver na arte</Button>
          <Button variant="ghost" size="sm" onClick={() => onCriarTarefa(fb)}><PlusCircle className="mr-1.5 h-4 w-4" /> Criar tarefa</Button>
        </div>

        {/* Respostas — o título só aparece quando há o que titular. */}
        {loadingThread ? (
          <p className="text-xs text-muted-foreground">Carregando respostas…</p>
        ) : thread.length > 0 ? (
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
              {thread.length === 1 ? '1 resposta' : `${thread.length} respostas`}
            </p>
            {thread.map((r) => (
              <div key={r.id} className="rounded-md border p-2.5">
                <p className="text-[11px] text-muted-foreground">
                  {r.autor?.nome ?? 'Usuário'} · {formatDateTime(r.criado_em)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{r.conteudo}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Composer: o placeholder já diz o que o campo faz — o rótulo
            "Responder" acima dele era a terceira vez que a palavra aparecia. */}
        <div className="space-y-2">
          <textarea
            className="min-h-[90px] w-full resize-y rounded-md border bg-background p-2.5 text-sm"
            placeholder={`Responder para ${fb.autor_nome}…`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendReply();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">Ctrl/Cmd + Enter envia</p>
            <div className="flex shrink-0 items-center gap-1">
              {/* "Limpar" era um botão outline do mesmo tamanho do "Enviar":
                  dois pesos iguais, e o destrutivo vinha primeiro. Agora só
                  existe quando há algo escrito, e sem contorno. */}
              {reply.trim().length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setReply('')} disabled={sending}>Limpar</Button>
              )}
              <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>{sending ? 'Enviando…' : 'Enviar'}</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================
   Board & Timeline
   ========================= */
function FeedbackBoardView({ items, onOpen, onMove }: { items: FeedbackRow[]; onOpen: (id: string)=>void; onMove: (id: string, to: FeedbackStatus)=>void; }) {
  const cols: { key: FeedbackStatus; title: string }[] = [
    { key: 'ABERTO', title: 'Aberto' }, { key: 'RESOLVIDO', title: 'Resolvido' },
  ];
  const grouped = useMemo(() => {
    const m: Record<FeedbackStatus, FeedbackRow[]> = { ABERTO:[], RESOLVIDO:[] };
    items.forEach(i => m[i.status].push(i)); return m;
  }, [items]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cols.map(c => (
        <div key={c.key} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">{c.title}</h4><Badge variant="secondary">{grouped[c.key].length}</Badge></div>
          <div className="space-y-2">
            {grouped[c.key].map(fb => (
              /*
                Cada cartão trazia um <select> de estado que, fechado, escrevia
                "ABERTO" em caixa alta — repetindo o nome da coluna em que o
                próprio cartão estava. Com duas colunas só existe um destino
                possível, então o destino vira um botão que o diz.
              */
              <div key={fb.id} className="group rounded-md border bg-card p-2.5 text-sm card-interativo" role="button" onClick={() => onOpen(fb.id)}>
                <p className="line-clamp-2 leading-snug">
                  {ehAudio(fb) && <Mic aria-hidden className="mr-1.5 inline size-3.5 -translate-y-[1px] text-primary" />}
                  {fb.conteudo || fb.arte_nome}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-muted-foreground">{fb.autor_nome} · {fb.projeto_nome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs opacity-70 transition-opacity group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onMove(fb.id, c.key === 'ABERTO' ? 'RESOLVIDO' : 'ABERTO'); }}
                  >
                    {c.key === 'ABERTO'
                      ? (<><Check className="mr-1 h-3.5 w-3.5" /> Resolver</>)
                      : (<><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reabrir</>)}
                  </Button>
                </div>
              </div>
            ))}
            {grouped[c.key].length === 0 && (<div className="p-2 text-center text-xs text-muted-foreground">Nada aqui</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
function FeedbackTimelineView({ items, onOpen }: { items: FeedbackRow[]; onOpen: (id: string)=>void }) {
  const groups = useMemo(() => {
    const map = new Map<string, FeedbackRow[]>();
    items.forEach(i => { const key = new Date(i.criado_em).toLocaleDateString('pt-BR'); map.set(key, [...(map.get(key) || []), i]); });
    return Array.from(map.entries()).sort(([a],[b]) => a.split('/').reverse().join('-') < b.split('/').reverse().join('-') ? 1 : -1);
  }, [items]);
  return (
    <div className="space-y-6">
      {groups.map(([day, arr]) => (
        <div key={day}>
          <div className="mb-2 text-sm font-semibold">{day}</div>
          <div className="space-y-2">
            {arr.map(fb => (
              <div key={fb.id} className="cursor-pointer rounded-md border p-3 card-interativo" onClick={() => onOpen(fb.id)}>
                <p className="text-sm leading-snug">
                  {ehAudio(fb) && <Mic aria-hidden className="mr-1.5 inline size-3.5 -translate-y-[1px] text-primary" />}
                  {fb.conteudo || <em className="text-muted-foreground">Áudio sem transcrição</em>}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {fb.autor_nome} · {fb.arte_nome} · {formatTime(fb.criado_em)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {groups.length === 0 && (<Card className="p-12 text-center text-sm text-muted-foreground">Nada por aqui…</Card>)}
    </div>
  );
}

/* =========================
   Página
   ========================= */
export default function FeedbacksPage() {
  const PAGE_SIZE = 24;

  // data/ui
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [loaderLine, setLoaderLine] = useState<(typeof LOADER_LINES)[number]>(LOADER_LINES[0]);

  const [mode, setMode] = useState<'cards' | 'board' | 'timeline'>('cards');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('todos');
  const [tipoFilter, setTipoFilter] = useState<FilterTipo>('todos');
  const [autorFilter, setAutorFilter] = useState<FilterAutor>('todos');
  const [projetoFilter, setProjetoFilter] = useState<'todos' | string>('todos');
  const [sortBy, setSortBy] = useState<'criado_em' | 'arte' | 'projeto' | 'autor'>('criado_em');

  // debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const h = setTimeout(() => setDebouncedSearch(searchTerm), 300); return () => clearTimeout(h); }, [searchTerm]);

  // loader frases
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLoaderLine((prev) => LOADER_LINES[(LOADER_LINES.indexOf(prev as any) + 1) % LOADER_LINES.length]), 1600);
    return () => clearInterval(id);
  }, [loading]);

  // projetos distintos (para filtro)
  const projetos = useMemo(() => Array.from(new Set(rows.map(r => r.projeto_nome))).sort(), [rows]);

  const { user } = useAuth();

  /* ----------- FETCH via REST API ----------- */
  async function fetchPage(offset: number): Promise<FeedbackRow[]> {
    const page = Math.floor(offset / PAGE_SIZE) + 1;
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    qs.set('limit', String(PAGE_SIZE));
    if (statusFilter !== 'todos') qs.set('status', statusFilter);
    /*
     * O filtro de tipo era server-side e mandava `tipo=AUDIO` cru. Um áudio
     * gravado em cima da arte fica gravado como POSICIONAL, então não casava
     * nem com "Só áudio" nem com "Só texto": sumia dos dois. Aqui ele passa a
     * ser aplicado no cliente por `ehAudio`, que olha o arquivo e acerta nas
     * três variantes — do mesmo jeito que os filtros de autor e projeto, que
     * já eram client-side.
     */
    if (debouncedSearch.trim()) qs.set('search', debouncedSearch.trim());
    const res = await api.get<{ data: any[] }>(`/feedbacks?${qs}`);
    return (res.data ?? []).map(mapFeedback);
  }

  // primeira carga / quando filtros server-side mudam
  useEffect(() => {
    if (!user) {
      setError('Faça login para ver os feedbacks.');
      setRows([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorDetails(null);
        const page = await fetchPage(0);
        setRows(page);
        setHasMore(page.length === PAGE_SIZE);
        setSelectedId(page[0]?.id ?? null);
      } catch (e: any) {
        const msg = e?.message || JSON.stringify(e) || 'Erro desconhecido';
        setError('Não foi possível carregar os feedbacks.');
        setErrorDetails(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, debouncedSearch]);

  // carregar mais
  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const page = await fetchPage(rows.length);
      setRows(prev => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e: any) {
      toast.error('Falha ao carregar mais feedbacks. ' + (e?.message || ''));
    } finally {
      setLoadingMore(false);
    }
  };

  /* ----------- filtros client-side ----------- */
  const filteredOrdered = useMemo(() => {
    let arr = [...rows];
    if (searchTerm) {
      const st = searchTerm.toLowerCase();
      arr = arr.filter((f) =>
        (f.conteudo ?? '').toLowerCase().includes(st) ||
        f.arte_nome.toLowerCase().includes(st) ||
        f.projeto_nome.toLowerCase().includes(st) ||
        f.autor_nome.toLowerCase().includes(st),
      );
    }
    if (tipoFilter !== 'todos') arr = arr.filter((f) => (tipoFilter === 'AUDIO' ? ehAudio(f) : !ehAudio(f)));
    if (autorFilter !== 'todos') arr = arr.filter((f) => f.autor_tipo === autorFilter);
    if (projetoFilter !== 'todos') arr = arr.filter((f) => f.projeto_nome === projetoFilter);
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'criado_em': return +new Date(b.criado_em) - +new Date(a.criado_em);
        case 'arte':      return a.arte_nome.localeCompare(b.arte_nome);
        case 'projeto':   return a.projeto_nome.localeCompare(b.projeto_nome);
        case 'autor':     return a.autor_nome.localeCompare(b.autor_nome);
        default:          return 0;
      }
    });
    return arr;
  }, [rows, searchTerm, tipoFilter, autorFilter, projetoFilter, sortBy]);

  /* ----------- ações ----------- */
  const handleVerNaArte = (fb: FeedbackRow) => {
    const url = (fb.posicao_x != null && fb.posicao_y != null)
      ? `/artes/${fb.arte_id}?x=${Math.round(fb.posicao_x!)}&y=${Math.round(fb.posicao_y!)}`
      : `/artes/${fb.arte_id}`;
    window.open(url, '_blank');
  };
  /*
   * Resolver e reabrir são a mesma transição em sentidos opostos, e viviam
   * escritas só dentro do <select> da aba Quadro. Aqui viram uma função só,
   * compartilhada pela lista, pelo painel de detalhe e pelo quadro — com o
   * mesmo desfazer otimista nos três.
   */
  const moverPara = async (fbId: string, to: FeedbackStatus) => {
    const anterior = rows.find((r) => r.id === fbId)?.status;
    if (!anterior || anterior === to) return;
    setRows((prev) => prev.map((x) => (x.id === fbId ? { ...x, status: to } : x)));
    try {
      await api.put(`/feedbacks/${fbId}/${to === 'RESOLVIDO' ? 'resolver' : 'reabrir'}`, {});
      toast.success(to === 'RESOLVIDO' ? 'Feedback resolvido.' : 'Feedback reaberto.');
    } catch (e: any) {
      setRows((prev) => prev.map((x) => (x.id === fbId ? { ...x, status: anterior } : x)));
      toast.error(
        (to === 'RESOLVIDO' ? 'Não consegui resolver. ' : 'Não consegui reabrir. ') + (e?.message ?? ''),
      );
    }
  };
  const handleAlternarResolvido = (fb: FeedbackRow) =>
    moverPara(fb.id, fb.status === 'RESOLVIDO' ? 'ABERTO' : 'RESOLVIDO');
  const handleCriarTarefa = async (fb: FeedbackRow) => {
    try {
      if (!user) { toast.error('Você precisa estar autenticado.'); return; }
      const titulo = `Ajuste: ${fb.conteudo?.slice(0, 60) || fb.arte_nome}`;
      const descricao = `Criada a partir do feedback ${fb.id} — Arte: ${fb.arte_nome} — Projeto: ${fb.projeto_nome}`;
      await api.post('/tarefas', {
        titulo,
        descricao,
        projetoId: fb.projeto_id,
        prioridade: 'MEDIA',
        responsavelId: user.id,
      });
      toast.success('Tarefa criada a partir do feedback!');
    } catch (e: any) {
      toast.error('Falha ao criar tarefa. ' + (e?.message || ''));
    }
  };

  /* ----------- render ----------- */
  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        <p className="text-sm text-muted-foreground">{loaderLine}</p>
        <div className="mt-6 grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-md border bg-muted/30" />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <p className="mb-2 text-lg font-medium">Deu ruim por aqui.</p>
        <p className="mb-2 text-muted-foreground">Tenta recarregar? (se persistir, me chama).</p>
        {errorDetails && <p className="max-w-xl text-xs text-muted-foreground">Detalhes: {errorDetails}</p>}
        <div className="mt-4"><Button onClick={() => location.reload()}>Recarregar</Button></div>
      </div>
    );
  }

  const empty = filteredOrdered.length === 0;
  const temFiltroFeedback =
    !!searchTerm || statusFilter !== 'todos' || tipoFilter !== 'todos' ||
    autorFilter !== 'todos' || projetoFilter !== 'todos';
  const limparFiltrosFeedback = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setTipoFilter('todos');
    setAutorFilter('todos');
    setProjetoFilter('todos');
  };
  const selected = selectedId ? filteredOrdered.find(f => f.id === selectedId) || rows.find(f => f.id === selectedId) : null;

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Feedbacks ✦</h1>
        </div>
        {/*
          "Cards / Board / Timeline" num produto em português, e um botão
          "Preferências" sem onClick — clicar nele nunca fez nada. Os nomes
          agora dizem o formato ("Por dia" é literalmente o que a terceira aba
          faz: agrupa por data), e o botão morto saiu.
        */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList>
            <TabsTrigger value="cards">Lista</TabsTrigger>
            <TabsTrigger value="board">Quadro</TabsTrigger>
            <TabsTrigger value="timeline">Por dia</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/*
        Cinco seletores lado a lado, e três deles fechados escreviam só "Todos",
        "Todos" e "Todos Projetos" — dava para ver que havia filtros, não o que
        cada um filtrava. O `placeholder` de cada <SelectValue> nunca aparecia,
        porque todos começam com valor definido: quem manda é o rótulo da opção.
        Então é o rótulo que precisa se explicar sozinho.

        (O `min-w=[260px]` do campo de busca também não era classe nenhuma —
        `=` no lugar de `-`. O campo nunca teve largura mínima.)
      */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por conteúdo, arte, projeto ou autor…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Abertos e resolvidos</SelectItem>
            <SelectItem value="ABERTO">Só os abertos</SelectItem>
            <SelectItem value="RESOLVIDO">Só os resolvidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as FilterTipo)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Texto e áudio</SelectItem>
            <SelectItem value="TEXTO">Só texto</SelectItem>
            <SelectItem value="AUDIO">Só áudio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={autorFilter} onValueChange={(v) => setAutorFilter(v as FilterAutor)}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Qualquer autor</SelectItem>
            <SelectItem value="CLIENTE">Só do cliente</SelectItem>
            <SelectItem value="DESIGNER">Só da equipe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projetoFilter} onValueChange={(v) => setProjetoFilter(v)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os projetos</SelectItem>
            {projetos.map((nome) => (<SelectItem key={nome} value={nome}>{nome}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[215px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais recentes primeiro</SelectItem>
            <SelectItem value="arte">Agrupados por arte</SelectItem>
            <SelectItem value="projeto">Agrupados por projeto</SelectItem>
            <SelectItem value="autor">Agrupados por autor</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Conteúdo */}
      <Tabs value={mode}>
        <TabsContent value="cards" className="mt-0">
          {empty ? (
            temFiltroFeedback ? (
              /*
               * A lista é paginada de 24 em 24, mas tipo, autor e projeto
               * filtram só o que já foi carregado. Com os casamentos numa
               * página posterior, esta ficava vazia — e "Carregar mais" morava
               * dentro do ramo não-vazio logo abaixo, então sumia junto: a tela
               * afirmava que não existe nada e tirava o único jeito de provar o
               * contrário. Valia para autor e projeto desde antes; o filtro de
               * tipo entrou nessa lista e tornou o caso comum.
               *
               * Quando ainda há páginas, o vazio diz que é desta página e
               * oferece buscar o resto; limpar continua ao lado.
               */
              <EmptyState
                variante="filtro"
                title={hasMore ? 'Nenhum feedback com esses filtros nesta página' : 'Nenhum feedback com esses filtros'}
                description={
                  hasMore
                    ? 'Tipo, autor e projeto filtram o que já foi carregado — e ainda há feedbacks para buscar.'
                    : 'Tente outro termo ou limpe os filtros.'
                }
                actionLabel={hasMore ? (loadingMore ? 'Carregando…' : 'Carregar mais') : 'Limpar filtros'}
                onAction={hasMore ? handleLoadMore : limparFiltrosFeedback}
                acaoSecundaria={hasMore ? { label: 'Limpar filtros', onClick: limparFiltrosFeedback } : undefined}
              />
            ) : (
              <EmptyState
                icon={MessageSquare}
                tom="pessego"
                title="Nenhum feedback ainda"
                description="O feedback chega quando o cliente abre o link de uma arte e comenta. Nada para responder por enquanto."
                acaoSecundaria={{ label: 'Ver artes', href: '/artes' }}
              />
            )
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
              <div className="space-y-3">
                {filteredOrdered.map((fb) => (
                  <ListItem
                    key={fb.id}
                    fb={fb}
                    selected={selectedId === fb.id}
                    onOpen={(id) => setSelectedId(id)}
                    onVerNaArte={handleVerNaArte}
                    onAlternarResolvido={handleAlternarResolvido}
                    onCriarTarefa={handleCriarTarefa}
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline">
                      {loadingMore ? 'Carregando…' : 'Carregar mais'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="sticky top-4 h-fit">
                {!selected ? (
                  <Card className="p-6 text-sm text-muted-foreground">Selecione um feedback à esquerda para ver detalhes.</Card>
                ) : (
                  <FeedbackDetail
                    fb={selected}
                    onVerNaArte={handleVerNaArte}
                    onAlternarResolvido={handleAlternarResolvido}
                    onCriarTarefa={handleCriarTarefa}
                  />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          <FeedbackBoardView
            items={filteredOrdered}
            onOpen={(id) => setSelectedId(id)}
            onMove={moverPara}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <FeedbackTimelineView items={filteredOrdered} onOpen={(id) => setSelectedId(id)} />
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
