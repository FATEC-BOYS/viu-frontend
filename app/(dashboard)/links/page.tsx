// app/links/page.tsx
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Share2,
  Search,
  Calendar,
  Copy,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  MoreVertical,
  Trash2,
  RefreshCw,
  FileImage,
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// Tipos baseados no schema
interface LinkCompartilhado {
  id: string;
  token: string;
  tipo: string;
  expira_em: string | null;
  somente_leitura: boolean;
  criado_em: string;
  arte: {
    nome: string;
    projeto: {
      nome: string;
      cliente: {
        nome: string;
      };
    };
  } | null;
  projeto: {
    nome: string;
    cliente: {
      nome: string;
    };
  } | null;
}

// Componente de Badge de Tipo
function TipoLinkBadge({ tipo }: { tipo: string }) {
  const tipoConfig = {
    'ARTE': { 
      label: 'Arte', 
      icon: FileImage,
      color: 'bg-blue-100 text-blue-800 border-blue-200' 
    },
    'PROJETO': { 
      label: 'Projeto', 
      icon: FolderOpen,
      color: 'bg-purple-100 text-purple-800 border-purple-200' 
    },
  };

  const config = tipoConfig[tipo as keyof typeof tipoConfig] || { 
    label: tipo, 
    icon: Share2,
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

// Componente de Status do Link
function StatusLink({ expira_em }: { expira_em: string | null }) {
  if (!expira_em) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Permanente
      </Badge>
    );
  }

  const dataExpiracao = new Date(expira_em);
  const agora = new Date();
  const expirado = dataExpiracao < agora;
  const expiraEm24h = dataExpiracao.getTime() - agora.getTime() < 24 * 60 * 60 * 1000;

  if (expirado) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expirado
      </Badge>
    );
  }

  if (expiraEm24h) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Expira em breve
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Ativo
    </Badge>
  );
}

