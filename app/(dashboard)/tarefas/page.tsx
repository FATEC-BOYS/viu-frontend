// app/tarefas/page.tsx
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
  Minus
} from 'lucide-react';

// Tipos baseados no schema
interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  prazo: string | null;
  criado_em: string;
  atualizado_em: string;
  projeto: {
    nome: string;
    cliente: {
      nome: string;
    };
  } | null;
  responsavel: {
    nome: string;
  };
}

// Componente de Status Badge
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    'PENDENTE': { 
      label: 'Pendente', 
      variant: 'secondary' as const,
      icon: Circle,
      color: 'text-yellow-600'
    },
    'EM_ANDAMENTO': { 
      label: 'Em Andamento', 
      variant: 'default' as const,
      icon: Clock,
      color: 'text-blue-600'
    },
    'CONCLUIDA': { 
      label: 'Concluída', 
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    'CANCELADA': { 
      label: 'Cancelada', 
      variant: 'outline' as const,
      icon: AlertTriangle,
      color: 'text-gray-600'
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || { 
    label: status, 
    variant: 'outline' as const,
    icon: Circle,
    color: 'text-gray-600'
  };
  
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Componente de Badge de Prioridade
function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const prioridadeConfig = {
    'ALTA': { 
      label: 'Alta', 
      icon: ArrowUp,
      color: 'bg-red-100 text-red-800 border-red-200' 
    },
    'MEDIA': { 
      label: 'Média', 
      icon: Minus,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
    },
    'BAIXA': { 
      label: 'Baixa', 
      icon: ArrowDown,
      color: 'bg-green-100 text-green-800 border-green-200' 
    },
  };

  const config = prioridadeConfig[prioridade as keyof typeof prioridadeConfig] || { 
    label: prioridade, 
    icon: Minus,
    color: 'bg-gray-100 text-gray-800 border-gray-200' 
  };
  
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// Componente do Card de Tarefa
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
                <p className="text-xs text-muted-foreground">
                  Cliente: {tarefa.projeto.cliente.nome}
                </p>
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
        {/* Descrição */}
        {tarefa.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {tarefa.descricao}
          </p>
        )}

        {/* Informações da tarefa */}
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
            <p className={`font-medium ${
              isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : ''
            }`}>
              {formatDate(tarefa.prazo)}
              {isOverdue && ` (${Math.abs(daysUntilDeadline!)} dias atrasado)`}
              {isUrgent && !isOverdue && ` (${daysUntilDeadline} dias)`}
            </p>
          </div>
        </div>

        {/* Alertas de prazo */}
        {(isOverdue || isUrgent) && (
          <div className={`flex items-center gap-2 p-2 rounded-md ${
            isOverdue ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
          }`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isOverdue ? 'Tarefa atrasada' : 'Prazo próximo'}
            </span>
          </div>
        )}

        {/* Data de criação */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Criada em {formatDate(tarefa.criado_em)}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filteredTarefas, setFilteredTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todos');
  const [responsavelFilter, setResponsavelFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('prazo');

  // Listas para filtros
  const [responsaveis, setResponsaveis] = useState<Array<{id: string, nome: string}>>([]);

  // Buscar tarefas
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
            responsavel:responsavel_id (nome)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;
        
        setTarefas(data || []);

        // Extrair responsáveis únicos para filtro
        const responsaveisUnicos = [...new Set(data?.map(tarefa => tarefa.responsavel) || [])]
          .map((responsavel, index) => ({ id: index.toString(), nome: responsavel.nome }));
        setResponsaveis(responsaveisUnicos);

      } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
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

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(tarefa =>
        tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tarefa.descricao && tarefa.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tarefa.projeto && tarefa.projeto.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tarefa.responsavel.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(tarefa => tarefa.status === statusFilter);
    }

    // Filtro por prioridade
    if (prioridadeFilter !== 'todos') {
      filtered = filtered.filter(tarefa => tarefa.prioridade === prioridadeFilter);
    }

    // Filtro por responsável
    if (responsavelFilter !== 'todos') {
      filtered = filtered.filter(tarefa => tarefa.responsavel.nome === responsavelFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'prazo':
          if (!a.prazo && !b.prazo) return 0;
          if (!a.prazo) return 1;
          if (!b.prazo) return -1;
          return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
        case 'prioridade':
          const prioridadeOrder = { 'ALTA': 3, 'MEDIA': 2, 'BAIXA': 1 };
          return (prioridadeOrder[b.prioridade as keyof typeof prioridadeOrder] || 0) - 
                 (prioridadeOrder[a.prioridade as keyof typeof prioridadeOrder] || 0);
        case 'titulo':
          return a.titulo.localeCompare(b.titulo);
        case 'status':
          const statusOrder = { 'PENDENTE': 1, 'EM_ANDAMENTO': 2, 'CONCLUIDA': 3, 'CANCELADA': 4 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 0) - 
                 (statusOrder[b.status as keyof typeof statusOrder] || 0);
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        default:
          return 0;
      }
    });

    setFilteredTarefas(filtered);
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
    pendentes: tarefas.filter(t => t.status === 'PENDENTE').length,
    emAndamento: tarefas.filter(t => t.status === 'EM_ANDAMENTO').length,
    concluidas: tarefas.filter(t => t.status === 'CONCLUIDA').length,
    atrasadas: tarefas.filter(t => {
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
          <p className="text-muted-foreground">
            Gerencie todas as tarefas dos seus projetos
          </p>
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
            {responsaveis.map(responsavel => (
              <SelectItem key={responsavel.id} value={responsavel.nome}>{responsavel.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
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
              {searchTerm || statusFilter !== 'todos' || prioridadeFilter !== 'todos' || responsavelFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece criando sua primeira tarefa.'}
            </p>
            {!searchTerm && statusFilter === 'todos' && prioridadeFilter === 'todos' && responsavelFilter === 'todos' && (
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