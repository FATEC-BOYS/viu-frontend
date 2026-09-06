'use client';

import EmptyState from "@/components/layout/EmptyState";
import { FadeIn } from "@/components/layout/Motion";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnviarLinkDialog from '@/components/compartilhar/EnviarLinkDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Share2, Search, Copy, ExternalLink, Loader2, EyeOff, Plus, MoreVertical,
  Trash2, RefreshCw, FileImage, FolderOpen, Clock, CheckCircle2, AlertTriangle,
  MessageCircle, Download, Shield, CalendarPlus, CalendarClock,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

/* ===================== Tipos ===================== */

interface LinkCompartilhado {
  id: string;
  token: string;
  tipo: 'ARTE' | 'PROJETO' | string;
  expira_em: string | null;
  somente_leitura: boolean;
  can_comment?: boolean;
  can_download?: boolean;
  criado_em: string;
  arte: {
    nome: string;
    projeto: { nome: string; cliente: { nome: string; telefone: string | null } };
  } | null;
  projeto: {
    nome: string;
    cliente: { nome: string; telefone: string | null };
  } | null;
}
type SortKey = 'criado_em' | 'expira_em' | 'tipo';

/* ===================== UI helpers ===================== */

const LOADER_LINES = [
  'Afiando os lápis…',
  'Abrindo pastas…',
  'Buscando inspirações…',
  'Alinhando pixels…',
] as const;

