// app/notificacoes/page.tsx
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
  Bell,
  Search,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCheck,
  Trash2,
  Settings,
  FileImage,
  User,
  Clock,
  XCircle,
  TrendingUp
} from 'lucide-react';

// Tipos baseados no schema
interface Notificacao {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  canal: string;
  lida: boolean;
  criado_em: string;
  usuario: {
    nome: string;
  };
}

// Componente de Badge de Tipo
function TipoNotificacaoBadge({ tipo }: { tipo: string }) {
  const tipoConfig = {
    'FEEDBACK': { 
      label: 'Feedback', 
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-800 border-blue-200' 
    },
    'APROVACAO': { 
      label: 'Aprovação', 
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-800 border-green-200' 
    },
    'REJEICAO': { 
      label: 'Rejeição', 
      icon: XCircle,
      color: 'bg-red-100 text-red-800 border-red-200' 
    },
    'PRAZO': { 
      label: 'Prazo', 
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
    },
    'PROJETO': { 
      label: 'Projeto', 
      icon: FileImage,
      color: 'bg-purple-100 text-purple-800 border-purple-200' 
    },
    'SISTEMA': { 
      label: 'Sistema', 
      icon: Settings,
      color: 'bg-gray-100 text-gray-800 border-gray-200' 
    },
  };

  const config = tipoConfig[tipo as keyof typeof tipoConfig] || { 
    label: tipo, 
    icon: Bell,
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

// Componente de Badge de Canal
function CanalBadge({ canal }: { canal: string }) {
  const canalConfig = {
    'SISTEMA': { label: 'Sistema', color: 'bg-gray-100 text-gray-800' },
    'EMAIL': { label: 'Email', color: 'bg-blue-100 text-blue-800' },
    'PUSH': { label: 'Push', color: 'bg-green-100 text-green-800' },
  };

  const config = canalConfig[canal as keyof typeof canalConfig] || { 
    label: canal, 
    color: 'bg-gray-100 text-gray-800' 
  };
  
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// Componente do Card de Notificação
function NotificacaoCard({ 
  notificacao, 
  onMarkAsRead,
  onMarkAsUnread,
  onDelete 
}: { 
  notificacao: Notificacao;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const getPriorityColor = () => {
    if (notificacao.tipo === 'REJEICAO') return 'border-l-red-500';
    if (notificacao.tipo === 'PRAZO') return 'border-l-yellow-500';
    if (notificacao.tipo === 'APROVACAO') return 'border-l-green-500';
    if (notificacao.tipo === 'FEEDBACK') return 'border-l-blue-500';
    return 'border-l-gray-300';
  };

  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${getPriorityColor()} ${
      !notificacao.lida ? 'bg-blue-50/30' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              {!notificacao.lida && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
              <TipoNotificacaoBadge tipo={notificacao.tipo} />
              <CanalBadge canal={notificacao.canal} />
            </div>
            <h3 className={`font-semibold ${!notificacao.lida ? 'text-gray-900' : 'text-gray-700'}`}>
              {notificacao.titulo}
            </h3>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conteúdo da notificação */}
        <p className={`text-sm leading-relaxed ${!notificacao.lida ? 'text-gray-800' : 'text-gray-600'}`}>
          {notificacao.conteudo}
        </p>

        {/* Footer com ações */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(notificacao.criado_em)}
          </div>

          <div className="flex items-center gap-1">
            {notificacao.lida ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onMarkAsUnread(notificacao.id)}
                className="h-7 px-2"
              >
                <Circle className="h-3 w-3" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onMarkAsRead(notificacao.id)}
                className="h-7 px-2"
              >
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDelete(notificacao.id)}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [filteredNotificacoes, setFilteredNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [canalFilter, setCanalFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('criado_em');

  // Buscar notificações
  useEffect(() => {
    const fetchNotificacoes = async () => {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select(`
            id,
            titulo,
            conteudo,
            tipo,
            canal,
            lida,
            criado_em,
            usuario:usuario_id (nome)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;
        
        setNotificacoes(data || []);

      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        setError('Não foi possível carregar as notificações.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotificacoes();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = notificacoes;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(notificacao =>
        notificacao.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notificacao.conteudo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter(notificacao => notificacao.tipo === tipoFilter);
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(notificacao => 
        statusFilter === 'lida' ? notificacao.lida : !notificacao.lida
      );
    }

    // Filtro por canal
    if (canalFilter !== 'todos') {
      filtered = filtered.filter(notificacao => notificacao.canal === canalFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'titulo':
          return a.titulo.localeCompare(b.titulo);
        case 'tipo':
          return a.tipo.localeCompare(b.tipo);
        case 'status':
          return Number(a.lida) - Number(b.lida);
        default:
          return 0;
      }
    });

    setFilteredNotificacoes(filtered);
  }, [notificacoes, searchTerm, tipoFilter, statusFilter, canalFilter, sortBy]);

  // Ações
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
      
      setNotificacoes(prev => prev.map(n => 
        n.id === id ? { ...n, lida: true } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const markAsUnread = async (id: string) => {
    try {
      await supabase
        .from('notificacoes')
        .update({ lida: false })
        .eq('id', id);
      
      setNotificacoes(prev => prev.map(n => 
        n.id === id ? { ...n, lida: false } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar como não lida:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);
      
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = filteredNotificacoes
        .filter(n => !n.lida)
        .map(n => n.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('notificacoes')
          .update({ lida: true })
          .in('id', unreadIds);
        
        setNotificacoes(prev => prev.map(n => 
          unreadIds.includes(n.id) ? { ...n, lida: true } : n
        ));
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando notificações...</p>
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
    total: notificacoes.length,
    naoLidas: notificacoes.filter(n => !n.lida).length,
    lidas: notificacoes.filter(n => n.lida).length,
    feedback: notificacoes.filter(n => n.tipo === 'FEEDBACK').length,
    aprovacoes: notificacoes.filter(n => n.tipo === 'APROVACAO').length,
    prazos: notificacoes.filter(n => n.tipo === 'PRAZO').length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as atualizações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar Todas como Lidas
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.naoLidas}</div>
            <p className="text-sm text-muted-foreground">Não Lidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{estatisticas.lidas}</div>
            <p className="text-sm text-muted-foreground">Lidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.aprovacoes}</div>
            <p className="text-sm text-muted-foreground">Aprovações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{estatisticas.feedback}</div>
            <p className="text-sm text-muted-foreground">Feedbacks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.prazos}</div>
            <p className="text-sm text-muted-foreground">Prazos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou conteúdo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="FEEDBACK">Feedback</SelectItem>
            <SelectItem value="APROVACAO">Aprovação</SelectItem>
            <SelectItem value="REJEICAO">Rejeição</SelectItem>
            <SelectItem value="PRAZO">Prazo</SelectItem>
            <SelectItem value="PROJETO">Projeto</SelectItem>
            <SelectItem value="SISTEMA">Sistema</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="nao_lida">Não Lidas</SelectItem>
            <SelectItem value="lida">Lidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={canalFilter} onValueChange={setCanalFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="SISTEMA">Sistema</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="PUSH">Push</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
            <SelectItem value="titulo">Título</SelectItem>
            <SelectItem value="tipo">Tipo</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Notificações */}
      {filteredNotificacoes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotificacoes.map((notificacao) => (
            <NotificacaoCard 
              key={notificacao.id} 
              notificacao={notificacao}
              onMarkAsRead={markAsRead}
              onMarkAsUnread={markAsUnread}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos' || canalFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.' 
                : 'Você está em dia com todas as notificações!'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}