// Componente do Card de Link
function LinkCard({ 
  link, 
  onCopy, 
  onDelete, 
  onRegenerate 
}: { 
  link: LinkCompartilhado;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
}) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateRelative = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Criado agora há pouco';
    if (diffInHours < 24) return `Criado ${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Criado ${diffInDays}d atrás`;
    return `Criado em ${formatDate(dateString)}`;
  };

  const linkUrl = `${window.location.origin}/shared/${link.token}`;
  const isExpired = link.expira_em && new Date(link.expira_em) < new Date();

  const getTitle = () => {
    if (link.tipo === 'ARTE' && link.arte) {
      return link.arte.nome;
    }
    if (link.tipo === 'PROJETO' && link.projeto) {
      return link.projeto.nome;
    }
    return 'Link Compartilhado';
  };

  const getSubtitle = () => {
    if (link.tipo === 'ARTE' && link.arte) {
      return `${link.arte.projeto.nome} • ${link.arte.projeto.cliente.nome}`;
    }
    if (link.tipo === 'PROJETO' && link.projeto) {
      return link.projeto.cliente.nome;
    }
    return '';
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${isExpired ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <TipoLinkBadge tipo={link.tipo} />
              <StatusLink expira_em={link.expira_em} />
              {link.somente_leitura && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  Somente Leitura
                </Badge>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{getTitle()}</h3>
              {getSubtitle() && (
                <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopy(linkUrl)} disabled={isExpired}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(linkUrl, '_blank')} disabled={isExpired}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerate(link.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar Token
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(link.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL do Link */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">URL do Link</Label>
          <div className="flex items-center gap-2">
            <Input 
              value={linkUrl} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onCopy(linkUrl)}
              disabled={isExpired}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Informações */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Criado:</span>
            <p className="font-medium">{formatDateRelative(link.criado_em)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Expira:</span>
            <p className="font-medium">{formatDate(link.expira_em)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function LinksPage() {
  const [links, setLinks] = useState<LinkCompartilhado[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<LinkCompartilhado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('criado_em');

  // Estados do modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Buscar links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('link_compartilhado')
          .select(`
            id,
            token,
            tipo,
            expira_em,
            somente_leitura,
            criado_em,
            arte:arte_id (
              nome,
              projeto:projeto_id (
                nome,
                cliente:cliente_id (nome)
              )
            ),
            projeto:projeto_id (
              nome,
              cliente:cliente_id (nome)
            )
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;
        
        setLinks(data || []);

      } catch (error) {
        console.error('Erro ao buscar links:', error);
        setError('Não foi possível carregar os links compartilhados.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = links;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(link => {
        const searchLower = searchTerm.toLowerCase();
        if (link.tipo === 'ARTE' && link.arte) {
          return link.arte.nome.toLowerCase().includes(searchLower) ||
                 link.arte.projeto.nome.toLowerCase().includes(searchLower) ||
                 link.arte.projeto.cliente.nome.toLowerCase().includes(searchLower);
        }
        if (link.tipo === 'PROJETO' && link.projeto) {
          return link.projeto.nome.toLowerCase().includes(searchLower) ||
                 link.projeto.cliente.nome.toLowerCase().includes(searchLower);
        }
        return link.token.toLowerCase().includes(searchLower);
      });
    }

    // Filtro por tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter(link => link.tipo === tipoFilter);
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      const agora = new Date();
      filtered = filtered.filter(link => {
        const expirado = link.expira_em && new Date(link.expira_em) < agora;
        if (statusFilter === 'ativo') return !expirado;
        if (statusFilter === 'expirado') return expirado;
        if (statusFilter === 'permanente') return !link.expira_em;
        return true;
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criado_em':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'expira_em':
          if (!a.expira_em && !b.expira_em) return 0;
          if (!a.expira_em) return 1;
          if (!b.expira_em) return -1;
          return new Date(a.expira_em).getTime() - new Date(b.expira_em).getTime();
        case 'tipo':
          return a.tipo.localeCompare(b.tipo);
        default:
          return 0;
      }
    });

    setFilteredLinks(filtered);
  }, [links, searchTerm, tipoFilter, statusFilter, sortBy]);

  // Ações
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // Aqui você poderia mostrar um toast de sucesso
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('link_compartilhado')
        .delete()
        .eq('id', id);
      
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Erro ao deletar link:', error);
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const newToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
      
      await supabase
        .from('link_compartilhado')
        .update({ token: newToken })
        .eq('id', id);
      
      setLinks(prev => prev.map(l => 
        l.id === id ? { ...l, token: newToken } : l
      ));
    } catch (error) {
      console.error('Erro ao regenerar token:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando links compartilhados...</p>
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
    total: links.length,
    ativos: links.filter(l => !l.expira_em || new Date(l.expira_em) > new Date()).length,
    expirados: links.filter(l => l.expira_em && new Date(l.expira_em) < new Date()).length,
    artes: links.filter(l => l.tipo === 'ARTE').length,
    projetos: links.filter(l => l.tipo === 'PROJETO').length,
    permanentes: links.filter(l => !l.expira_em).length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Links Compartilhados</h1>
          <p className="text-muted-foreground">
            Gerencie links para compartilhar artes e projetos externamente
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Criar Link
        </Button>
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
            <div className="text-2xl font-bold text-green-600">{estatisticas.ativos}</div>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{estatisticas.expirados}</div>
            <p className="text-sm text-muted-foreground">Expirados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.artes}</div>
            <p className="text-sm text-muted-foreground">Artes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{estatisticas.projetos}</div>
            <p className="text-sm text-muted-foreground">Projetos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{estatisticas.permanentes}</div>
            <p className="text-sm text-muted-foreground">Permanentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, projeto ou cliente..."
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
            <SelectItem value="ARTE">Arte</SelectItem>
            <SelectItem value="PROJETO">Projeto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="expirado">Expirados</SelectItem>
            <SelectItem value="permanente">Permanentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
            <SelectItem value="expira_em">Data Expiração</SelectItem>
            <SelectItem value="tipo">Tipo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Links */}
      {filteredLinks.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredLinks.map((link) => (
            <LinkCard 
              key={link.id} 
              link={link}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onRegenerate={handleRegenerate}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum link encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece criando seu primeiro link compartilhado.'}
            </p>
            {!searchTerm && tipoFilter === 'todos' && statusFilter === 'todos' && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Link
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}