import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/Navbar" 
import {
  Bell,
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
  Archive,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  RefreshCw,
} from "lucide-react";
import NewProjectModal from "@/components/NewProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import ProjectSearch from "@/components/ProjectSearch";

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  progress: number;
  deadline: string;
  feedbacks: number;
  arts: number;
  avatar: string;
  color: string;
  description?: string;
  budget?: string;
  scope?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([
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
      description: "Campanha completa de verão com foco em redes sociais",
      budget: "15000",
      scope: "Social media, impressos, banners web",
      tags: ["Social Media", "Campanha", "Verão"],
      createdAt: "2024-01-10",
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
      description: "Redesign completo da identidade visual",
      budget: "8000",
      scope: "Logo, tipografia, paleta de cores",
      tags: ["Branding", "Logo", "Identidade"],
      createdAt: "2024-01-05",
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
      description: "Cardápio e material promocional",
      budget: "3500",
      scope: "Cardápio, flyers, banners",
      tags: ["Print", "Restaurante", "Menu"],
      createdAt: "2024-01-15",
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
      description: "Design completo do e-commerce",
      budget: "25000",
      scope: "UI/UX, protótipos, sistema de design",
      tags: ["Web Design", "E-commerce", "UX/UI"],
      createdAt: "2024-01-08",
    },
  ]);

  const [filteredProjects, setFilteredProjects] = useState<Project[]>(projects);
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    let filtered = activeTab === 'active' ? projects : archivedProjects;
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortBy as keyof Project];
      let bValue: any = b[sortBy as keyof Project];
      
      if (sortBy === 'deadline' || sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredProjects(filtered);
  }, [projects, archivedProjects, sortBy, sortOrder, activeTab]);

  const handleProjectCreate = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setEditProject(null);
  };

  const handleProjectArchive = (projectId: number) => {
    const projectToArchive = projects.find(p => p.id === projectId);
    if (projectToArchive) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setArchivedProjects(prev => [...prev, { ...projectToArchive, status: 'arquivado' }]);
    }
    setEditProject(null);
  };

  const handleProjectDelete = (projectId: number) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
    setEditProject(null);
  };

  const handleSearch = (filters: any) => {
    let filtered = activeTab === 'active' ? projects : archivedProjects;

    if (filters.keyword) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        p.description?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        p.client.toLowerCase().includes(filters.keyword.toLowerCase())
      );
    }

    if (filters.client) {
      filtered = filtered.filter(p => p.client === filters.client);
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => 
        filters.tags.some((tag: string) => p.tags?.includes(tag))
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(p => new Date(p.deadline) >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter(p => new Date(p.deadline) <= filters.endDate);
    }

    if (filters.budget.min) {
      filtered = filtered.filter(p => 
        p.budget ? parseFloat(p.budget) >= parseFloat(filters.budget.min) : true
      );
    }

    if (filters.budget.max) {
      filtered = filtered.filter(p => 
        p.budget ? parseFloat(p.budget) <= parseFloat(filters.budget.max) : true
      );
    }

    setFilteredProjects(filtered);
  };

  const handleClearFilters = () => {
    setFilteredProjects(activeTab === 'active' ? projects : archivedProjects);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "em-andamento":
        return "bg-blue-100 text-blue-800";
      case "aprovacao":
        return "bg-green-100 text-green-800";
      case "revisao":
        return "bg-orange-100 text-orange-800";
      case "pausado":
        return "bg-gray-100 text-gray-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "arquivado":
        return "bg-gray-100 text-gray-600";
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
      case "pausado":
        return "Pausado";
      case "concluido":
        return "Concluído";
      case "arquivado":
        return "Arquivado";
      default:
        return status;
    }
  };

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={project.color}>
                {project.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link to={`/project/${project.id}`}>
                <h3 className="font-semibold truncate hover:text-primary cursor-pointer">
                  {project.name}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground">{project.client}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setEditProject(project)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="w-3 h-3 mr-1" />
            <span className="text-xs">
              {new Date(project.deadline).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <MessageSquare className="w-3 h-3 mr-1" />
            <span className="text-xs">{project.feedbacks}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <FileImage className="w-3 h-3 mr-1" />
            <span className="text-xs">{project.arts}</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ProjectListItem = ({ project }: { project: Project }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback className={project.color}>
              {project.avatar}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <Link to={`/project/${project.id}`}>
                <h3 className="font-semibold truncate hover:text-primary cursor-pointer">
                  {project.name}
                </h3>
              </Link>
              <Badge variant="secondary" className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{project.client}</p>
            
            <div className="flex items-center space-x-6 text-xs text-muted-foreground mb-3">
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
              {project.budget && (
                <div>R$ {parseFloat(project.budget).toLocaleString('pt-BR')}</div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditProject(project)}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
    <Navbar status="authenticated" />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gerenciamento de Projetos</h1>
            <p className="text-muted-foreground">
              Organize, gerencie e acompanhe todos os seus projetos criativos
            </p>
          </div>
          <NewProjectModal onProjectCreate={handleProjectCreate} />
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <ProjectSearch onSearch={handleSearch} onClearFilters={handleClearFilters} />
        </div>

        {/* Tabs and Controls */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">
                Ativos ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Arquivados ({archivedProjects.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              {/* Sort Controls */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Prazo</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="progress">Progresso</SelectItem>
                  <SelectItem value="createdAt">Data de Criação</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>

              {/* View Mode Toggle */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value="active" className="space-y-6">
            {filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileImage className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Nenhum projeto encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro projeto ou ajuste os filtros de busca.
                  </p>
                  <NewProjectModal onProjectCreate={handleProjectCreate} />
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filteredProjects.map((project) => 
                  viewMode === 'grid' ? (
                    <ProjectCard key={project.id} project={project} />
                  ) : (
                    <ProjectListItem key={project.id} project={project} />
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived" className="space-y-6">
            {archivedProjects.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Archive className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Nenhum projeto arquivado</h3>
                  <p className="text-muted-foreground">
                    Projetos arquivados aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filteredProjects.map((project) => 
                  viewMode === 'grid' ? (
                    <ProjectCard key={project.id} project={project} />
                  ) : (
                    <ProjectListItem key={project.id} project={project} />
                  )
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Project Modal */}
      <EditProjectModal
        project={editProject}
        open={!!editProject}
        onClose={() => setEditProject(null)}
        onProjectUpdate={handleProjectUpdate}
        onProjectArchive={handleProjectArchive}
        onProjectDelete={handleProjectDelete}
      />
    </div>
  );
}
