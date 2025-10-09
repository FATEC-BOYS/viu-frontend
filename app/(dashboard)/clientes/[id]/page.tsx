'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  AtSign,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FolderOpen,
  Mail,
  MoreHorizontal,
  Phone,
  User,
  Users,
  Plus,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

/* =========================
   Tipos
   ========================= */
type ArteStatus = 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' | 'PENDENTE' | 'RASCUNHO';
type ProjetoStatus = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PAUSADO';

type Arte = {
  id: string;
  status: ArteStatus;
};

type Projeto = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: ProjetoStatus;
  orcamento: number | null;
  prazo?: string | null;
  criado_em: string;
  artes: Arte[];
};

type Cliente = {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  tipo: 'DESIGNER' | 'CLIENTE';
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  projetos: Projeto[];
};

/* =========================
   Helpers
   ========================= */
const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatBRLFromCents = (v?: number | null) =>
  typeof v === 'number' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v / 100) : '—';

const statusPill = (s: Projeto['status']) =>
  s === 'EM_ANDAMENTO' ? (
    <Badge className="gap-1"><Circle className="h-3 w-3" /> Em andamento</Badge>
  ) : s === 'CONCLUIDO' ? (
    <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluído</Badge>
  ) : (
    <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pausado</Badge>
  );

/* =========================
   Página
   ========================= */
