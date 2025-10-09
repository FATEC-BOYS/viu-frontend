'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Bell, Search, Calendar, CheckCircle2, Circle, Loader2, MessageSquare,
  Clock, XCircle, CheckCheck, Trash2, Settings, MailOpen, Mail,
} from 'lucide-react';

/* ===================== Tipos ===================== */

interface Notificacao {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: 'FEEDBACK' | 'APROVACAO' | 'REJEICAO' | 'PRAZO' | 'PROJETO' | 'SISTEMA' | string;
  canal: 'SISTEMA' | 'EMAIL' | 'PUSH' | string;
  lida: boolean;
  criado_em: string;
  usuario: { nome: string };
}

type SortKey = 'criado_em' | 'titulo' | 'tipo' | 'status';

type MaybeArray<T> = T | T[] | null | undefined;
interface RawUsuario { nome: unknown }
interface RawNotificacao {
  id: unknown; titulo: unknown; conteudo: unknown; tipo: unknown; canal: unknown; lida: unknown; criado_em: unknown;
  usuario: MaybeArray<RawUsuario>;
}
const toOne = <T,>(val: MaybeArray<T>): T | null => Array.isArray(val) ? (val[0] ?? null) as T | null : (val ?? null) as T | null;

/* ===================== Pequenos helpers ===================== */

const TYPE_ICON: Record<string, { icon: any; label: string; dot: string }> = {
  FEEDBACK: { icon: MessageSquare, label: 'Feedback', dot: 'bg-blue-500' },
  APROVACAO: { icon: CheckCircle2, label: 'Aprovação', dot: 'bg-emerald-500' },
  REJEICAO: { icon: XCircle, label: 'Rejeição', dot: 'bg-red-500' },
  PRAZO: { icon: Clock, label: 'Prazo', dot: 'bg-amber-500' },
  PROJETO: { icon: Bell, label: 'Projeto', dot: 'bg-purple-500' },
  SISTEMA: { icon: Settings, label: 'Sistema', dot: 'bg-slate-400' },
};
function typeMeta(tipo: string) {
  return TYPE_ICON[tipo] ?? { icon: Bell, label: tipo, dot: 'bg-slate-400' };
}
function canalLabel(canal: string) {
  if (canal === 'SISTEMA') return 'Sistema';
  if (canal === 'EMAIL') return 'Email';
  if (canal === 'PUSH') return 'Push';
  return canal;
}
function fromNow(s: string) {
  const d = new Date(s); const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const h = Math.floor(diffMs / (1000*60*60));
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `${h}h atrás`;
  const days = Math.floor(h/24);
  if (days < 7) return `${days}d atrás`;
  return d.toLocaleDateString('pt-BR');
}
function groupLabelForDate(s: string) {
  const d = new Date(s); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Hoje';
  const diff = (now.getTime() - d.getTime()) / (1000*60*60*24);
  if (diff < 7) return 'Esta semana';
  return 'Anterior';
}

/* ===================== Linha de notificação (estilo inbox) ===================== */

