import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Upload,
  MessageSquare,
  CheckCircle,
  Clock,
  FileImage,
  Download,
  Share,
  MoreHorizontal,
  Play,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Users,
  Palette,
  Eye,
  Heart,
  Star,
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArtViewer from "@/components/ArtViewer";
import VersionHistory from "@/components/VersionHistory";

export default function ProjectDetail() {
  const { id } = useParams();

  const project = {
    id: 1,
    name: "Campanha Verão 2024",
    client: "Fashion Brand Co.",
    status: "em-andamento",
    progress: 75,
    deadline: "2024-02-15",
    description: "Desenvolvimento completo da campanha de verão incluindo materiais para redes sociais, impressos e website.",
    team: [
      { name: "Ana Silva", role: "Designer Principal", avatar: "AS" },
      { name: "Carlos Lima", role: "Art Director", avatar: "CL" },
    ],
    client_team: [
      { name: "Maria Santos", role: "Marketing Manager", avatar: "MS" },
      { name: "João Costa", role: "Brand Manager", avatar: "JC" },
    ],
  };

  const [arts, setArts] = useState([
    {
      id: 1,
      name: "Banner Principal Instagram",
      version: "v3",
      status: "aprovado",
      uploadDate: "2024-01-20",
      feedback: 2,
      likes: 5,
      thumbnail: "/placeholder.svg",
      url: "/placeholder.svg",
      type: "image/jpeg",
      size: 2048000,
      isMainVersion: true,
    },
    {
      id: 2,
      name: "Stories Template",
      version: "v2",
      status: "revisao",
      uploadDate: "2024-01-22",
      feedback: 3,
      likes: 2,
      thumbnail: "/placeholder.svg",
      url: "/placeholder.svg",
      type: "image/png",
      size: 1536000,
      isMainVersion: false,
    },
    {
      id: 3,
      name: "Post Carrossel",
      version: "v1",
      status: "feedback",
      uploadDate: "2024-01-25",
      feedback: 1,
      likes: 1,
      thumbnail: "/placeholder.svg",
      url: "/placeholder.svg",
      type: "image/jpeg",
      size: 3072000,
      isMainVersion: false,
    },
    {
      id: 4,
      name: "Banner Website",
      version: "v4",
      status: "aprovado",
      uploadDate: "2024-01-18",
      feedback: 4,
      likes: 8,
      thumbnail: "/placeholder.svg",
      url: "/placeholder.svg",
      type: "application/pdf",
      size: 4096000,
      isMainVersion: false,
    },
  ]);

  const [selectedArt, setSelectedArt] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const feedbacks = [
    {
      id: 1,
      author: "Maria Santos",
      role: "Cliente",
      type: "texto",
      content: "Adorei as cores vibrantes! Podemos ajustar o texto do CTA para ficar mais chamativo?",
      timestamp: "2024-01-25 14:30",
      artId: 3,
      status: "pendente",
    },
    {
      id: 2,
      author: "João Costa",
      role: "Cliente",
      type: "audio",
      content: "Áudio de 2:30min com sugestões detalhadas sobre layout",
      timestamp: "2024-01-24 16:45",
      artId: 2,
      status: "respondido",
      audioLength: "2:30",
    },
    {
      id: 3,
      author: "Ana Silva",
      role: "Designer",
      type: "texto",
      content: "Implementei as alterações sugeridas. A nova versão está disponível para aprovação.",
      timestamp: "2024-01-24 18:20",
      artId: 2,
      status: "respondido",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aprovado":
        return "bg-green-100 text-green-800";
      case "revisao":
        return "bg-orange-100 text-orange-800";
      case "feedback":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "aprovado":
        return "Aprovado";
      case "revisao":
        return "Em Revisão";
      case "feedback":
        return "Aguardando Feedback";
      default:
        return status;
    }
  };

  const handleFilesUpload = (files: any[]) => {
    const newArts = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name.replace(/\.[^/.]+$/, ""),
      version: "v1",
      status: "feedback",
      uploadDate: new Date().toISOString(),
      feedback: 0,
      likes: 0,
      thumbnail: file.preview || "/placeholder.svg",
      url: file.preview || "/placeholder.svg",
      type: file.type,
      size: file.size,
      isMainVersion: false,
    }));

    setArts(prev => [...newArts, ...prev]);
    setShowUpload(false);
  };

  const handleSetMainVersion = (artId: number) => {
    setArts(prev => prev.map(art => ({
      ...art,
      isMainVersion: art.id === artId
    })));
  };

  const handleDownloadArt = (art: any) => {
    // In a real app, this would trigger a download
    console.log('Downloading:', art.name);
  };

  const handleShareArt = (art: any) => {
    // In a real app, this would open a share dialog
    console.log('Sharing:', art.name);
  };

  const getVersionHistory = (artName: string) => {
    // Mock version history - in real app, this would come from API
    return [
      {
        id: 1,
        version: "v3",
        filename: `${artName}_v3.jpg`,
        uploadDate: "2024-01-25T10:30:00Z",
        uploadedBy: "Ana Silva",
        size: 2048000,
        type: "image/jpeg",
        url: "/placeholder.svg",
        thumbnail: "/placeholder.svg",
        isMainVersion: true,
        status: "approved" as const,
        comments: "Versão final aprovada pelo cliente",
        changes: ["Ajustado contraste", "Alterada tipografia principal", "Corrigidas cores da marca"]
      },
      {
        id: 2,
        version: "v2",
        filename: `${artName}_v2.jpg`,
        uploadDate: "2024-01-23T15:20:00Z",
        uploadedBy: "Ana Silva",
        size: 1980000,
        type: "image/jpeg",
        url: "/placeholder.svg",
        thumbnail: "/placeholder.svg",
        isMainVersion: false,
        status: "review" as const,
        comments: "Segunda iteração com feedback do cliente",
        changes: ["Alterado layout", "Adicionado call-to-action"]
      },
      {
        id: 3,
        version: "v1",
        filename: `${artName}_v1.jpg`,
        uploadDate: "2024-01-20T09:15:00Z",
        uploadedBy: "Carlos Lima",
        size: 1900000,
        type: "image/jpeg",
        url: "/placeholder.svg",
        thumbnail: "/placeholder.svg",
        isMainVersion: false,
        status: "draft" as const,
        comments: "Primeira versão - conceito inicial",
        changes: ["Criação do layout base", "Definição de cores", "Escolha da tipografia"]
      }
    ];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Viu</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/projects" className="text-sm font-medium text-foreground">
              Projetos
            </Link>
            <Link to="/clients" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Clientes
            </Link>
            <Link to="/reports" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Relatórios
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Share className="w-4 h-4" />
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback>DS</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        {/* Project Info */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <Badge variant="secondary" className={getStatusColor("em-andamento")}>
                  Em Andamento
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{project.description}</p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{project.client}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo</p>
                  <p className="font-medium">{new Date(project.deadline).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={project.progress} className="flex-1" />
                    <span className="text-sm font-medium">{project.progress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">Em Andamento</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Cronograma
              </Button>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Upload className="w-4 h-4 mr-2" />
                Upload Arte
              </Button>
            </div>
          </div>

          {/* Team Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equipe do Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.team.map((member, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equipe do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.client_team.map((member, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="arts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="arts">Artes ({arts.length})</TabsTrigger>
            <TabsTrigger value="feedbacks">Feedbacks ({feedbacks.length})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="files">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="arts" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {arts.map((art) => (
                <Card key={art.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    <div className="aspect-square bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <FileImage className="w-12 h-12 text-muted-foreground" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-sm">{art.name}</h3>
                        <p className="text-xs text-muted-foreground">{art.version}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className={getStatusColor(art.status)}>
                          {getStatusLabel(art.status)}
                        </Badge>
                        {art.isMainVersion && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{new Date(art.uploadDate).toLocaleDateString('pt-BR')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          {art.feedback}
                        </div>
                        <div className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {art.likes}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedArt(art)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadArt(art)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Baixar
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <VersionHistory
                        artName={art.name}
                        versions={getVersionHistory(art.name)}
                        onViewVersion={(version) => console.log('View version:', version)}
                        onDownloadVersion={(version) => console.log('Download version:', version)}
                        onSetMainVersion={(versionId) => console.log('Set main version:', versionId)}
                        onRestoreVersion={(versionId) => console.log('Restore version:', versionId)}
                      />

                      {!art.isMainVersion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetMainVersion(art.id)}
                          title="Definir como versão principal"
                        >
                          <Star className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Upload Card */}
              {!showUpload ? (
                <Card
                  className="border-dashed border-2 group hover:border-primary transition-colors cursor-pointer"
                  onClick={() => setShowUpload(true)}
                >
                  <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Upload Nova Arte</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Arraste seus arquivos aqui ou clique para selecionar
                    </p>
                    <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                      Selecionar Arquivos
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Upload de Arquivos</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUpload(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      onFilesUpload={handleFilesUpload}
                      projectId={project.id}
                      maxFiles={10}
                      maxSize={100}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-6">
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {feedback.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold">{feedback.author}</span>
                          <Badge variant="outline">{feedback.role}</Badge>
                          {feedback.type === "audio" && (
                            <Badge variant="secondary">
                              <Mic className="w-3 h-3 mr-1" />
                              Áudio {feedback.audioLength}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {new Date(feedback.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-3">{feedback.content}</p>
                        
                        {feedback.type === "audio" && (
                          <div className="flex items-center space-x-2 mb-3">
                            <Button variant="outline" size="sm">
                              <Play className="w-3 h-3 mr-1" />
                              Reproduzir
                            </Button>
                            <span className="text-xs text-muted-foreground">2:30</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <ThumbsUp className="w-3 h-3 mr-1" />
                            Útil
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Responder
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Timeline do projeto em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Gerenciamento de arquivos em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Art Viewer Modal */}
        <ArtViewer
          art={selectedArt}
          allArts={arts}
          open={!!selectedArt}
          onClose={() => setSelectedArt(null)}
          onSetMainVersion={handleSetMainVersion}
          onDownload={handleDownloadArt}
          onShare={handleShareArt}
        />
      </div>
    </div>
  );
}
