// app/(dashboard)/dashboard/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FolderOpen, 
  PlusCircle, 
  Loader2, 
  CheckCircle,
  Clock,
  FileImage,
  MessageSquare,
  TrendingUp,
  Bell,
  Filter
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Tipos
export type Arte = {
  id: string;
  nome: string;
  status: string;
  versao: number;
  criado_em: string;
  projeto: {
    nome: string;
  } | null;
};

export type Projeto = {
  id: string;
  nome: string;
  status: string;
  prazo: string;
  cliente: {
    nome: string;
  } | null;
  artes: Arte[];
};

export type Feedback = {
  id: string;
  conteudo: string;
  criado_em: string;
  autor: {
    nome: string;
  } | null;
  arte: {
    nome: string;
  } | null;
};

export type Tarefa = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  prazo: string;
  projeto: {
    nome: string;
  } | null;
};

// Componente de Card de Métrica
function MetricCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; isPositive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {trend && (
          <div className={`flex items-center space-x-1 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="h-3 w-3" />
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de Status Badge
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    'EM_ANDAMENTO': { label: 'Em Andamento', variant: 'default' as const },
    'CONCLUIDO': { label: 'Concluído', variant: 'default' as const },
    'PAUSADO': { label: 'Pausado', variant: 'secondary' as const },
    'EM_ANALISE': { label: 'Em Análise', variant: 'outline' as const },
    'APROVADO': { label: 'Aprovado', variant: 'default' as const },
    'REJEITADO': { label: 'Rejeitado', variant: 'destructive' as const },
    'PENDENTE': { label: 'Pendente', variant: 'secondary' as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Componente Principal
export default function DashboardPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [artes, setArtes] = useState<Arte[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para métricas
  const [metricas, setMetricas] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    totalArtes: 0,
    artesAprovadas: 0,
    feedbacksPendentes: 0,
    tarefasPendentes: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Buscar projetos com cliente
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select(`
            id,
            nome,
            status,
            prazo,
            cliente:cliente_id (nome),
            artes (id, nome, status, versao)
          `);

        if (projetosError) throw projetosError;

        // Buscar artes recentes com projeto
        const { data: artesData, error: artesError } = await supabase
          .from('artes')
          .select(`
            id,
            nome,
            status,
            versao,
            criado_em,
            projeto:projeto_id (nome)
          `)
          .order('criado_em', { ascending: false })
          .limit(6);

        if (artesError) throw artesError;

        // Buscar feedbacks recentes
        const { data: feedbacksData, error: feedbacksError } = await supabase
          .from('feedbacks')
          .select(`
            id,
            conteudo,
            criado_em,
            autor:autor_id (nome),
            arte:arte_id (nome)
          `)
          .order('criado_em', { ascending: false })
          .limit(5);

        if (feedbacksError) throw feedbacksError;

        // Buscar tarefas pendentes
        const { data: tarefasData, error: tarefasError } = await supabase
          .from('tarefas')
          .select(`
            id,
            titulo,
            status,
            prioridade,
            prazo,
            projeto:projeto_id (nome)
          `)
          .in('status', ['PENDENTE', 'EM_ANDAMENTO'])
          .order('prazo', { ascending: true })
          .limit(5);

        if (tarefasError) throw tarefasError;

        // Definir dados com casting seguro
        setProjetos((projetosData as unknown as Projeto[]) || []);
        setArtes((artesData as unknown as Arte[]) || []);
        setFeedbacks((feedbacksData as unknown as Feedback[]) || []);
        setTarefas((tarefasData as unknown as Tarefa[]) || []);

        // Calcular métricas
        const totalArtes = projetosData?.reduce((acc, p) => acc + (p.artes?.length || 0), 0) || 0;
        const artesAprovadas = projetosData?.reduce((acc, p) => 
          acc + (p.artes?.filter(a => a.status === 'APROVADO').length || 0), 0) || 0;

        setMetricas({
          totalProjetos: projetosData?.length || 0,
          projetosAtivos: projetosData?.filter(p => p.status === 'EM_ANDAMENTO').length || 0,
          totalArtes,
          artesAprovadas,
          feedbacksPendentes: feedbacksData?.length || 0,
          tarefasPendentes: tarefasData?.length || 0
        });

      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setError('Não foi possível carregar os dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return formatDate(dateString);
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'ALTA': return 'text-red-600';
      case 'MEDIA': return 'text-yellow-600';
      case 'BAIXA': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral dos seus projetos e atividades
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Projetos Ativos"
          value={metricas.projetosAtivos}
          subtitle={`${metricas.totalProjetos} projetos no total`}
          icon={FolderOpen}
          trend={{ value: "+2 este mês", isPositive: true }}
        />
        <MetricCard
          title="Artes Aprovadas"
          value={metricas.artesAprovadas}
          subtitle={`${metricas.totalArtes} artes no total`}
          icon={CheckCircle}
          trend={{ value: "+5 esta semana", isPositive: true }}
        />
        <MetricCard
          title="Feedbacks Recentes"
          value={metricas.feedbacksPendentes}
          subtitle="Novos comentários"
          icon={MessageSquare}
        />
        <MetricCard
          title="Tarefas Pendentes"
          value={metricas.tarefasPendentes}
          subtitle="Aguardando conclusão"
          icon={Clock}
        />
      </div>

      {/* Grid Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Projetos Recentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderOpen className="h-5 w-5 mr-2" />
              Projetos em Andamento
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso dos seus projetos ativos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projetos.filter(p => p.status === 'EM_ANDAMENTO').slice(0, 4).map((projeto) => (
              <div key={projeto.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">{projeto.nome}</h4>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {projeto.cliente?.nome || 'N/A'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={projeto.status} />
                    <span className="text-xs text-muted-foreground">
                      {projeto.artes?.length || 0} artes
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">
                    Prazo: {formatDate(projeto.prazo)}
                  </p>
                  {projeto.artes && projeto.artes.length > 0 && (
                    <Progress 
                      value={(projeto.artes.filter(a => a.status === 'APROVADO').length / projeto.artes.length) * 100} 
                      className="w-20 h-2"
                    />
                  )}
                </div>
              </div>
            ))}
            {projetos.filter(p => p.status === 'EM_ANDAMENTO').length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum projeto em andamento
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tarefas Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Tarefas Urgentes
            </CardTitle>
            <CardDescription>
              Tarefas com prazos próximos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tarefas.map((tarefa) => (
              <div key={tarefa.id} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h5 className="font-medium text-sm">{tarefa.titulo}</h5>
                    <p className="text-xs text-muted-foreground">
                      {tarefa.projeto?.nome}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${getPrioridadeColor(tarefa.prioridade)}`}>
                    {tarefa.prioridade}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={tarefa.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(tarefa.prazo)}
                  </span>
                </div>
              </div>
            ))}
            {tarefas.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Nenhuma tarefa pendente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Artes Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileImage className="h-5 w-5 mr-2" />
              Artes Recentes
            </CardTitle>
            <CardDescription>
              Últimas artes criadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {artes.map((arte) => (
              <div key={arte.id} className="flex items-center justify-between">
                <div className="space-y-1">
                  <h5 className="font-medium text-sm">{arte.nome}</h5>
                  <p className="text-xs text-muted-foreground">
                    {arte.projeto?.nome} • v{arte.versao}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <StatusBadge status={arte.status} />
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(arte.criado_em)}
                  </p>
                </div>
              </div>
            ))}
            {artes.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Nenhuma arte encontrada
              </p>
            )}
          </CardContent>
        </Card>

        {/* Atividade Recente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Feedbacks e comentários recentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm">
                      {feedback.autor?.nome} comentou em &ldquo;{feedback.arte?.nome}&rdquo;
                    </h5>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(feedback.criado_em)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {feedback.conteudo}
                  </p>
                </div>
              </div>
            ))}
            {feedbacks.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma atividade recente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
