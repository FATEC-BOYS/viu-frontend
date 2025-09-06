// app/clientes/page.tsx
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
  UserPlus,
  Search,
  Calendar,
  Phone,
  Mail,
  FolderOpen,
  Loader2,
  User,
  Users,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  MessageSquare
} from 'lucide-react';

// Tipos baseados no schema
interface Cliente {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  projetos: Array<{
    id: string;
    nome: string;
    status: string;
    orcamento: number | null;
    prazo: string | null;
    artes: Array<{
      id: string;
      status: string;
    }>;
  }>;
}

// Componente de Badge de Status
function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge variant={ativo ? 'default' : 'secondary'} className="flex items-center gap-1">
      {ativo ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Ativo
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          Inativo
        </>
      )}
    </Badge>
  );
}

// Componente do Card de Cliente
function ClienteCard({ cliente }: { cliente: Cliente }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  // Estatísticas do cliente
  const totalProjetos = cliente.projetos.length;
  const projetosAtivos = cliente.projetos.filter(p => p.status === 'EM_ANDAMENTO').length;
  const projetosConcluidos = cliente.projetos.filter(p => p.status === 'CONCLUIDO').length;
  
  const totalArtes = cliente.projetos.reduce((acc, p) => acc + (p.artes?.length || 0), 0);
  const artesAprovadas = cliente.projetos.reduce((acc, p) => 
    acc + (p.artes?.filter(a => a.status === 'APROVADO').length || 0), 0);
  
  const orcamentoTotal = cliente.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);

  // Próximo prazo
  const proximoPrazo = cliente.projetos
    .filter(p => p.prazo && p.status === 'EM_ANDAMENTO')
    .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              {cliente.avatar ? (
                <img 
                  src={cliente.avatar} 
                  alt={cliente.nome}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold">
                  {getInitials(cliente.nome)}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{cliente.nome}</CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                {cliente.email}
              </div>
              {cliente.telefone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {cliente.telefone}
                </div>
              )}
            </div>
          </div>
          <StatusBadge ativo={cliente.ativo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas dos Projetos */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{totalProjetos}</div>
            <p className="text-xs text-muted-foreground">Projetos</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{projetosConcluidos}</div>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{projetosAtivos}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </div>
        </div>

        {/* Progresso das Artes */}
        {totalArtes > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Artes Aprovadas
              </span>
              <span className="font-medium">
                {artesAprovadas}/{totalArtes}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(artesAprovadas / totalArtes) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="space-y-2 text-sm">
          {orcamentoTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                Orçamento Total
              </span>
              <span className="font-semibold text-green-600">
                {formatCurrency(orcamentoTotal)}
              </span>
            </div>
          )}
          
          {proximoPrazo && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Próximo Prazo
              </span>
              <span className="font-medium">
                {formatDate(proximoPrazo.prazo!)}
              </span>
            </div>
          )}
        </div>

        {/* Projetos Recentes */}
        {cliente.projetos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              Projetos Recentes
            </h4>
            <div className="space-y-1">
              {cliente.projetos.slice(0, 2).map((projeto) => (
                <div key={projeto.id} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{projeto.nome}</span>
                  <Badge 
                    variant={projeto.status === 'EM_ANDAMENTO' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {projeto.status === 'EM_ANDAMENTO' ? 'Ativo' : 
                     projeto.status === 'CONCLUIDO' ? 'Concluído' : projeto.status}
                  </Badge>
                </div>
              ))}
              {cliente.projetos.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{cliente.projetos.length - 2} outros projetos
                </p>
              )}
            </div>
          </div>
        )}

        {/* Data de cadastro */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Cliente desde {formatDate(cliente.criado_em)}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('nome');

  // Buscar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select(`
            id,
            email,
            nome,
            telefone,
            avatar,
            ativo,
            criado_em,
            atualizado_em,
            projetos:projetos!cliente_id (
              id,
              nome,
              status,
              orcamento,
              prazo,
              artes (id, status)
            )
          `)
          .eq('tipo', 'CLIENTE')
          .order('nome', { ascending: true });

        if (error) throw error;
        
        setClientes(data || []);

      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        setError('Não foi possível carregar os clientes.');
      } finally {
        setLoading(false);
      }
    };

    fetchClientes();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = clientes;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cliente.telefone && cliente.telefone.includes(searchTerm)) ||
        cliente.projetos.some(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(cliente => 
        statusFilter === 'ativo' ? cliente.ativo : !cliente.ativo
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'projetos':
          return b.projetos.length - a.projetos.length;
        case 'orcamento':
          const orcamentoA = a.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
          const orcamentoB = b.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
          return orcamentoB - orcamentoA;
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        default:
          return 0;
      }
    });

    setFilteredClientes(filtered);
  }, [clientes, searchTerm, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando clientes...</p>
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
    total: clientes.length,
    ativos: clientes.filter(c => c.ativo).length,
    inativos: clientes.filter(c => !c.ativo).length,
    comProjetos: clientes.filter(c => c.projetos.length > 0).length,
    semProjetos: clientes.filter(c => c.projetos.length === 0).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus clientes e relacionamentos
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total de Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{estatisticas.inativos}</div>
            <p className="text-sm text-muted-foreground">Inativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.comProjetos}</div>
            <p className="text-sm text-muted-foreground">Com Projetos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.semProjetos}</div>
            <p className="text-sm text-muted-foreground">Sem Projetos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou projeto..."
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
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="projetos">Nº de Projetos</SelectItem>
            <SelectItem value="orcamento">Orçamento Total</SelectItem>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Clientes */}
      {filteredClientes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClientes.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece adicionando seu primeiro cliente.'}
            </p>
            {!searchTerm && statusFilter === 'todos' && (
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Cliente
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}