'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare, Search, User, Mic, Type, MapPin, Reply, Eye, Download, PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';

/* =========================
   Tipos
   ========================= */

type FeedbackTipo = 'TEXTO' | 'AUDIO';
type AutorTipo = 'CLIENTE' | 'DESIGNER';
type FeedbackStatus = 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO' | 'ARQUIVADO';

interface FeedbackRow {
  id: string;
  conteudo: string;
  status: FeedbackStatus;
  tipo: FeedbackTipo;
  arquivo: string | null;
  criado_em: string;

  arte_id: string;
  arte_nome: string;
  projeto_id: string;
  projeto_nome: string;
  cliente_id: string;
  cliente_nome: string;
  autor_id: string;
  autor_nome: string;
  autor_tipo: AutorTipo;

  posicao_x?: number | null;
  posicao_y?: number | null;
}

/* =========================
   UI Helpers
   ========================= */

function TipoBadge({ tipo }: { tipo: FeedbackTipo | string }) {
  const map = {
    TEXTO: { label: 'Texto', icon: Type, cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    AUDIO: { label: 'Áudio', icon: Mic, cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  } as const;
  const cfg = (map as any)[tipo] ?? { label: tipo, icon: MessageSquare, cls: 'bg-gray-100 text-gray-800 border-gray-200' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: FeedbackStatus }) {
  const map: Record<FeedbackStatus, { label: string; cls: string }> = {
    ABERTO:     { label: 'Aberto',     cls: 'bg-amber-100 text-amber-900 border-amber-200' },
    EM_ANALISE: { label: 'Em análise', cls: 'bg-blue-100 text-blue-900 border-blue-200' },
    RESOLVIDO:  { label: 'Resolvido',  cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    ARQUIVADO:  { label: 'Arquivado',  cls: 'bg-slate-100 text-slate-900 border-slate-200' },
  };
  const cfg = map[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>{cfg.label}</span>;
}

function AudioInline({ src }: { src: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <audio controls className="w-full">
        <source src={src} />
        Seu navegador não suporta áudio embutido.
      </audio>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(src, '_blank')}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* =========================
   Card de Feedback (com URL assinada p/ áudio privado)
   ========================= */

function FeedbackCard({
  fb,
  onCriarTarefa,
  onResponder,
  onVerNaArte,
}: {
  fb: FeedbackRow;
  onCriarTarefa: (fb: FeedbackRow) => void;
  onResponder: (fb: FeedbackRow) => void;
  onVerNaArte: (fb: FeedbackRow) => void;
}) {
  const hasPosition = fb.posicao_x != null && fb.posicao_y != null;
  const formatDate = (s: string) =>
    new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function signIfNeeded() {
      if (!fb.arquivo || fb.tipo !== 'AUDIO') { setAudioUrl(null); return; }

      // se já vier URL completa
      if (/^https?:\/\//i.test(fb.arquivo)) { setAudioUrl(fb.arquivo); return; }

      // path no Storage privado: assinar (ajuste 'artes' para seu bucket)
      const { data, error } = await supabase.storage
        .from('artes')
        .createSignedUrl(fb.arquivo, 600);

      if (active) setAudioUrl(error ? null : data?.signedUrl ?? null);
    }

    signIfNeeded();
    return () => { active = false; };
  }, [fb.arquivo, fb.tipo]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <TipoBadge tipo={fb.tipo} />
              <StatusBadge status={fb.status} />
              {hasPosition && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Posicionado
                </Badge>
              )}
              <Badge variant={fb.autor_tipo === 'CLIENTE' ? 'default' : 'secondary'}>
                {fb.autor_tipo === 'CLIENTE' ? 'Cliente' : 'Designer'}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{fb.arte_nome}</h3>
              <p className="text-xs text-muted-foreground">
                {fb.projeto_nome} • {fb.cliente_nome}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Conteúdo */}
        <div className="space-y-3">
          {fb.conteudo && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{fb.conteudo}</p>
            </div>
          )}
          {audioUrl && fb.tipo === 'AUDIO' && <AudioInline src={audioUrl} />}
          {hasPosition && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                Posição: X:{Math.round(fb.posicao_x!)} Y:{Math.round(fb.posicao_y!)}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{fb.autor_nome}</p>
              <p className="text-xs text-muted-foreground">{formatDate(fb.criado_em)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onVerNaArte(fb)} title="Ver na arte">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onResponder(fb)} title="Responder">
              <Reply className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCriarTarefa(fb)} title="Criar tarefa">
              <PlusCircle className="h-4 w-4 mr-1" />
              Tarefa
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =========================
   Página
   ========================= */

export default function FeedbacksPage() {
  const PAGE_SIZE = 24;

  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | FeedbackTipo>('todos');
  const [autorFilter, setAutorFilter] = useState<'todos' | AutorTipo>('todos');
  const [projetoFilter, setProjetoFilter] = useState<'todos' | string>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | FeedbackStatus>('todos');
  const [sortBy, setSortBy] = useState<'criado_em' | 'arte' | 'projeto' | 'autor'>('criado_em');

  // Debounce simples pro search (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(h);
  }, [searchTerm]);

  // Lista de projetos (derivada dos dados)
  const projetos = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.projeto_nome))).sort();
  }, [rows]);

  /* =========================
     Fetch via RPC segura (com erros detalhados)
     ========================= */

  async function fetchPage(from: number, _to: number) {
    const limit = PAGE_SIZE;
    const offset = from;

    const { data, error } = await supabase.rpc('feedbacks_ui_page', {
      p_status: statusFilter === 'todos' ? null : statusFilter,
      p_tipo:   tipoFilter   === 'todos' ? null : tipoFilter,
      p_limit:  limit,
      p_offset: offset,
      p_search: debouncedSearch.trim() ? debouncedSearch.trim() : null,
    });

    if (error) {
      const msg = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' | ');
      throw new Error(msg || 'RPC feedbacks_ui_page falhou');
    }

    if (!Array.isArray(data)) {
      throw new Error('RPC feedbacks_ui_page retornou formato inesperado');
    }

    return data as FeedbackRow[];
  }

  // Primeira carga e quando filtros server-side mudam
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // ✅ garante que há sessão antes de buscar
        const { data: sess } = await supabase.auth.getSession();
        if (!sess?.session?.user) {
          setError('Faça login para ver os feedbacks.');
          setRows([]);
          setHasMore(false);
          return;
        }

        const page = await fetchPage(0, PAGE_SIZE - 1);
        setRows(page);
        setHasMore(page.length === PAGE_SIZE);
      } catch (e: any) {
        const msg = e?.message || JSON.stringify(e) || 'Erro desconhecido';
        console.error('feedbacks: load error ->', msg);
        setError('Não foi possível carregar os feedbacks. ' + msg);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, tipoFilter, debouncedSearch]);

  // Refiltrar/ordenar client-side
  const filteredOrdered = useMemo(() => {
    let arr = [...rows];

    // busca complementar no client (ok manter mesmo com p_search)
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

  /* =========================
     Handlers
     ========================= */

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const page = await fetchPage(rows.length, rows.length + PAGE_SIZE - 1);
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

  const handleVerNaArte = (fb: FeedbackRow) => {
    const url = (fb.posicao_x != null && fb.posicao_y != null)
      ? `/artes/${fb.arte_id}?x=${Math.round(fb.posicao_x!)}&y=${Math.round(fb.posicao_y!)}`
      : `/artes/${fb.arte_id}`;
    window.open(url, '_blank');
  };

  const handleResponder = async (fb: FeedbackRow) => {
    toast.info(`Responder ${fb.autor_nome} em "${fb.arte_nome}"`);
  };

  const handleCriarTarefa = async (fb: FeedbackRow) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast.error('Você precisa estar autenticado.');
        return;
      }

      // Pega o usuario_id do auth atual
      const { data: authLink, error: authErr } = await supabase
        .from('usuario_auth')
        .select('usuario_id')
        .eq('auth_user_id', user.id)
        .single();

      if (authErr || !authLink) {
        toast.error('Não foi possível identificar seu usuário de aplicação.');
        return;
      }

      const titulo = `Ajuste: ${fb.conteudo?.slice(0, 60) || fb.arte_nome}`;
      const descricao = `Criada a partir do feedback ${fb.id} — Arte: ${fb.arte_nome} — Projeto: ${fb.projeto_nome}`;

      const { error: rpcError } = await supabase.rpc('criar_tarefa_de_feedback', {
        p_feedback_id: fb.id,
        p_responsavel_id: authLink.usuario_id,
        p_titulo: titulo,
        p_descricao: descricao,
        p_prioridade: 'MEDIA',
        p_prazo: null,
      });

      if (rpcError) throw rpcError;

      toast.success('Tarefa criada a partir do feedback!');
    } catch (e: any) {
      const msg = e?.message || JSON.stringify(e) || 'Erro desconhecido';
      console.error('feedbacks: criar tarefa error ->', msg);
      toast.error('Falha ao criar tarefa a partir do feedback. ' + msg);
    }
  };

  /* =========================
     Render
     ========================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="ml-2">Carregando feedbacks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center text-destructive">{error}</div>
      </div>
    );
  }

  const estatisticas = {
    total: rows.length,
    texto: rows.filter((f) => f.tipo === 'TEXTO').length,
    audio: rows.filter((f) => f.tipo === 'AUDIO').length,
    clientes: rows.filter((f) => f.autor_tipo === 'CLIENTE').length,
    designers: rows.filter((f) => f.autor_tipo === 'DESIGNER').length,
    posicionados: rows.filter((f) => f.posicao_x != null && f.posicao_y != null).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedbacks</h1>
          <p className="text-muted-foreground">Todos os comentários e sugestões sobre as artes</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{estatisticas.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{estatisticas.texto}</div><p className="text-sm text-muted-foreground">Texto</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-purple-600">{estatisticas.audio}</div><p className="text-sm text-muted-foreground">Áudio</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-green-600">{estatisticas.clientes}</div><p className="text-sm text-muted-foreground">de Clientes</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-orange-600">{estatisticas.designers}</div><p className="text-sm text-muted-foreground">de Designers</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-indigo-600">{estatisticas.posicionados}</div><p className="text-sm text-muted-foreground">Posicionados</p></CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por conteúdo, arte, projeto ou autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            <SelectItem value="ABERTO">Aberto</SelectItem>
            <SelectItem value="EM_ANALISE">Em análise</SelectItem>
            <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
            <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as any)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="TEXTO">Texto</SelectItem>
            <SelectItem value="AUDIO">Áudio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={autorFilter} onValueChange={(v) => setAutorFilter(v as any)}>
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
            {projetos.map((nome) => (
              <SelectItem key={nome} value={nome}>{nome}</SelectItem>
            ))}
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

      {/* Grid */}
      {filteredOrdered.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrdered.map((fb) => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                onCriarTarefa={handleCriarTarefa}
                onResponder={handleResponder}
                onVerNaArte={handleVerNaArte}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline">
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum feedback encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || tipoFilter !== 'todos' || autorFilter !== 'todos' || projetoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Os feedbacks aparecerão aqui conforme forem enviados.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