function TipoPill({ tipo }: { tipo: string }) {
  const map = {
    ARTE: { label: 'Arte', icon: FileImage, cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    PROJETO: { label: 'Projeto', icon: FolderOpen, cls: 'bg-purple-100 text-purple-800 border-purple-200' },
  } as const;
  const cfg = (map as any)[tipo] ?? { label: tipo, icon: Share2, cls: 'bg-muted text-muted-foreground border-border' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ expira_em }: { expira_em: string | null }) {
  if (!expira_em) {
    return (
      <Badge variant="default" className="h-5 text-[11px] flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Permanente
      </Badge>
    );
  }
  const exp = new Date(expira_em);
  const now = new Date();
  const expired = exp < now;
  const soon = !expired && (exp.getTime() - now.getTime() < 24 * 60 * 60 * 1000);

  if (expired) {
    return (
      <Badge variant="destructive" className="h-5 text-[11px] flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> Expirado
      </Badge>
    );
  }
  if (soon) {
    return (
      <Badge variant="secondary" className="h-5 text-[11px] flex items-center gap-1">
        <Clock className="h-3 w-3" /> Expira em breve
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-5 text-[11px] flex items-center gap-1">
      <Clock className="h-3 w-3" /> Ativo
    </Badge>
  );
}

function formatDate(dt: string | null) {
  if (!dt) return 'Nunca';
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ===================== Linha ===================== */

function LinkRow({
  link,
  onCopy,
  onDelete,
  onRegenerate,
  onToggleReadOnly,
  onToggleComment,
  onToggleDownload,
  onExtendDays,
  onRemoveExpiration,
}: {
  link: LinkCompartilhado;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  onToggleReadOnly: (id: string, v: boolean) => void;
  onToggleComment: (id: string, v: boolean) => void;
  onToggleDownload: (id: string, v: boolean) => void;
  onExtendDays: (id: string, days: number) => void;
  onRemoveExpiration: (id: string) => void;
}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/l/${link.token}`;
  const expired = !!(link.expira_em && new Date(link.expira_em) < new Date());

  const title =
    link.tipo === 'ARTE' && link.arte ? link.arte.nome :
    link.tipo === 'PROJETO' && link.projeto ? link.projeto.nome : 'Link Compartilhado';

  const subtitle =
    link.tipo === 'ARTE' && link.arte
      ? `${link.arte.projeto.nome} • ${link.arte.projeto.cliente.nome}`
      : link.tipo === 'PROJETO' && link.projeto
      ? link.projeto.cliente.nome
      : '';

  // O nome que vai na mensagem do WhatsApp é o do PROJETO, não o do link:
  // "a arte Capa está pronta" diz menos ao cliente do que o nome do trabalho.
  const nomeProjeto =
    link.tipo === 'ARTE' && link.arte
      ? link.arte.projeto.nome
      : link.tipo === 'PROJETO' && link.projeto
      ? link.projeto.nome
      : title;

  const nomeCliente =
    link.tipo === 'ARTE' && link.arte
      ? link.arte.projeto.cliente.nome
      : link.tipo === 'PROJETO' && link.projeto
      ? link.projeto.cliente.nome
      : null;

  // Vem do cadastro feito no ClienteWizard. Quando existe, o dialog abre com o
  // campo preenchido; quando não, ele pede o número.
  const telefoneCliente =
    link.tipo === 'ARTE' && link.arte
      ? link.arte.projeto.cliente.telefone
      : link.tipo === 'PROJETO' && link.projeto
      ? link.projeto.cliente.telefone
      : null;

  const leftStripe =
    link.tipo === 'ARTE' ? 'before:bg-blue-500' :
    link.tipo === 'PROJETO' ? 'before:bg-purple-500' : 'before:bg-border';

  return (
    <div
      className={`relative rounded-md border bg-card p-3 card-interativo ${expired ? 'opacity-70' : ''} ${leftStripe}
      before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:rounded-l-md`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TipoPill tipo={link.tipo} />
            <StatusBadge expira_em={link.expira_em} />
            {link.somente_leitura && (
              <Badge variant="outline" className="h-5 text-[11px] flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> Somente leitura
              </Badge>
            )}
          </div>
          <div className="truncate font-medium">{title}</div>
          {!!subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onCopy(url)} disabled={expired} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(url, '_blank')} disabled={expired} title="Abrir link">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRegenerate(link.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar token
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExtendDays(link.id, 7)}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                +7 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExtendDays(link.id, 30)}>
                <CalendarClock className="h-4 w-4 mr-2" />
                +30 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRemoveExpiration(link.id)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Tornar permanente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(link.id)} className="text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* URL */}
      <div className="mt-2">
        <Label className="text-[11px] text-muted-foreground">URL</Label>
        <div className="flex items-center gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button size="sm" variant="outline" onClick={() => onCopy(url)} disabled={expired}>
            <Copy className="h-3 w-3" />
          </Button>
          {/*
            Copiar o link ainda exige o designer sair daqui para colar em algum
            lugar. Este dialog fecha o caminho sem trocar de aba.
          */}
          {!expired && (
            <EnviarLinkDialog
              token={link.token}
              reviewUrl={url}
              projectName={nomeProjeto}
              clientName={nomeCliente}
              clientPhone={telefoneCliente}
            />
          )}
        </div>
      </div>

      {/* Permissões + Datas */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Somente leitura</span>
            <Switch
              checked={!!link.somente_leitura}
              onCheckedChange={(v) => onToggleReadOnly(link.id, v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pode comentar</span>
            <Switch
              checked={!!link.can_comment}
              onCheckedChange={(v) => onToggleComment(link.id, v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pode baixar</span>
            <Switch
              checked={!!link.can_download}
              onCheckedChange={(v) => onToggleDownload(link.id, v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Criado</span>
            <div className="font-medium">{formatDate(link.criado_em)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Expira</span>
            <div className="font-medium">{formatDate(link.expira_em)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Página ===================== */

export default function LinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkCompartilhado[]>([]);
  const [filtered, setFiltered] = useState<LinkCompartilhado[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaderLine, setLoaderLine] = useState<(typeof LOADER_LINES)[number]>(LOADER_LINES[0]);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<SortKey>('criado_em');

  // loader frases
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoaderLine((prev) => LOADER_LINES[(LOADER_LINES.indexOf(prev) + 1) % LOADER_LINES.length]);
    }, 1500);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: any[] }>('/links');
        const rows: LinkCompartilhado[] = (res.data ?? []).map((r: any) => ({
          id: String(r.id),
          token: String(r.token),
          tipo: String(r.tipo) as LinkCompartilhado['tipo'],
          expira_em: r.expiraEm ?? r.expira_em ?? null,
          somente_leitura: Boolean(r.somenteLeitura ?? r.somente_leitura),
          can_comment: false,
          can_download: false,
          criado_em: r.criadoEm ?? r.criado_em ?? '',
          arte: r.arte ? {
            nome: String(r.arte.nome ?? ''),
            projeto: {
              nome: String(r.arte.projeto?.nome ?? ''),
              cliente: {
                nome: String(r.arte.projeto?.cliente?.nome ?? ''),
                telefone: r.arte.projeto?.cliente?.telefone ?? null,
              },
            },
          } : null,
          projeto: null,
        }));
        setLinks(rows);
      } catch (e: any) {
        setError(e?.message ?? 'Não foi possível carregar os links compartilhados.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // filtros + ordenação
  useEffect(() => {
    let arr = [...links];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      arr = arr.filter((l) => {
        const t = l.tipo === 'ARTE' ? l.arte?.nome ?? '' : l.projeto?.nome ?? '';
        const p = l.tipo === 'ARTE' ? l.arte?.projeto.nome ?? '' : l.projeto?.nome ?? '';
        const c = l.tipo === 'ARTE' ? l.arte?.projeto.cliente.nome ?? '' : l.projeto?.cliente.nome ?? '';
        return (
          t.toLowerCase().includes(q) ||
          p.toLowerCase().includes(q) ||
          c.toLowerCase().includes(q) ||
          l.token.toLowerCase().includes(q)
        );
      });
    }

    if (tipoFilter !== 'todos') arr = arr.filter((l) => l.tipo === tipoFilter);

    if (statusFilter !== 'todos') {
      const now = new Date();
      arr = arr.filter((l) => {
        const expired = !!(l.expira_em && new Date(l.expira_em) < now);
        if (statusFilter === 'ativo') return !expired;
        if (statusFilter === 'expirado') return expired;
        if (statusFilter === 'permanente') return !l.expira_em;
        return true;
      });
    }

    arr.sort((a, b) => {
      switch (sortBy) {
        case 'criado_em': return +new Date(b.criado_em) - +new Date(a.criado_em);
        case 'expira_em': {
          const ax = a.expira_em ? +new Date(a.expira_em) : Number.POSITIVE_INFINITY;
          const bx = b.expira_em ? +new Date(b.expira_em) : Number.POSITIVE_INFINITY;
          return ax - bx;
        }
        case 'tipo': return a.tipo.localeCompare(b.tipo);
        default: return 0;
      }
    });

    setFiltered(arr);
  }, [links, searchTerm, tipoFilter, statusFilter, sortBy]);

  // ===== Ações =====

  const handleCopy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/links/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  };

  const handleRegenerate = (_id: string) => {
    // Regenerar token não tem endpoint dedicado no backend — no-op
  };

  const patchLink = (id: string, patch: Partial<LinkCompartilhado>) =>
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const onToggleReadOnly = async (id: string, v: boolean) => {
    patchLink(id, { somente_leitura: v });
    try { await api.put(`/links/${id}`, { somenteLeitura: v }); }
    catch { patchLink(id, { somente_leitura: !v }); }
  };
  const onToggleComment = (_id: string, _v: boolean) => { /* can_comment não existe no backend */ };
  const onToggleDownload = (_id: string, _v: boolean) => { /* can_download não existe no backend */ };

  const onExtendDays = async (id: string, days: number) => {
    const item = links.find((l) => l.id === id);
    const base = item?.expira_em ? new Date(item.expira_em) : new Date();
    const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    patchLink(id, { expira_em: next });
    try { await api.put(`/links/${id}`, { expiraEm: next }); }
    catch { patchLink(id, { expira_em: item?.expira_em ?? null }); }
  };

  const onRemoveExpiration = async (id: string) => {
    const old = links.find((l) => l.id === id)?.expira_em ?? null;
    patchLink(id, { expira_em: null });
    try { await api.put(`/links/${id}`, { expiraEm: null }); }
    catch { patchLink(id, { expira_em: old }); }
  };

  // ===== Render =====

  if (loading) {
    return (
      <div className="flex flex-col gap-3 items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{loaderLine}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <p className="text-lg font-medium mb-2">Deu ruim por aqui.</p>
          <p className="text-muted-foreground mb-6">Tenta recarregar? (se persistir, me chama).</p>
        </div>
      </div>
    );
  }

  const empty = filtered.length === 0;

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links Compartilhados ✦ </h1>
          <p className="text-sm text-muted-foreground">Gerencie os links públicos de Artes e Projetos</p>
        </div>
        {/* O link nasce no envio da arte (passo 3 do wizard), não aqui. Esta
            página lista e gerencia; o botão leva para onde a criação existe,
            em vez de ficar escondido prometendo uma tela que não há. */}
        <Button asChild>
          <Link href="/artes">
            <Plus className="h-4 w-4 mr-2" /> Gerar link em uma arte
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, projeto, cliente ou token…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ARTE">Arte</SelectItem>
            <SelectItem value="PROJETO">Projeto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="expirado">Expirados</SelectItem>
            <SelectItem value="permanente">Permanentes</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais recente</SelectItem>
            <SelectItem value="expira_em">Data de expiração</SelectItem>
            <SelectItem value="tipo">Tipo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {empty ? (
        <EmptyState
          icon={Share2}
          title="Nenhum link encontrado"
          description={
            searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros de busca.'
              : 'Links de review são gerados ao enviar uma arte. Assim que criar o primeiro, ele aparece aqui.'
          }
          actionLabel={
            searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
              ? undefined
              : 'Ir para Artes'
          }
          onAction={
            searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
              ? undefined
              : () => router.push('/artes')
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <LinkRow
              key={l.id}
              link={l}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
              onToggleReadOnly={onToggleReadOnly}
              onToggleComment={onToggleComment}
              onToggleDownload={onToggleDownload}
              onExtendDays={onExtendDays}
              onRemoveExpiration={onRemoveExpiration}
            />
          ))}
        </div>
      )}
    </FadeIn>
  );
}