function NotificacaoRow({
  n, onToggleRead, onDelete,
}: {
  n: Notificacao;
  onToggleRead: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const meta = typeMeta(n.tipo);
  const Icon = meta.icon;
  return (
    <div
      className={`group grid grid-cols-[20px_1fr_auto] items-start gap-3 rounded-lg border px-3 py-2 transition hover:bg-accent
        ${!n.lida ? 'border-primary/20 bg-primary/5' : 'border-transparent'}`}
    >
      {/* dot do tipo */}
      <div className={`mt-2 h-2 w-2 rounded-full ${meta.dot}`} />

      {/* conteúdo */}
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <Badge variant="secondary" className="h-5">
            {canalLabel(n.canal)}
          </Badge>
          {!n.lida && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
              <Mail className="h-3 w-3" /> não lida
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className={`truncate text-sm font-medium ${!n.lida ? 'text-foreground' : 'text-foreground/90'}`}>
              {n.titulo}
            </div>
            <p className={`line-clamp-2 text-sm ${!n.lida ? 'text-muted-foreground' : 'text-muted-foreground/90'}`}>
              {n.conteudo}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{fromNow(n.criado_em)}</span>
              <span className="opacity-50">•</span>
              <span>de {n.usuario?.nome || 'Sistema'}</span>
            </div>
          </div>

          {/* ações rápidas */}
          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title={n.lida ? 'Marcar como não lida' : 'Marcar como lida'}
              onClick={() => onToggleRead(n.id, !n.lida)}
            >
              {n.lida ? <MailOpen className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              title="Excluir"
              onClick={() => onDelete(n.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* marcador de lido/não-lido (coluna direita compacta) */}
      <div className="mt-1 hidden sm:block">
        {n.lida ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCheck className="h-3 w-3" /> lida
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-primary">
            <Circle className="h-3 w-3" /> nova
          </span>
        )}
      </div>
    </div>
  );
}

/* ===================== Página ===================== */

export default function NotificacoesPage() {
  const [rows, setRows] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<string>('todos');
  const [status, setStatus] = useState<string>('todos');
  const [canal, setCanal] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<SortKey>('criado_em');

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select(`
            id, titulo, conteudo, tipo, canal, lida, criado_em,
            usuario:usuario_id (nome)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        const raw = (data ?? []) as RawNotificacao[];
        const mapped: Notificacao[] = raw.map(r => {
          const u = toOne<RawUsuario>(r.usuario);
          return {
            id: String(r.id),
            titulo: String(r.titulo),
            conteudo: String(r.conteudo),
            tipo: String(r.tipo) as Notificacao['tipo'],
            canal: String(r.canal) as Notificacao['canal'],
            lida: Boolean(r.lida),
            criado_em: String(r.criado_em),
            usuario: { nome: String(u?.nome ?? '—') },
          };
        });

        setRows(mapped);
      } catch {
        setError('Não foi possível carregar as notificações.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...rows];

    if (q) {
      const s = q.toLowerCase();
      arr = arr.filter(n =>
        n.titulo.toLowerCase().includes(s) ||
        n.conteudo.toLowerCase().includes(s)
      );
    }
    if (tipo !== 'todos') arr = arr.filter(n => n.tipo === tipo);
    if (status !== 'todos') arr = arr.filter(n => (status === 'lida' ? n.lida : !n.lida));
    if (canal !== 'todos') arr = arr.filter(n => n.canal === canal);

    arr.sort((a, b) => {
      switch (sortBy) {
        case 'titulo': return a.titulo.localeCompare(b.titulo);
        case 'tipo': return String(a.tipo).localeCompare(String(b.tipo));
        case 'status': return Number(a.lida) - Number(b.lida);
        case 'criado_em':
        default: return +new Date(b.criado_em) - +new Date(a.criado_em);
      }
    });

    return arr;
  }, [rows, q, tipo, status, canal, sortBy]);

  // agrupamento por data
  const grouped = useMemo(() => {
    const map = new Map<string, Notificacao[]>();
    for (const n of filtered) {
      const g = groupLabelForDate(n.criado_em);
      const list = map.get(g) ?? [];
      list.push(n);
      map.set(g, list);
    }
    return Array.from(map.entries()); // [ [label, Notificacao[]], ... ]
  }, [filtered]);

  const stats = {
    total: rows.length,
    unread: rows.filter(n => !n.lida).length,
  };

  // ações
  async function toggleRead(id: string, next: boolean) {
    try {
      await supabase.from('notificacoes').update({ lida: next }).eq('id', id);
      setRows(prev => prev.map(n => (n.id === id ? { ...n, lida: next } : n)));
    } catch (e) {
      console.error('toggle read failed', e);
    }
  }
  async function deleteOne(id: string) {
    try {
      await supabase.from('notificacoes').delete().eq('id', id);
      setRows(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('delete failed', e);
    }
  }
  async function markAllAsRead() {
    try {
      const ids = filtered.filter(n => !n.lida).map(n => n.id);
      if (!ids.length) return;
      await supabase.from('notificacoes').update({ lida: true }).in('id', ids);
      setRows(prev => prev.map(n => (ids.includes(n.id) ? { ...n, lida: true } : n)));
    } catch (e) {
      console.error('mark all failed', e);
    }
  }

  /* ===================== Render ===================== */

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Carregando notificações…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Notificações ✦ </h1>
          <Badge variant="secondary" className="h-6">{stats.total} no total</Badge>
          <Badge className="h-6 gap-1">
            <Mail className="h-3 w-3" /> {stats.unread} não lidas
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Preferências
          </Button>
        </div>
      </div>

      {/* Barra de filtros compacta */}
      <div className="grid gap-2 rounded-xl border bg-card p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por título ou conteúdo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos tipos</SelectItem>
                <SelectItem value="FEEDBACK">Feedback</SelectItem>
                <SelectItem value="APROVACAO">Aprovação</SelectItem>
                <SelectItem value="REJEICAO">Rejeição</SelectItem>
                <SelectItem value="PRAZO">Prazo</SelectItem>
                <SelectItem value="PROJETO">Projeto</SelectItem>
                <SelectItem value="SISTEMA">Sistema</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="nao_lida">Não lidas</SelectItem>
                <SelectItem value="lida">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="SISTEMA">Sistema</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PUSH">Push</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="criado_em">Mais recente</SelectItem>
                <SelectItem value="titulo">Título</SelectItem>
                <SelectItem value="tipo">Tipo</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />
        {/* chips rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {(['FEEDBACK','APROVACAO','REJEICAO','PRAZO','PROJETO','SISTEMA'] as const).map(t => {
            const m = typeMeta(t);
            return (
              <Button
                key={t}
                size="sm"
                variant={tipo === t ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setTipo(tipo === t ? 'todos' : t)}
              >
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${m.dot}`} />
                {m.label}
              </Button>
            );
          })}
          <Button
            size="sm"
            variant={status === 'nao_lida' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setStatus(status === 'nao_lida' ? 'todos' : 'nao_lida')}
          >
            <Mail className="mr-2 h-4 w-4" /> Não lidas
          </Button>
          <Button
            size="sm"
            variant={status === 'lida' ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setStatus(status === 'lida' ? 'todos' : 'lida')}
          >
            <MailOpen className="mr-2 h-4 w-4" /> Lidas
          </Button>
        </div>
      </div>

      {/* Lista agrupada (timeline/inbox) */}
      {filtered.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([label, items]) => (
            <section key={label} className="space-y-3">
              <div className="sticky top-[64px] z-10 -mx-2 bg-background/80 px-2 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                  <Calendar className="h-3 w-3" />
                  {label}
                  <span className="text-muted-foreground">• {items.length}</span>
                </div>
              </div>
              <div className="grid gap-2">
                {items.map((n) => (
                  <NotificacaoRow
                    key={n.id}
                    n={n}
                    onToggleRead={toggleRead}
                    onDelete={deleteOne}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border p-12 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="mb-1 text-lg font-semibold">Sem notificações por aqui</h3>
          <p className="text-sm text-muted-foreground">
            {q || tipo !== 'todos' || status !== 'todos' || canal !== 'todos'
              ? 'Tente ajustar os filtros acima.'
              : 'Quando algo acontecer, eu te aviso por aqui.'}
          </p>
        </div>
      )}
    </div>
  );
}
