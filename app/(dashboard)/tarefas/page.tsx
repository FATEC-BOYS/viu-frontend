// app/(dashboard)/tarefas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Calendar,
  User,
  FolderOpen,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

/* ===================== Tipos ===================== */

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA' | string;
  prazo: string | null; // ISO
  criado_em: string; // ISO
  atualizado_em: string; // ISO
  projeto: {
    nome: string;
    cliente: { nome: string };
  } | null;
  responsavel: { id: string; nome: string };
}

type SortKey = 'prazo' | 'prioridade' | 'titulo' | 'status' | 'criado_em';

/* ===== Tipos auxiliares para shape cru do Supabase (sem any) ===== */

type MaybeArray<T> = T | T[] | null | undefined;

interface RawUsuario {
  id?: unknown;
  nome?: unknown;
}
interface RawCliente {
  nome?: unknown;
}
interface RawProjeto {
  nome?: unknown;
  cliente?: MaybeArray<RawCliente>;
}
interface RawTarefaRow {
  id?: unknown;
  titulo?: unknown;
  descricao?: unknown;
  status?: unknown;
  prioridade?: unknown;
  prazo?: unknown;
  criado_em?: unknown;
  atualizado_em?: unknown;
  projeto?: MaybeArray<RawProjeto>;
  responsavel?: MaybeArray<RawUsuario>;
}

/* helper para normalizar singleton que pode vir como array */
const toOne = <T,>(val: MaybeArray<T>): T | null => {
  if (Array.isArray(val)) return (val[0] ?? null) as T | null;
  return (val ?? null) as T | null;
};

