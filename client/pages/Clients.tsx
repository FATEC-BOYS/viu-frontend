import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  MessageSquare,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  FileImage,
  Settings,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Users,
  Palette,
  Bell,
  Shield,
  History,
  BarChart3,
  Download
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastActivity: string;
  projectsCount: number;
  totalRevenue: number;
  averageResponseTime: number; // in hours
  satisfactionScore: number; // 1-5
  communicationPreference: 'email' | 'phone' | 'chat' | 'whatsapp';
  timezone: string;
  permissions: {
    canViewAllProjects: boolean;
    canApproveArts: boolean;
    canInviteOthers: boolean;
    canDownloadFiles: boolean;
    canComment: boolean;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    projectUpdates: boolean;
    feedbackRequests: boolean;
  };
}

interface Project {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  budget: number;
  satisfaction?: number;
}

interface Interaction {
  id: number;
  type: 'feedback' | 'approval' | 'message' | 'meeting' | 'call';
  description: string;
  timestamp: string;
  projectId?: number;
  projectName?: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: 1,
      name: "Maria Santos",
      email: "maria@fashionbrand.com",
      phone: "+55 11 99999-9999",
      company: "Fashion Brand Co.",
      position: "Marketing Manager",
      status: "active",
      createdAt: "2024-01-15",
      lastActivity: "2024-02-01T14:30:00Z",
      projectsCount: 3,
      totalRevenue: 45000,
      averageResponseTime: 4,
      satisfactionScore: 4.8,
      communicationPreference: "email",
      timezone: "America/Sao_Paulo",
      permissions: {
        canViewAllProjects: true,
        canApproveArts: true,
        canInviteOthers: false,
        canDownloadFiles: true,
        canComment: true,
      },
      notificationSettings: {
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        feedbackRequests: true,
      }
    },
    {
      id: 2,
      name: "João Costa",
      email: "joao@techstartup.com",
      phone: "+55 11 88888-8888",
      company: "Tech Startup",
      position: "Brand Manager",
      status: "active",
      createdAt: "2024-01-10",
      lastActivity: "2024-01-30T16:45:00Z",
      projectsCount: 2,
      totalRevenue: 28000,
      averageResponseTime: 2,
      satisfactionScore: 5.0,
      communicationPreference: "chat",
      timezone: "America/Sao_Paulo",
      permissions: {
        canViewAllProjects: true,
        canApproveArts: true,
        canInviteOthers: true,
        canDownloadFiles: true,
        canComment: true,
      },
      notificationSettings: {
        emailNotifications: false,
        pushNotifications: true,
        projectUpdates: true,
        feedbackRequests: true,
      }
    }
  ]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // New client form state
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    communicationPreference: "email" as const,
    timezone: "America/Sao_Paulo",
  });

  // Mock data for selected client
  const getClientProjects = (clientId: number): Project[] => {
    return [
      {
        id: 1,
        name: "Campanha Verão 2024",
        status: "em-andamento",
        startDate: "2024-01-15",
        budget: 15000,
        satisfaction: 5,
      },
      {
        id: 2,
        name: "Rebranding Completo",
        status: "concluido",
        startDate: "2023-12-01",
        endDate: "2024-01-10",
        budget: 25000,
        satisfaction: 4.8,
      }
    ];
  };

  const getClientInteractions = (clientId: number): Interaction[] => {
    return [
      {
        id: 1,
        type: "feedback",
        description: "Forneceu feedback detalhado sobre o banner principal",
        timestamp: "2024-02-01T14:30:00Z",
        projectId: 1,
        projectName: "Campanha Verão 2024",
      },
      {
        id: 2,
        type: "approval",
        description: "Aprovou a versão final do logo",
        timestamp: "2024-01-30T16:45:00Z",
        projectId: 2,
        projectName: "Rebranding Completo",
      },
      {
        id: 3,
        type: "message",
        description: "Enviou mensagem sobre ajustes na campanha",
        timestamp: "2024-01-29T10:15:00Z",
        projectId: 1,
        projectName: "Campanha Verão 2024",
      }
    ];
  };

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           client.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "company":
          return (a.company || "").localeCompare(b.company || "");
        case "lastActivity":
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "satisfaction":
          return b.satisfactionScore - a.satisfactionScore;
        default:
          return 0;
      }
    });

  const handleAddClient = () => {
    const client: Client = {
      id: Date.now(),
      ...newClient,
      status: "pending",
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      projectsCount: 0,
      totalRevenue: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      permissions: {
        canViewAllProjects: true,
        canApproveArts: true,
        canInviteOthers: false,
        canDownloadFiles: true,
        canComment: true,
      },
      notificationSettings: {
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        feedbackRequests: true,
      }
    };

    setClients(prev => [client, ...prev]);
    setShowAddDialog(false);
    setNewClient({
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      communicationPreference: "email",
      timezone: "America/Sao_Paulo",
    });
  };

  const updateClientPermissions = (clientId: number, permissions: Partial<Client['permissions']>) => {
    setClients(prev => prev.map(client => 
      client.id === clientId 
        ? { ...client, permissions: { ...client.permissions, ...permissions }}
        : client
    ));
  };

  const updateClientNotifications = (clientId: number, settings: Partial<Client['notificationSettings']>) => {
    setClients(prev => prev.map(client => 
      client.id === clientId 
        ? { ...client, notificationSettings: { ...client.notificationSettings, ...settings }}
        : client
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "inactive":
        return "Inativo";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case "feedback":
        return MessageSquare;
      case "approval":
        return CheckCircle;
      case "message":
        return MessageSquare;
      case "meeting":
        return Calendar;
      case "call":
        return Phone;
      default:
        return MessageSquare;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navbar status="authenticated" />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gerenciamento de Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie informações, permissões e histórico de interações com seus clientes
            </p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="mt-4 lg:mt-0 bg-gradient-primary hover:opacity-90">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Cadastre um novo cliente e configure suas permissões
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Empresa</Label>
                    <Input
                      id="company"
                      value={newClient.company}
                      onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={newClient.position}
                    onChange={(e) => setNewClient(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Marketing Manager"
                  />
                </div>
                
                <div>
                  <Label htmlFor="communication">Preferência de Comunicação</Label>
                  <Select 
                    value={newClient.communicationPreference} 
                    onValueChange={(value: any) => setNewClient(prev => ({ ...prev, communicationPreference: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddClient}
                    disabled={!newClient.name || !newClient.email}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    Adicionar Cliente
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground">
                {clients.filter(c => c.status === 'active').length} ativos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {clients.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                De todos os projetos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(clients.reduce((sum, c) => sum + c.satisfactionScore, 0) / clients.length).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avaliação geral dos clientes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(clients.reduce((sum, c) => sum + c.averageResponseTime, 0) / clients.length)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo médio de resposta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="company">Empresa</SelectItem>
              <SelectItem value="lastActivity">Atividade</SelectItem>
              <SelectItem value="revenue">Receita</SelectItem>
              <SelectItem value="satisfaction">Satisfação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Clients List */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <Card 
                  key={client.id} 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedClient?.id === client.id && "border-primary"
                  )}
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={client.avatar} />
                        <AvatarFallback>
                          {client.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">{client.name}</h3>
                          <Badge variant="secondary" className={getStatusColor(client.status)}>
                            {getStatusLabel(client.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate">
                          {client.company} • {client.position}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                          <span>{client.projectsCount} projetos</span>
                          <span>
                            {formatDistanceToNow(new Date(client.lastActivity), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Client Details */}
          <div className="lg:col-span-2">
            {!selectedClient ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Selecione um cliente</h3>
                  <p className="text-muted-foreground">
                    Clique em um cliente da lista para ver seus detalhes e gerenciar permissões.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="projects">Projetos</TabsTrigger>
                    <TabsTrigger value="interactions">Histórico</TabsTrigger>
                    <TabsTrigger value="permissions">Permissões</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <TabsContent value="overview" className="space-y-6">
                  {/* Client Info Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={selectedClient.avatar} />
                          <AvatarFallback className="text-lg">
                            {selectedClient.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                          <p className="text-muted-foreground">
                            {selectedClient.position} • {selectedClient.company}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="secondary" className={getStatusColor(selectedClient.status)}>
                              {getStatusLabel(selectedClient.status)}
                            </Badge>
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="ml-1 text-sm font-medium">
                                {selectedClient.satisfactionScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">E-mail</p>
                          <p className="font-medium">{selectedClient.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Telefone</p>
                          <p className="font-medium">{selectedClient.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Comunicação</p>
                          <p className="font-medium capitalize">{selectedClient.communicationPreference}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cliente desde</p>
                          <p className="font-medium">
                            {format(new Date(selectedClient.createdAt), "MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedClient.projectsCount}
                        </div>
                        <p className="text-sm text-muted-foreground">Projetos</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          R$ {selectedClient.totalRevenue.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-sm text-muted-foreground">Receita Total</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {selectedClient.averageResponseTime}h
                        </div>
                        <p className="text-sm text-muted-foreground">Tempo Resposta</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {selectedClient.satisfactionScore.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">Satisfação</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Projetos do Cliente</h3>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {getClientProjects(selectedClient.id).map((project) => (
                      <Card key={project.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{project.name}</h4>
                            <Badge variant="secondary">
                              {project.status === 'em-andamento' ? 'Em Andamento' : 'Concluído'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Início:</span>
                              <p>{format(new Date(project.startDate), "dd/MM/yyyy")}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Orçamento:</span>
                              <p>R$ {project.budget.toLocaleString('pt-BR')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Satisfação:</span>
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="ml-1">{project.satisfaction}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="interactions" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Histórico de Interações</h3>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrar
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {getClientInteractions(selectedClient.id).map((interaction) => {
                      const IconComponent = getInteractionIcon(interaction.type);
                      
                      return (
                        <Card key={interaction.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{interaction.description}</p>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>
                                    {formatDistanceToNow(new Date(interaction.timestamp), { 
                                      addSuffix: true, 
                                      locale: ptBR 
                                    })}
                                  </span>
                                  {interaction.projectName && (
                                    <>
                                      <span>•</span>
                                      <span>{interaction.projectName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="permissions" className="space-y-6">
                  {/* Permissions Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Permissões do Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(selectedClient.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">
                              {key === 'canViewAllProjects' && 'Visualizar todos os projetos'}
                              {key === 'canApproveArts' && 'Aprovar artes'}
                              {key === 'canInviteOthers' && 'Convidar outros usuários'}
                              {key === 'canDownloadFiles' && 'Baixar arquivos'}
                              {key === 'canComment' && 'Adicionar comentários'}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {key === 'canViewAllProjects' && 'Permite ver todos os projetos da conta'}
                              {key === 'canApproveArts' && 'Pode aprovar ou rejeitar artes'}
                              {key === 'canInviteOthers' && 'Convidar novos membros para projetos'}
                              {key === 'canDownloadFiles' && 'Fazer download de arquivos e artes'}
                              {key === 'canComment' && 'Deixar comentários e feedback'}
                            </p>
                          </div>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => 
                              updateClientPermissions(selectedClient.id, { [key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Notification Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Configurações de Notificação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(selectedClient.notificationSettings).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <label className="font-medium">
                              {key === 'emailNotifications' && 'Notificações por e-mail'}
                              {key === 'pushNotifications' && 'Notificações push'}
                              {key === 'projectUpdates' && 'Atualizações de projetos'}
                              {key === 'feedbackRequests' && 'Solicitações de feedback'}
                            </label>
                            <p className="text-sm text-muted-foreground">
                              {key === 'emailNotifications' && 'Receber notificações por e-mail'}
                              {key === 'pushNotifications' && 'Notificações instantâneas no navegador'}
                              {key === 'projectUpdates' && 'Ser notificado sobre mudanças nos projetos'}
                              {key === 'feedbackRequests' && 'Receber pedidos de feedback e aprovação'}
                            </p>
                          </div>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) => 
                              updateClientNotifications(selectedClient.id, { [key]: checked })
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
