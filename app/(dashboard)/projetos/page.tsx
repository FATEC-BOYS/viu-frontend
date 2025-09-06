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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusCircle,
  Search,
  Calendar,
  User,
  FileImage,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause
} from 'lucide-react';

// Tipos baseados no schema
interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  status: string;
  orcamento: number | null;
  prazo: string | null;
  criado_em: string;
  designer: {
    nome: string;
  };
  cliente: {
    nome: string;
  };
  artes: Array<{
    id: string;
    status: string;
  }>;
}

// Componente de Status Badge
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    'EM_ANDAMENTO': { 
      label: 'Em Andamento', 
      variant: 'default' as const,
      icon: Clock,
      color: 'text-blue-600'
    },
    'CONCLUIDO': { 
      label: 'Concluído', 
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    'PAUSADO': { 
      label: 'Pausado', 
      variant: 'secondary' as const,
      icon: Pause,
      color: 'text-yellow-600'
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || { 
    label: status, 
    variant: 'outline' as const,
    icon: AlertTriangle,
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

// Componente do Card de Projeto
function ProjetoCard({ projeto }: { projeto: Projeto }) {
  const totalArtes = projeto.artes.length;
  const artesAprovadas = projeto.artes.filter(arte => arte.status === 'APROVADO').length;
  const progresso = totalArtes > 0 ? (artesAprovadas / totalArtes) * 100 : 0;

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

  const daysUntilDeadline = getDaysUntilDeadline(projeto.prazo);
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && daysUntilDeadline >= 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{projeto.nome}</CardTitle>
            <p className="text-sm text-muted-foreground">{projeto.cliente.nome}</p>
          </div>
          <StatusBadge status={projeto.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Descrição */}
        {projeto.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {projeto.descricao}
          </p>
        )}

        {/* Progresso das Artes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <FileImage className="h-4 w-4" />
              Progresso das Artes
            </span>
            <span className="font-medium">
              {artesAprovadas}/{totalArtes}
            </span>
          </div>
          <Progress value={progresso} className="h-2" />
        </div>

        {/* Informações do Projeto */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              Designer
            </div>
            <p className="font-medium">{projeto.designer.nome}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Prazo
            </div>
            <p className={`font-medium ${
              isOverdue ? 'text-red-600' : isUrgent ? 'text-yellow-600' : ''
            }`}>
              {formatDate(projeto.prazo)}
              {isOverdue && ' (Atrasado)'}
              {isUrgent && !isOverdue && ` (${daysUntilDeadline} dias)`}
            </p>
          </div>
        </div>

        {/* Orçamento */}
        {projeto.orcamento && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">Orçamento: </span>
            <span className="font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(projeto.orcamento / 100)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [filteredProjetos, setFilteredProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('prazo');

  // Buscar projetos
  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        const { data, error } = await supabase
          .from('projetos')
          .select(`
            id,
            nome,
            descricao,
            status,
            orcamento,
            prazo,
            criado_em,
            designer:designer_id (nome),
            cliente:cliente_id (nome),
            artes (id, status)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;
        
        setProjetos(data || []);
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        setError('Não foi possível carregar os projetos.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjetos();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = projetos;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(projeto =>
        projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projeto.cliente.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(projeto => projeto.status === statusFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'prazo':
          if (!a.prazo && !b.prazo) return 0;
          if (!a.prazo) return 1;
          if (!b.prazo) return -1;
          return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'cliente':
          return a.cliente.nome.localeCompare(b.cliente.nome);
        case 'progresso':
          const progressoA = a.artes.length > 0 ? 
            (a.artes.filter(arte => arte.status === 'APROVADO').length / a.artes.length) : 0;
          const progressoB = b.artes.length > 0 ? 
            (b.artes.filter(arte => arte.status === 'APROVADO').length / b.artes.length) : 0;
          return progressoB - progressoA;
        default:
          return 0;
      }
    });

    setFilteredProjetos(filtered);
  }, [projetos, searchTerm, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando projetos...</p>
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
    total: projetos.length,
    emAndamento: projetos.filter(p => p.status === 'EM_ANDAMENTO').length,
    concluidos: projetos.filter(p => p.status === 'CONCLUIDO').length,
    pausados: projetos.filter(p => p.status === 'PAUSADO').length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus projetos de design
          </p>
        </div>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total de Projetos</p>
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
            <div className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</div>
            <p className="text-sm text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.pausados}</div>
            <p className="text-sm text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="CONCLUIDO">Concluído</SelectItem>
            <SelectItem value="PAUSADO">Pausado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prazo">Prazo</SelectItem>
            <SelectItem value="nome">Nome do Projeto</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="progresso">Progresso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Projetos */}
      {filteredProjetos.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjetos.map((projeto) => (
            <ProjetoCard key={projeto.id} projeto={projeto} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece criando seu primeiro projeto.'}
            </p>
            {!searchTerm && statusFilter === 'todos' && (
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Criar Primeiro Projeto
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}