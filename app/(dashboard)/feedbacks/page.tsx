// app/feedbacks/page.tsx
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
  MessageSquare,
  Search,
  Calendar,
  User,
  FileImage,
  Loader2,
  Mic,
  Type,
  MapPin,
  Play,
  Pause,
  Download,
  Reply,
  Eye,
  Volume2
} from 'lucide-react';

// Tipos baseados no schema
interface Feedback {
  id: string;
  conteudo: string;
  tipo: string;
  arquivo: string | null;
  posicao_x: number | null;
  posicao_y: number | null;
  criado_em: string;
  arte: {
    nome: string;
    projeto: {
      nome: string;
      cliente: {
        nome: string;
      };
    };
  };
  autor: {
    nome: string;
    tipo: string;
  };
}

// Componente de Badge de Tipo
function TipoBadge({ tipo }: { tipo: string }) {
  const tipoConfig = {
    'TEXTO': { 
      label: 'Texto', 
      icon: Type,
      color: 'bg-blue-100 text-blue-800 border-blue-200' 
    },
    'AUDIO': { 
      label: 'Áudio', 
      icon: Mic,
      color: 'bg-purple-100 text-purple-800 border-purple-200' 
    },
  };

  const config = tipoConfig[tipo as keyof typeof tipoConfig] || { 
    label: tipo, 
    icon: MessageSquare,
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

// Componente de Player de Áudio
function AudioPlayer({ arquivo }: { arquivo: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio(arquivo));

  const togglePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Cleanup do áudio quando o componente é desmontado
  useState(() => {
    const currentAudio = audio;
    currentAudio.addEventListener('ended', () => setIsPlaying(false));
    
    return () => {
      currentAudio.removeEventListener('ended', () => setIsPlaying(false));
      currentAudio.pause();
    };
  });

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlay}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      <div className="flex-1 flex items-center gap-2">
        <Volume2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Clique para reproduzir</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => window.open(arquivo, '_blank')}
      >
        <Download className="h-3 w-3" />
      </Button>
    </div>
  );
}

// Componente do Card de Feedback
function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isClient = feedback.autor.tipo === 'CLIENTE';
  const hasPosition = feedback.posicao_x !== null && feedback.posicao_y !== null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <TipoBadge tipo={feedback.tipo} />
              {hasPosition && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Posicionado
                </Badge>
              )}
              <Badge variant={isClient ? 'default' : 'secondary'}>
                {isClient ? 'Cliente' : 'Designer'}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{feedback.arte.nome}</h3>
              <p className="text-xs text-muted-foreground">
                {feedback.arte.projeto.nome} • {feedback.arte.projeto.cliente.nome}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conteúdo do Feedback */}
        <div className="space-y-3">
          {/* Texto do feedback */}
          {feedback.conteudo && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm leading-relaxed">{feedback.conteudo}</p>
            </div>
          )}

          {/* Player de áudio se houver arquivo */}
          {feedback.arquivo && feedback.tipo === 'AUDIO' && (
            <AudioPlayer arquivo={feedback.arquivo} />
          )}

          {/* Informações de posição */}
          {hasPosition && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                Posição: X:{Math.round(feedback.posicao_x!)} Y:{Math.round(feedback.posicao_y!)}
              </span>
            </div>
          )}
        </div>

        {/* Autor e Data */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{feedback.autor.nome}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(feedback.criado_em)}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Reply className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [autorFilter, setAutorFilter] = useState<string>('todos');
  const [projetoFilter, setProjetoFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('criado_em');

  // Listas para filtros
  const [projetos, setProjetos] = useState<Array<{id: string, nome: string}>>([]);

  // Buscar feedbacks
  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .select(`
            id,
            conteudo,
            tipo,
            arquivo,
            posicao_x,
            posicao_y,
            criado_em,
            arte:arte_id (
              nome,
              projeto:projeto_id (
                nome,
                cliente:cliente_id (nome)
              )
            ),
            autor:autor_id (nome, tipo)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;
        
        setFeedbacks(data || []);

        // Extrair projetos únicos para filtro
        const projetosUnicos = [...new Set(data?.map(feedback => feedback.arte.projeto) || [])]
          .map((projeto, index) => ({ id: index.toString(), nome: projeto.nome }));
        setProjetos(projetosUnicos);

      } catch (error) {
        console.error('Erro ao buscar feedbacks:', error);
        setError('Não foi possível carregar os feedbacks.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = feedbacks;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(feedback =>
        feedback.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.arte.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.arte.projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.autor.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter(feedback => feedback.tipo === tipoFilter);
    }

    // Filtro por autor
    if (autorFilter !== 'todos') {
      filtered = filtered.filter(feedback => feedback.autor.tipo === autorFilter);
    }

    // Filtro por projeto
    if (projetoFilter !== 'todos') {
      filtered = filtered.filter(feedback => feedback.arte.projeto.nome === projetoFilter);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'arte':
          return a.arte.nome.localeCompare(b.arte.nome);
        case 'projeto':
          return a.arte.projeto.nome.localeCompare(b.arte.projeto.nome);
        case 'autor':
          return a.autor.nome.localeCompare(b.autor.nome);
        default:
          return 0;
      }
    });

    setFilteredFeedbacks(filtered);
  }, [feedbacks, searchTerm, tipoFilter, autorFilter, projetoFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando feedbacks...</p>
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
    total: feedbacks.length,
    texto: feedbacks.filter(f => f.tipo === 'TEXTO').length,
    audio: feedbacks.filter(f => f.tipo === 'AUDIO').length,
    clientes: feedbacks.filter(f => f.autor.tipo === 'CLIENTE').length,
    designers: feedbacks.filter(f => f.autor.tipo === 'DESIGNER').length,
    posicionados: feedbacks.filter(f => f.posicao_x !== null && f.posicao_y !== null).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedbacks</h1>
          <p className="text-muted-foreground">
            Todos os comentários e sugestões sobre as artes
          </p>
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
            <div className="text-2xl font-bold text-blue-600">{estatisticas.texto}</div>
            <p className="text-sm text-muted-foreground">Texto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{estatisticas.audio}</div>
            <p className="text-sm text-muted-foreground">Áudio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.clientes}</div>
            <p className="text-sm text-muted-foreground">de Clientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{estatisticas.designers}</div>
            <p className="text-sm text-muted-foreground">de Designers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{estatisticas.posicionados}</div>
            <p className="text-sm text-muted-foreground">Posicionados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por conteúdo, arte, projeto ou autor..."
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
            <SelectItem value="TEXTO">Texto</SelectItem>
            <SelectItem value="AUDIO">Áudio</SelectItem>
          </SelectContent>
        </Select>
        <Select value={autorFilter} onValueChange={setAutorFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="CLIENTE">Clientes</SelectItem>
            <SelectItem value="DESIGNER">Designers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projetoFilter} onValueChange={setProjetoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Projetos</SelectItem>
            {projetos.map(projeto => (
              <SelectItem key={projeto.id} value={projeto.nome}>{projeto.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
            <SelectItem value="arte">Arte</SelectItem>
            <SelectItem value="projeto">Projeto</SelectItem>
            <SelectItem value="autor">Autor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Feedbacks */}
      {filteredFeedbacks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFeedbacks.map((feedback) => (
            <FeedbackCard key={feedback.id} feedback={feedback} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum feedback encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || tipoFilter !== 'todos' || autorFilter !== 'todos' || projetoFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.' 
                : 'Os feedbacks aparecerão aqui conforme forem enviados.'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}