export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clienteId = params?.id;

  // ===== State base =====
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== Filtros locais para lista de projetos =====
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | ProjetoStatus>('todos');

  // ===== Fallback seguro para não quebrar ordem de hooks =====
  const clienteSafe: Cliente = cliente ?? {
    id: '',
    nome: '—',
    email: '',
    telefone: null,
    avatar: null,
    tipo: 'CLIENTE',
    ativo: true,
    criado_em: '',
    atualizado_em: '',
    projetos: [],
  };

  // ===== Fetch =====
  async function load() {
    if (!clienteId) return;
    setLoading(true);
    setError(null);
    try {
      // Garante sessão (evita 401 silencioso)
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user) {
        setError('Faça login para ver este cliente.');
        setCliente(null);
        return;
      }

      const SELECT = `
        id, email, nome, telefone, avatar, tipo, ativo, criado_em, atualizado_em,
        projetos:projetos!cliente_id (
          id, nome, descricao, status, orcamento, prazo, criado_em,
          artes ( id, status )
        )
      `;

      const { data, error } = await supabase.from('usuarios').select(SELECT).eq('id', clienteId).single();
      if (error) throw error;

      setCliente(data as unknown as Cliente);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível carregar o cliente.');
      setCliente(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // ===== Derivados (sempre fora de condicionais) =====
  const projetosFiltrados = useMemo(() => {
    let arr = clienteSafe.projetos ?? [];
    if (statusFilter !== 'todos') arr = arr.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.descricao ?? '').toLowerCase().includes(q)
      );
    }
    // ordena por mais recente (criado_em desc; se empatar, prazo asc)
    return [...arr].sort((a, b) => {
      const tA = new Date(a.criado_em).getTime();
      const tB = new Date(b.criado_em).getTime();
      if (tB !== tA) return tB - tA;
      const pa = a.prazo ? new Date(a.prazo).getTime() : Number.POSITIVE_INFINITY;
      const pb = b.prazo ? new Date(b.prazo).getTime() : Number.POSITIVE_INFINITY;
      return pa - pb;
    });
  }, [clienteSafe.projetos, statusFilter, search]);

  const estatisticas = useMemo(() => {
    const total = clienteSafe.projetos.length;
    const ativos = clienteSafe.projetos.filter((p) => p.status === 'EM_ANDAMENTO').length;
    const concluidos = clienteSafe.projetos.filter((p) => p.status === 'CONCLUIDO').length;
    const orcamentoTotal = clienteSafe.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
    const totalArtes = clienteSafe.projetos.reduce((acc, p) => acc + (p.artes?.length || 0), 0);
    const aprovadas = clienteSafe.projetos.reduce(
      (acc, p) => acc + (p.artes?.filter((a) => a.status === 'APROVADO').length || 0),
      0
    );
    const proxPrazo = clienteSafe.projetos
      .filter((p) => p.prazo && p.status === 'EM_ANDAMENTO')
      .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];

    return { total, ativos, concluidos, orcamentoTotal, totalArtes, aprovadas, proxPrazo };
  }, [clienteSafe.projetos]);

  // ===== Ações =====
  const toggleAtivo = async () => {
    if (!cliente) return;
    try {
      setBusy(true);
      const { error } = await supabase.from('usuarios').update({ ativo: !cliente.ativo }).eq('id', cliente.id);
      if (error) throw error;
      setCliente({ ...cliente, ativo: !cliente.ativo });
      toast.success(cliente.ativo ? 'Cliente desativado.' : 'Cliente ativado.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível alterar status.');
    } finally {
      setBusy(false);
    }
  };

  const criarProjetoRápido = async () => {
    if (!cliente) return;
    try {
      setBusy(true);
      // Descobrir designer atual a partir do auth (usuario_auth)
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Sessão expirada.');
      const { data: link, error: linkErr } = await supabase
        .from('usuario_auth')
        .select('usuario_id')
        .eq('auth_user_id', auth.user.id)
        .single();
      if (linkErr || !link) throw linkErr || new Error('Não foi possível identificar o designer.');

      const { data, error } = await supabase
        .from('projetos')
        .insert({
          nome: `Projeto de ${cliente.nome}`,
          descricao: null,
          status: 'EM_ANDAMENTO',
          orcamento: 0,
          prazo: null,
          designer_id: link.usuario_id,
          cliente_id: cliente.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      toast.success('Projeto criado!');
      router.push(`/projetos/${data!.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao criar projeto.');
    } finally {
      setBusy(false);
    }
  };

  // ===== Loading / Error =====
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-sm text-muted-foreground">Carregando cliente…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Deu ruim por aqui.</p>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={load}>Recarregar</Button>
        </div>
      </div>
    );
  }

  /* =========================
     UI
     ========================= */
  return (
    <div className="space-y-6 p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clientes"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
          </Button>
          <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
            {clienteSafe.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clienteSafe.avatar} alt={clienteSafe.nome} className="w-12 h-12 object-cover" />
            ) : (
              <span className="text-primary font-semibold">
                {clienteSafe.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{clienteSafe.nome}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {clienteSafe.email}</span>
              {clienteSafe.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {clienteSafe.telefone}</span>}
              <Badge variant={clienteSafe.ativo ? 'default' : 'secondary'} className="ml-1">
                {clienteSafe.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleAtivo} disabled={busy}>
            {clienteSafe.ativo ? 'Desativar' : 'Ativar'}
          </Button>
          <Button onClick={criarProjetoRápido} disabled={busy}>
            <Plus className="h-4 w-4 mr-1" /> Novo projeto
          </Button>
          <Button variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{estatisticas.total}</div><p className="text-sm text-muted-foreground">Projetos</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-blue-600">{estatisticas.ativos}</div><p className="text-sm text-muted-foreground">Em andamento</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-emerald-600">{estatisticas.concluidos}</div><p className="text-sm text-muted-foreground">Concluídos</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{formatBRLFromCents(estatisticas.orcamentoTotal)}</div><p className="text-sm text-muted-foreground">Orçamento total</p></CardContent></Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatDate(estatisticas.proxPrazo?.prazo ?? null)}</div>
            <p className="text-sm text-muted-foreground">Próximo prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Split view principal */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Coluna esquerda: Projetos */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" /> Projetos
                  </CardTitle>
                  <CardDescription>Trabalhos vinculados a este cliente</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block">
                    <Input
                      placeholder="Buscar projetos…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 w-[220px]"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                    <Filter className="h-4 w-4 mr-1" /> Limpar
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={statusFilter === 'todos' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('todos')}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'EM_ANDAMENTO' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('EM_ANDAMENTO')}
                >
                  Em andamento
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'CONCLUIDO' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('CONCLUIDO')}
                >
                  Concluídos
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'PAUSADO' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('PAUSADO')}
                >
                  Pausados
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projetosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nada por aqui. Que tal <button className="underline" onClick={criarProjetoRápido}>criar um projeto</button>?
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {projetosFiltrados.map((p) => {
                    const totalArtes = p.artes?.length || 0;
                    const aprovadas = p.artes?.filter((a) => a.status === 'APROVADO').length || 0;
                    return (
                      <div key={p.id} className="rounded-lg border p-4 hover:shadow-sm transition">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium truncate">{p.nome}</h4>
                          <div className="shrink-0">{statusPill(p.status)}</div>
                        </div>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao}</p>}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Prazo</span>
                            <span className="font-medium">{formatDate(p.prazo ?? null)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Orçamento</span>
                            <span className="font-semibold">{formatBRLFromCents(p.orcamento)}</span>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Aprovação</span>
                              <span className="text-xs font-medium">{aprovadas}/{totalArtes}</span>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full mt-1">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${totalArtes ? (aprovadas / totalArtes) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/projetos/${p.id}`}>Abrir <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita: Ações e infos rápidas */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
              <CardDescription>Atalhos úteis com este cliente</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={criarProjetoRápido} size="sm"><Plus className="h-4 w-4 mr-1" /> Projeto</Button>
              <Button asChild size="sm" variant="outline"><Link href={`/links?cliente=${clienteSafe.id}`}>Gerar link</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href={`/artes/nova?cliente=${clienteSafe.id}`}>Enviar arte</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link href={`/feedbacks?cliente=${clienteSafe.id}`}>Ver feedbacks</Link></Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informações</CardTitle>
              <CardDescription>Contato e registro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1"><AtSign className="h-3 w-3" /> E-mail</span>
                <span className="font-medium">{clienteSafe.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</span>
                <span className="font-medium">{clienteSafe.telefone || '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em</span>
                <span className="font-medium">{formatDateTime(clienteSafe.criado_em)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Atualizado em</span>
                <span className="font-medium">{formatDateTime(clienteSafe.atualizado_em)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bandeiras & riscos</CardTitle>
              <CardDescription>Sinais rápidos de atenção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sem projeto ativo</span>
                <Badge variant={estatisticas.ativos === 0 ? 'destructive' : 'outline'}>
                  {estatisticas.ativos === 0 ? 'Alerta' : 'Ok'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prazo em 7 dias</span>
                <Badge variant={clienteSafe.projetos.some((p) => p.prazo && new Date(p.prazo).getTime() <= Date.now() + 7 * 864e5) ? 'default' : 'outline'}>
                  {clienteSafe.projetos.some((p) => p.prazo && new Date(p.prazo).getTime() <= Date.now() + 7 * 864e5) ? 'Atenção' : '—'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Artes aprovadas</span>
                <Badge variant="outline">{estatisticas.aprovadas}/{estatisticas.totalArtes}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Abas (para crescer depois) */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumo</TabsTrigger>
          <TabsTrigger value="projetos">Projetos</TabsTrigger>
          <TabsTrigger value="timeline" disabled>Timeline</TabsTrigger>
          <TabsTrigger value="arquivos" disabled>Arquivos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do relacionamento</CardTitle>
              <CardDescription>Últimas atividades e status geral</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {estatisticas.total === 0 ? (
                <>Nenhum projeto ainda. Que tal criar o primeiro? 🙂</>
              ) : (
                <>Você tem {estatisticas.ativos} projeto(s) em andamento, {estatisticas.concluidos} concluído(s). Próximo prazo: {formatDate(estatisticas.proxPrazo?.prazo ?? null)}.</>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projetos" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clienteSafe.projetos.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{p.nome}</CardTitle>
                  <CardDescription className="flex items-center gap-2">{statusPill(p.status)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Prazo</span>
                    <span className="font-medium">{formatDate(p.prazo ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Orçamento</span>
                    <span className="font-semibold">{formatBRLFromCents(p.orcamento)}</span>
                  </div>
                  <div className="pt-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/projetos/${p.id}`}>Abrir <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {clienteSafe.projetos.length === 0 && (
              <Card className="p-10 text-center text-sm text-muted-foreground">Sem projetos.</Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