/* ===================== Badges ===================== */

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    PENDENTE: {
      label: 'Pendente',
      variant: 'secondary' as const,
      icon: Circle,
      color: 'text-yellow-600',
    },
    EM_ANDAMENTO: {
      label: 'Em Andamento',
      variant: 'default' as const,
      icon: Clock,
      color: 'text-blue-600',
    },
    CONCLUIDA: {
      label: 'Concluída',
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    CANCELADA: {
      label: 'Cancelada',
      variant: 'outline' as const,
      icon: AlertTriangle,
      color: 'text-gray-600',
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ??
    ({
      label: status,
      variant: 'outline' as const,
      icon: Circle,
      color: 'text-gray-600',
    } as const);

  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const prioridadeConfig = {
    ALTA: {
      label: 'Alta',
      icon: ArrowUp,
      color: 'bg-red-100 text-red-800 border-red-200',
    },
    MEDIA: {
      label: 'Média',
      icon: Minus,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    BAIXA: {
      label: 'Baixa',
      icon: ArrowDown,
      color: 'bg-green-100 text-green-800 border-green-200',
    },
  };

  const config =
    prioridadeConfig[prioridade as keyof typeof prioridadeConfig] ??
    ({
      label: prioridade,
      icon: Minus,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    } as const);

  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

/* ===================== Card ===================== */

function TarefaCard({ tarefa }: { tarefa: Tarefa }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem prazo';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDaysUntilDeadline = (dateString: string | null) => {
    if (!dateString) return null;
    const deadline = new Date(dateString);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilDeadline = getDaysUntilDeadline(tarefa.prazo);
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 3 && daysUntilDeadline >= 0;

  const getStatusColor = () => {
    if (tarefa.status === 'CONCLUIDA') return 'border-l-green-500';
    if (isOverdue) return 'border-l-red-500';
    if (isUrgent) return 'border-l-yellow-500';
    return 'border-l-gray-300';
  };

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{tarefa.titulo}</CardTitle>
            {tarefa.projeto && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  {tarefa.projeto.nome}
                </p>
                <p className="text-xs text-muted-foreground">Cliente: {tarefa.projeto.cliente.nome}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={tarefa.status} />
            <PrioridadeBadge prioridade={tarefa.prioridade} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-3">{tarefa.descricao}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              Responsável
            </div>
            <p className="font-medium">{tarefa.responsavel.nome}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Prazo
            </div>
            <p className={`font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : ''}`}>
              {formatDate(tarefa.prazo)}
              {isOverdue && ` (${Math.abs(daysUntilDeadline!)} dias atrasado)`}
              {isUrgent && !isOverdue && ` (${daysUntilDeadline} dias)`}
            </p>
          </div>
        </div>

        {(isOverdue || isUrgent) && (
          <div
            className={`flex items-center gap-2 p-2 rounded-md ${
              isOverdue ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{isOverdue ? 'Tarefa atrasada' : 'Prazo próximo'}</span>
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground">
          Criada em {new Date(tarefa.criado_em).toLocaleDateString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== Página ===================== */

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filteredTarefas, setFilteredTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todos');
  const [responsavelFilter, setResponsavelFilter] = useState<string>('todos'); // guarda o ID do responsável
  const [sortBy, setSortBy] = useState<SortKey>('prazo');

  // Lista de responsáveis (para filtro)
  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    const fetchTarefas = async () => {
      try {
        const { data, error } = await supabase
          .from('tarefas')
          .select(`
            id,
            titulo,
            descricao,
            status,
            prioridade,
            prazo,
            criado_em,
            atualizado_em,
            projeto:projeto_id (
              nome,
              cliente:cliente_id (nome)
            ),
            responsavel:responsavel_id (id, nome)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        const raw = (data ?? []) as RawTarefaRow[];

        // normaliza & tipa
        const rows: Tarefa[] = raw.map((r) => {
          const projeto = toOne<RawProjeto>(r.projeto);
          const cliente = toOne<RawCliente>(projeto?.cliente ?? null);
          const resp = toOne<RawUsuario>(r.responsavel);

          return {
            id: String(r.id ?? ''),
            titulo: String(r.titulo ?? ''),
            descricao: r.descricao == null ? null : String(r.descricao),
            status: String(r.status ?? '') as Tarefa['status'],
            prioridade: String(r.prioridade ?? '') as Tarefa['prioridade'],
            prazo: r.prazo == null ? null : String(r.prazo),
            criado_em: String(r.criado_em ?? ''),
            atualizado_em: String(r.atualizado_em ?? ''),
            projeto: projeto
              ? {
                  nome: String(projeto.nome ?? ''),
                  cliente: { nome: String(cliente?.nome ?? '') },
                }
              : null,
            responsavel: { id: String(resp?.id ?? ''), nome: String(resp?.nome ?? '') },
          };
        });

        setTarefas(rows);

        // Responsáveis únicos (usa ID para evitar colisão de nomes)
        const uniqueById = new Map<string, { id: string; nome: string }>();
        rows.forEach((t) => {
          if (t.responsavel.id && !uniqueById.has(t.responsavel.id)) {
            uniqueById.set(t.responsavel.id, { id: t.responsavel.id, nome: t.responsavel.nome });
          }
        });
        setResponsaveis(Array.from(uniqueById.values()));
      } catch {
        setError('Não foi possível carregar as tarefas.');
      } finally {
        setLoading(false);
      }
    };

    fetchTarefas();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = tarefas;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((tarefa) => {
        const hitTitulo = tarefa.titulo.toLowerCase().includes(q);
        const hitDesc = tarefa.descricao ? tarefa.descricao.toLowerCase().includes(q) : false;
        const hitProjeto = tarefa.projeto ? tarefa.projeto.nome.toLowerCase().includes(q) : false;
        const hitResp = tarefa.responsavel.nome.toLowerCase().includes(q);
        return hitTitulo || hitDesc || hitProjeto || hitResp;
      });
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (prioridadeFilter !== 'todos') {
      filtered = filtered.filter((t) => t.prioridade === prioridadeFilter);
    }

    if (responsavelFilter !== 'todos') {
      filtered = filtered.filter((t) => t.responsavel.id === responsavelFilter);
    }

    const ordered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'prazo': {
          const aTime = a.prazo ? new Date(a.prazo).getTime() : Infinity;
          const bTime = b.prazo ? new Date(b.prazo).getTime() : Infinity;
          return aTime - bTime;
        }
        case 'prioridade': {
          const order = { ALTA: 3, MEDIA: 2, BAIXA: 1 } as const;
          const aVal = order[a.prioridade as keyof typeof order] ?? 0;
          const bVal = order[b.prioridade as keyof typeof order] ?? 0;
          return bVal - aVal; // maior prioridade primeiro
        }
        case 'titulo':
          return a.titulo.localeCompare(b.titulo);
        case 'status': {
          const order = { PENDENTE: 1, EM_ANDAMENTO: 2, CONCLUIDA: 3, CANCELADA: 4 } as const;
          const aVal = order[a.status as keyof typeof order] ?? 0;
          const bVal = order[b.status as keyof typeof order] ?? 0;
          return aVal - bVal;
        }
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        default:
          return 0;
      }
    });

    setFilteredTarefas(ordered);
  }, [tarefas, searchTerm, statusFilter, prioridadeFilter, responsavelFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando tarefas...</p>
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
    total: tarefas.length,
    pendentes: tarefas.filter((t) => t.status === 'PENDENTE').length,
    emAndamento: tarefas.filter((t) => t.status === 'EM_ANDAMENTO').length,
    concluidas: tarefas.filter((t) => t.status === 'CONCLUIDA').length,
    atrasadas: tarefas.filter((t) => {
      if (!t.prazo) return false;
      const deadline = new Date(t.prazo);
      const today = new Date();
      return deadline < today && t.status !== 'CONCLUIDA';
    }).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie todas as tarefas dos seus projetos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total de Tarefas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.pendentes}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.emAndamento}</div>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.concluidas}</div>
            <p className="text-sm text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{estatisticas.atrasadas}</div>
            <p className="text-sm text-muted-foreground">Atrasadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tarefa, projeto ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="CONCLUIDA">Concluída</SelectItem>
            <SelectItem value="CANCELADA">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prazo">Prazo</SelectItem>
            <SelectItem value="prioridade">Prioridade</SelectItem>
            <SelectItem value="titulo">Título</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Tarefas */}
      {filteredTarefas.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTarefas.map((tarefa) => (
            <TarefaCard key={tarefa.id} tarefa={tarefa} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ||
              statusFilter !== 'todos' ||
              prioridadeFilter !== 'todos' ||
              responsavelFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece criando sua primeira tarefa.'}
            </p>
            {!searchTerm &&
              statusFilter === 'todos' &&
              prioridadeFilter === 'todos' &&
              responsavelFilter === 'todos' && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Tarefa
                </Button>
              )}
          </div>
        </Card>
      )}
    </div>
  );
}
