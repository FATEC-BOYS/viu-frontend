'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
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
  MessageSquare, Search, Mic, Type, MapPin, Reply, Eye, Download, PlusCircle, Settings2,
} from 'lucide-react';

/* =========================
   Tipos
   ========================= */
type FeedbackTipo = 'TEXTO' | 'AUDIO';
type AutorTipo = 'CLIENTE' | 'DESIGNER';
type FeedbackStatus = 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO' | 'ARQUIVADO';

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

function TipoBadge({ tipo }: { tipo: FeedbackTipo | string }) {
  const map = {
    TEXTO: { label: 'Texto', icon: Type, cls: 'bg-blue-100 text-blue-900 border-blue-200' },
    AUDIO: { label: 'Áudio', icon: Mic, cls: 'bg-purple-100 text-purple-900 border-purple-200' },
  } as const;
  const cfg = (map as any)[tipo] ?? { label: tipo, icon: MessageSquare, cls: 'bg-slate-100 text-slate-900 border-slate-200' };
  const Icon = cfg.icon;
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${cfg.cls}`}><Icon className="h-3 w-3" />{cfg.label}</span>;
}
function StatusBadge({ status }: { status: FeedbackStatus }) {
  const map: Record<FeedbackStatus, { label: string; cls: string }> = {
    ABERTO:     { label: 'Aberto',     cls: 'bg-amber-100 text-amber-900 border-amber-200' },
    EM_ANALISE: { label: 'Em análise', cls: 'bg-blue-100 text-blue-900 border-blue-200' },
    RESOLVIDO:  { label: 'Resolvido',  cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    ARQUIVADO:  { label: 'Arquivado',  cls: 'bg-slate-100 text-slate-900 border-slate-200' },
  };
  const cfg = map[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${cfg.cls}`}>{cfg.label}</span>;
}
function formatDateTime(s: string) { return new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function formatTime(s: string) { return new Date(s).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }
function isHttpUrl(path?: string | null) { return !!path && /^https?:\/\//i.test(path); }

/* =========================
   Storage helpers
   ========================= */
async function signPathIfNeeded(bucket: string, path?: string | null, expiresInSec = 600) {
  if (!path) return null;
  if (isHttpUrl(path)) return path;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}
async function hydrateSignedUrls(rows: RowBase[]): Promise<FeedbackRow[]> {
  const out: FeedbackRow[] = rows.map((r) => ({ ...r, audio_signed_url: null, preview_signed_url: null }));
  await Promise.all(out.map(async (r) => {
    if (r.tipo === 'AUDIO') r.audio_signed_url = await signPathIfNeeded('artes', r.arquivo);
    if (r.arte_preview_path) r.preview_signed_url = await signPathIfNeeded('artes', r.arte_preview_path);
  }));
  return out;
}

/* =========================
   List item
   ========================= */
function ListItem({
  fb, selected, onOpen, onVerNaArte, onResponder, onCriarTarefa,
}: {
  fb: FeedbackRow; selected?: boolean;
  onOpen: (id: string) => void; onVerNaArte: (f: FeedbackRow) => void; onResponder: (f: FeedbackRow) => void; onCriarTarefa: (f: FeedbackRow) => void;
}) {
  const hasPos = fb.posicao_x != null && fb.posicao_y != null;
  const isResolved = fb.status === 'RESOLVIDO';
  const TipoIcon = fb.tipo === 'AUDIO' ? Mic : Type;

  const pill = useMemo(() => {
    if (isResolved) return { label: 'Resolvido', tone: 'emerald' };
    if (fb.status === 'EM_ANALISE') return { label: 'A bola está com: Cliente', tone: 'blue' };
    if (fb.status === 'ABERTO') return { label: 'A bola está com: Designer', tone: 'amber' };
    return { label: 'Arquivado', tone: 'slate' };
  }, [fb.status, isResolved]);

  const toneMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
    blue: 'bg-blue-100 text-blue-900 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    slate: 'bg-slate-100 text-slate-900 border-slate-200',
  };

  return (
    <div
      className={`group relative grid grid-cols-[86px_1fr_auto] gap-3 rounded-md border p-3 transition hover:shadow-sm hover:-translate-y-0.5 ${selected ? 'ring-2 ring-primary' : ''} ${isResolved ? 'opacity-80' : ''}`}
      role="button"
      onClick={() => onOpen(fb.id)}
    >
      <div className="relative h-[72px] w-[86px] overflow-hidden rounded-md border bg-muted">
        {fb.preview_signed_url ? (
          <Image src={fb.preview_signed_url} alt={fb.arte_nome} fill sizes="86px" className="object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">sem preview</div>
        )}
        {hasPos && (
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${fb.posicao_x}%`, top: `${fb.posicao_y}%` }}>
            <span className="inline-block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white shadow" />
          </div>
        )}
        {fb.arte_status_atual && (
          <span className="absolute left-1 top-1 rounded bg-background/80 px-1 text-[10px] border">{fb.arte_status_atual}</span>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{fb.projeto_nome} <span className="opacity-50">›</span> {fb.arte_nome}</p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${toneMap[pill.tone]}`}>{pill.label}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="mt-[2px] inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
            <TipoIcon className="h-3 w-3" /> {fb.tipo === 'AUDIO' ? 'Áudio' : 'Texto'}
          </span>
          <p className={`line-clamp-2 text-sm ${isResolved ? 'text-muted-foreground' : ''}`}>{fb.conteudo || <em className="text-muted-foreground">sem texto</em>}</p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{new Date(fb.criado_em).toLocaleDateString('pt-BR')}</span>
          <span>•</span>
          <span>{fb.autor_nome}</span>
          {hasPos && (<><span>•</span><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />posicionado</span></>)}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onVerNaArte(fb); }} title="Ver na arte"><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onResponder(fb); }} title="Responder"><Reply className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onCriarTarefa(fb); }} title="Criar tarefa"><PlusCircle className="mr-1 h-4 w-4" />Tarefa</Button>
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
  fb, onVerNaArte, onCriarTarefa,
}: {
  fb: FeedbackRow;
  onVerNaArte: (f: FeedbackRow) => void;
  onCriarTarefa: (f: FeedbackRow) => void;
}) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<
    { id: string; conteudo: string; criado_em: string; autor: { id: string; nome: string | null } }[]
  >([]);
  const [loadingThread, setLoadingThread] = useState(false);

  async function loadThread() {
    try {
      setLoadingThread(true);
      const res = await fetch(`/api/feedbacks/${encodeURIComponent(fb.id)}/respostas`, { cache: 'no-store' });
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
        body: JSON.stringify({ conteudo: reply.trim(), statusAfter: 'EM_ANALISE' }),
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="mb-1 flex items-center gap-2"><TipoBadge tipo={fb.tipo} /><StatusBadge status={fb.status} /></div>
            <p className="text-sm font-semibold">{fb.arte_nome}</p>
            <p className="text-xs text-muted-foreground">{fb.projeto_nome} • {fb.cliente_nome}</p>
          </div>
          <div className="text-[11px] text-muted-foreground">{formatDateTime(fb.criado_em)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {fb.preview_signed_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fb.preview_signed_url} alt={fb.arte_nome} className="aspect-[16/10] w-full rounded-md border object-cover" />
        )}
        {fb.conteudo && <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{fb.conteudo}</div>}
        {fb.tipo === 'AUDIO' && (fb.audio_signed_url || fb.arquivo) && <AudioInline src={fb.audio_signed_url || fb.arquivo!} />}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onVerNaArte(fb)}><Eye className="mr-1 h-4 w-4" /> Ver na arte</Button>
          <Button variant="ghost" size="sm" onClick={() => onCriarTarefa(fb)}><PlusCircle className="mr-1 h-4 w-4" /> Criar tarefa</Button>
          <Button asChild variant="link" size="sm"><Link href={`/projetos/${fb.projeto_id}`}>Abrir projeto</Link></Button>
        </div>

        {/* Thread */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground">Respostas</div>
          {loadingThread ? (
            <div className="text-xs text-muted-foreground">Carregando…</div>
          ) : thread.length === 0 ? (
            <div className="text-xs text-muted-foreground">Ainda não há respostas.</div>
          ) : (
            <div className="space-y-2">
              {thread.map((r) => (
                <div key={r.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{r.autor.nome ?? 'Usuário'}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDateTime(r.criado_em)}</div>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">{r.conteudo}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Responder</label>
          <textarea
            className="min-h-[90px] w-full resize-y rounded-md border bg-background p-2 text-sm"
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
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground">Dica: Ctrl/Cmd+Enter envia • Shift+Enter quebra linha</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setReply('')} disabled={sending}>Limpar</Button>
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
    { key: 'ABERTO', title: 'Aberto' }, { key: 'EM_ANALISE', title: 'Em análise' }, { key: 'RESOLVIDO', title: 'Resolvido' }, { key: 'ARQUIVADO', title: 'Arquivado' },
  ];
  const grouped = useMemo(() => {
    const m: Record<FeedbackStatus, FeedbackRow[]> = { ABERTO:[], EM_ANALISE:[], RESOLVIDO:[], ARQUIVADO:[] };
    items.forEach(i => m[i.status].push(i)); return m;
  }, [items]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cols.map(c => (
        <div key={c.key} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold">{c.title}</h4><Badge variant="secondary">{grouped[c.key].length}</Badge></div>
          <div className="space-y-2">
            {grouped[c.key].map(fb => (
              <div key={fb.id} className="cursor-pointer rounded-md border bg-card p-2 text-sm hover:shadow-sm" onClick={() => onOpen(fb.id)}>
                <div className="mb-1 flex items-center gap-2"><TipoBadge tipo={fb.tipo} /><span className="text-[11px] text-muted-foreground truncate">{fb.projeto_nome}</span></div>
                <div className="truncate">{fb.conteudo || fb.arte_nome}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{fb.autor_nome}</span>
                  <Select onValueChange={(v)=>onMove(fb.id, v as FeedbackStatus)}>
                    <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder={fb.status} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABERTO">Aberto</SelectItem>
                      <SelectItem value="EM_ANALISE">Em análise</SelectItem>
                      <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                      <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
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
              <div key={fb.id} className="cursor-pointer rounded-md border p-3 hover:shadow-sm" onClick={() => onOpen(fb.id)}>
                <div className="mb-1 flex items-center justify-between"><div className="flex items-center gap-2"><TipoBadge tipo={fb.tipo} /><span className="text-xs text-muted-foreground">{fb.projeto_nome} • {fb.cliente_nome}</span></div><span className="text-[11px] text-muted-foreground">{formatTime(fb.criado_em)}</span></div>
                <div className="text-sm">{fb.conteudo || <em className="text-muted-foreground">sem texto</em>}</div>
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

  /* ----------- FETCH: tenta RPC, senão SELECT aninhado ----------- */
  async function fetchPage(from: number) {
    const limit = PAGE_SIZE;
    const offset = from;

    // 1) tenta RPC
    try {
      const { data, error } = await supabase.rpc('feedbacks_ui_page', {
        p_status: statusFilter === 'todos' ? null : statusFilter,
        p_tipo:   tipoFilter   === 'todos' ? null : tipoFilter,
        p_limit:  limit,
        p_offset: offset,
        p_search: debouncedSearch.trim() ? debouncedSearch.trim() : null,
      });

      if (error) throw error;
      if (!Array.isArray(data)) throw new Error('RPC feedbacks_ui_page retornou formato inesperado');

      return await hydrateSignedUrls(data as RowBase[]);
    } catch (rpcErr: any) {
      // 2) fallback com SELECT aninhado
      console.warn('[feedbacks] RPC falhou, usando fallback:', rpcErr?.message || rpcErr);
      const SELECT = `
        id, conteudo, status, tipo, arquivo, criado_em, posicao_x, posicao_y,
        arte:arte_id (
          id, nome, status_atual, preview_path,
          projeto:projeto_id (
            id, nome,
            cliente:cliente_id ( id, nome )
          )
        ),
        autor:autor_id ( id, nome, tipo )
      `;
      const { data, error } = await supabase
        .from('feedbacks')
        .select(SELECT)
        .order('criado_em', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const mapped: RowBase[] = (data as any[]).map((r) => ({
        id: r.id,
        conteudo: r.conteudo,
        status: r.status,
        tipo: r.tipo,
        arquivo: r.arquivo,
        criado_em: r.criado_em,
        posicao_x: r.posicao_x,
        posicao_y: r.posicao_y,
        arte_id: r.arte?.id,
        arte_nome: r.arte?.nome,
        arte_status_atual: r.arte?.status_atual ?? null,
        arte_preview_path: r.arte?.preview_path ?? null,
        projeto_id: r.arte?.projeto?.id,
        projeto_nome: r.arte?.projeto?.nome,
        cliente_id: r.arte?.projeto?.cliente?.id,
        cliente_nome: r.arte?.projeto?.cliente?.nome,
        autor_id: r.autor?.id,
        autor_nome: r.autor?.nome,
        autor_tipo: r.autor?.tipo,
      }));

      return await hydrateSignedUrls(mapped);
    }
  }

  // primeira carga / quando filtros server-side mudam
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

        const { data: sess } = await supabase.auth.getSession();
        if (!sess?.session?.user) {
          setError('Faça login para ver os feedbacks.');
          setRows([]);
          setHasMore(false);
          return;
        }

        const page = await fetchPage(0);
        setRows(page);
        setHasMore(page.length === PAGE_SIZE);
        setSelectedId(page[0]?.id ?? null);
      } catch (e: any) {
        const msg = e?.message || JSON.stringify(e) || 'Erro desconhecido';
        console.error('feedbacks: load error ->', msg, e);
        setError('Não foi possível carregar os feedbacks.');
        setErrorDetails(msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, tipoFilter, debouncedSearch]);

  // carregar mais
  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const page = await fetchPage(rows.length);
      setRows(prev => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e: any) {
      const msg = e?.message || JSON.stringify(e) || 'Erro desconhecido';
      console.error('feedbacks: loadMore error ->', msg);
      toast.error('Falha ao carregar mais feedbacks. ' + msg);
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
  }, [rows, searchTerm, autorFilter, projetoFilter, sortBy]);

  /* ----------- ações ----------- */
  const handleVerNaArte = (fb: FeedbackRow) => {
    const url = (fb.posicao_x != null && fb.posicao_y != null)
      ? `/artes/${fb.arte_id}?x=${Math.round(fb.posicao_x!)}&y=${Math.round(fb.posicao_y!)}`
      : `/artes/${fb.arte_id}`;
    window.open(url, '_blank');
  };
  const handleResponder = async (fb: FeedbackRow) => {
    setSelectedId(fb.id); // foca o detalhe para responder
  };
  const handleCriarTarefa = async (fb: FeedbackRow) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { toast.error('Você precisa estar autenticado.'); return; }
      const { data: authLink, error: authErr } = await supabase.from('usuario_auth').select('usuario_id').eq('auth_user_id', user.id).single();
      if (authErr || !authLink) { toast.error('Não identifiquei seu usuário.'); return; }
      const titulo = `Ajuste: ${fb.conteudo?.slice(0, 60) || fb.arte_nome}`;
      const descricao = `Criada a partir do feedback ${fb.id} — Arte: ${fb.arte_nome} — Projeto: ${fb.projeto_nome}`;
      const { error: rpcError } = await supabase.rpc('criar_tarefa_de_feedback', {
        p_feedback_id: fb.id, p_responsavel_id: authLink.usuario_id, p_titulo: titulo, p_descricao: descricao, p_prioridade: 'MEDIA', p_prazo: null,
      });
      if (rpcError) throw rpcError;
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
  const selected = selectedId ? filteredOrdered.find(f => f.id === selectedId) || rows.find(f => f.id === selectedId) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Feedbacks ✦</h1>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Preferências</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w=[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por conteúdo, arte, projeto ou autor…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="ABERTO">Aberto</SelectItem>
            <SelectItem value="EM_ANALISE">Em análise</SelectItem>
            <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
            <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as FilterTipo)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="TEXTO">Texto</SelectItem>
            <SelectItem value="AUDIO">Áudio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={autorFilter} onValueChange={(v) => setAutorFilter(v as FilterAutor)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Autor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="CLIENTE">Clientes</SelectItem>
            <SelectItem value="DESIGNER">Designers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projetoFilter} onValueChange={(v) => setProjetoFilter(v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Projetos</SelectItem>
            {projetos.map((nome) => (<SelectItem key={nome} value={nome}>{nome}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
            <SelectItem value="arte">Arte</SelectItem>
            <SelectItem value="projeto">Projeto</SelectItem>
            <SelectItem value="autor">Autor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      <Tabs value={mode}>
        <TabsContent value="cards" className="mt-0">
          {empty ? (
            <Card className="p-12">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Nenhum feedback encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || tipoFilter !== 'todos' || autorFilter !== 'todos' || projetoFilter !== 'todos' || statusFilter !== 'todos'
                    ? 'Tente ajustar os filtros.'
                    : 'Os feedbacks aparecerão aqui conforme forem enviados.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
              <div className="space-y-3">
                {filteredOrdered.map((fb) => (
                  <ListItem
                    key={fb.id}
                    fb={fb}
                    selected={selectedId === fb.id}
                    onOpen={(id) => setSelectedId(id)}
                    onVerNaArte={handleVerNaArte}
                    onResponder={handleResponder}
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
            onMove={async (fbId, to) => {
              setRows(prev => prev.map(x => x.id === fbId ? { ...x, status: to } : x));
              const { error } = await supabase.from('feedbacks').update({ status: to }).eq('id', fbId);
              if (error) { toast.error('Não consegui mover, desfazendo…'); }
            }}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          <FeedbackTimelineView items={filteredOrdered} onOpen={(id) => setSelectedId(id)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
