import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Navbar } from "@/components/Navbar" 
import {
  Bell,
  Plus,
  Calendar,
  Clock,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  FileImage,
  Users,
  TrendingUp,
  Filter,
  Search,
  MoreHorizontal,
  Palette,
} from "lucide-react";
import NewProjectModal from "@/components/NewProjectModal";

export default function Dashboard() {
  const projects = [
    {
      id: 1,
      name: "Campanha Verão 2024",
      client: "Fashion Brand Co.",
      status: "em-andamento",
      progress: 75,
      deadline: "2024-02-15",
      feedbacks: 3,
      arts: 12,
      avatar: "FB",
      color: "bg-blue-500",
    },
    {
      id: 2,
      name: "Rebranding Logo",
      client: "Tech Startup",
      status: "aprovacao",
      progress: 90,
      deadline: "2024-02-10",
      feedbacks: 1,
      arts: 5,
      avatar: "TS",
      color: "bg-green-500",
    },
    {
      id: 3,
      name: "Material Gráfico",
      client: "Local Restaurant",
      status: "revisao",
      progress: 40,
      deadline: "2024-02-20",
      feedbacks: 5,
      arts: 8,
      avatar: "LR",
      color: "bg-orange-500",
    },
    {
      id: 4,
      name: "Website Design",
      client: "E-commerce Store",
      status: "em-andamento",
      progress: 60,
      deadline: "2024-02-25",
      feedbacks: 2,
      arts: 15,
      avatar: "ES",
      color: "bg-purple-500",
    },
  ];

  const recentFeedbacks = [
    {
      project: "Campanha Verão 2024",
      client: "Maria Silva",
      message: "Adorei as cores! Podemos ajustar o texto principal?",
      time: "2 horas atrás",
      type: "texto",
    },
    {
      project: "Rebranding Logo",
      client: "João Santos",
      message: "Versão final aprovada! Parabéns pelo trabalho.",
      time: "4 horas atrás",
      type: "aprovacao",
    },
    {
      project: "Material Gráfico",
      client: "Ana Costa",
      message: "Áudio de 2:30min com sugestões detalhadas",
      time: "1 dia atrás",
      type: "audio",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "em-andamento":
        return "bg-blue-100 text-blue-800";
      case "aprovacao":
        return "bg-green-100 text-green-800";
      case "revisao":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "em-andamento":
        return "Em Andamento";
      case "aprovacao":
        return "Aguardando Aprovação";
      case "revisao":
        return "Em Revisão";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background">
    <Navbar status="authenticated" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral dos seus projetos e atividades recentes
            </p>
          </div>
          <NewProjectModal onProjectCreate={(project) => console.log('New project:', project)} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
              <FileImage className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +2 desde o mês passado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feedbacks Pendentes</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                -3 desde ontem
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovações</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +12% este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtividade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89%</div>
              <p className="text-xs text-muted-foreground">
                +5% desde a semana passada
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Projects List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Projetos Recentes</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.map((project) => (
                  <Link key={project.id} to={`/project/${project.id}`}>
                    <div className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className={project.color}>
                          {project.avatar}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <Badge variant="secondary" className={getStatusColor(project.status)}>
                            {getStatusLabel(project.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{project.client}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(project.deadline).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {project.feedbacks} feedbacks
                          </div>
                          <div className="flex items-center">
                            <FileImage className="w-3 h-3 mr-1" />
                            {project.arts} artes
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Feedbacks */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feedbacks Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentFeedbacks.map((feedback, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{feedback.client}</p>
                        <p className="text-xs text-muted-foreground">{feedback.project}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {feedback.type === "audio" && <div className="w-2 h-2 bg-orange-500 rounded-full" />}
                        {feedback.type === "aprovacao" && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {feedback.type === "texto" && <MessageSquare className="w-3 h-3 text-blue-500" />}
                      </div>
                    </div>
                    <p className="text-sm">{feedback.message}</p>
                    <p className="text-xs text-muted-foreground">{feedback.time}</p>
                    {index < recentFeedbacks.length - 1 && <div className="border-b" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Projeto
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Convidar Cliente
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileImage className="w-4 h-4 mr-2" />
                  Upload de Artes
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Calendário
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos Prazos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Rebranding Logo</p>
                    <p className="text-xs text-muted-foreground">Amanhã</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Campanha Verão</p>
                    <p className="text-xs text-muted-foreground">Em 3 dias</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Material Gráfico</p>
                    <p className="text-xs text-muted-foreground">Em 1 semana</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
