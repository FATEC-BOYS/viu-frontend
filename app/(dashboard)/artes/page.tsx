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
  Upload,
  Search,
  Calendar,
  User,
  FileImage,
  Loader2,
  Eye,
  Download,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';

// ===================== Tipos =====================

interface Arte {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo: string;
  tipo: string;
  tamanho: number;
  versao: number;
  status: string;
  criado_em: string;
  atualizado_em: string;
  projeto: {
    nome: string;
    cliente: {
      nome: string;
    };
  };
  autor: {
    nome: string;
  };
  feedbacks: Array<{
    id: string;
    conteudo: string;
  }>;
  aprovacoes: Array<{
    id: string;
    status: string;
  }>;
}

type SortKey = 'criado_em' | 'nome' | 'projeto' | 'versao' | 'tamanho';

// ===================== Helpers locais =====================

// normaliza relacionamentos 1:1 que podem vir como array
const toOne = <T,>(val: T | T[] | null | undefined): T | null => {
  if (Array.isArray(val)) return (val[0] ?? null) as T | null;
  return (val ?? null) as T | null;
};

// ===================== UI Auxiliares =====================

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    EM_ANALISE: {
      label: 'Em Análise',
      variant: 'outline' as const,
      icon: Clock,
      color: 'text-blue-600',
    },
    APROVADO: {
      label: 'Aprovado',
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    REJEITADO: {
      label: 'Rejeitado',
      variant: 'destructive' as const,
      icon: XCircle,
      color: 'text-red-600',
    },
    PENDENTE: {
      label: 'Pendente',
      variant: 'secondary' as const,
      icon: AlertCircle,
      color: 'text-yellow-600',
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] ?? {
      label: status,
      variant: 'outline' as const,
      icon: AlertCircle,
      color: 'text-gray-600',
    };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const tipoConfig = {
    LOGO: { label: 'Logo', color: 'bg-purple-100 text-purple-800' },
    BANNER: { label: 'Banner', color: 'bg-blue-100 text-blue-800' },
    FLYER: { label: 'Flyer', color: 'bg-green-100 text-green-800' },
    CARTAO: { label: 'Cartão', color: 'bg-orange-100 text-orange-800' },
    LAYOUT: { label: 'Layout', color: 'bg-pink-100 text-pink-800' },
    ICONE: { label: 'Ícone', color: 'bg-cyan-100 text-cyan-800' },
    INTERFACE: { label: 'Interface', color: 'bg-indigo-100 text-indigo-800' },
    ANIMACAO: { label: 'Animação', color: 'bg-red-100 text-red-800' },
  };

  const config =
    tipoConfig[tipo as keyof typeof tipoConfig] ??
    ({ label: tipo, color: 'bg-gray-100 text-gray-800' } as const);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

function ArteCard({ arte }: { arte: Arte }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename: string) =>
    filename.split('.').pop()?.toUpperCase() ?? '';

  const feedbackCount = arte.feedbacks.length;
  const hasAprovacao = arte.aprovacoes.length > 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{arte.nome}</CardTitle>
              <span className="text-sm text-muted-foreground">v{arte.versao}</span>
            </div>
            <p className="text-sm text-muted-foreground">{arte.projeto.nome}</p>
            <p className="text-xs text-muted-foreground">
              Cliente: {arte.projeto.cliente.nome}
            </p>
          </div>
          <StatusBadge status={arte.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview placeholder */}
        <div className="aspect-video rounded-md border bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">{getFileExtension(arte.arquivo)}</p>
          </div>
        </div>

        {/* Descrição */}
        {arte.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {arte.descricao}
          </p>
        )}

        {/* Tipo e tamanho */}
        <div className="flex items-center justify-between">
          <TipoBadge tipo={arte.tipo} />
          <span className="text-xs text-muted-foreground">
            {formatFileSize(arte.tamanho)}
          </span>
        </div>

        {/* Informações do arquivo */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              Autor
            </div>
            <p className="font-medium">{arte.autor.nome}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Criado
            </div>
            <p className="font-medium">{formatDate(arte.criado_em)}</p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm">
            {feedbackCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {feedbackCount}
              </span>
            )}
            {hasAprovacao && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Aprovação
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== Página =====================

export default function ArtesPage() {
  const [artes, setArtes] = useState<Arte[]>([]);
  const [filteredArtes, setFilteredArtes] = useState<Arte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [projetoFilter, setProjetoFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<SortKey>('criado_em');

  // Opções de filtros
  const [projetos, setProjetos] = useState<Array<{ id: string; nome: string }>>(
    []
  );
  const [tipos, setTipos] = useState<string[]>([]);

  useEffect(() => {
    const fetchArtes = async () => {
      try {
        const { data, error } = await supabase
          .from('artes')
          .select(`
            id,
            nome,
            descricao,
            arquivo,
            tipo,
            tamanho,
            versao,
            status,
            criado_em,
            atualizado_em,
            projeto:projeto_id (
              nome,
              cliente:cliente_id (nome)
            ),
            autor:autor_id (nome),
            feedbacks (id, conteudo),
            aprovacoes (id, status)
          `)
          .order('criado_em', { ascending: false });

        if (error) throw error;

        // NORMALIZAÇÃO para casar com o tipo Arte
        const rows: Arte[] = (data ?? []).map((r: any) => {
          const projeto = toOne<any>(r.projeto);
          const cliente = projeto ? toOne<any>(projeto.cliente) : null;
          const autor = toOne<any>(r.autor);

          return {
            id: String(r.id),
            nome: String(r.nome),
            descricao: r.descricao ?? null,
            arquivo: String(r.arquivo),
            tipo: String(r.tipo),
            tamanho: Number(r.tamanho),
            versao: Number(r.versao),
            status: String(r.status),
            criado_em: String(r.criado_em),
            atualizado_em: String(r.atualizado_em),
            projeto: {
              nome: projeto?.nome ?? '',
              cliente: { nome: cliente?.nome ?? '' },
            },
            autor: { nome: autor?.nome ?? '' },
            feedbacks: Array.isArray(r.feedbacks)
              ? r.feedbacks.map((f: any) => ({
                  id: String(f.id),
                  conteudo: String(f.conteudo ?? ''),
                }))
              : [],
            aprovacoes: Array.isArray(r.aprovacoes)
              ? r.aprovacoes.map((a: any) => ({
                  id: String(a.id),
                  status: String(a.status ?? ''),
                }))
              : [],
          };
        });

        setArtes(rows);

        // Opções de filtro com base nos rows normalizados
        const nomesProjetos = Array.from(new Set(rows.map((a) => a.projeto.nome)));
        setProjetos(nomesProjetos.map((nome, idx) => ({ id: String(idx), nome })));

        const tiposUnicos = Array.from(new Set(rows.map((a) => a.tipo)));
        setTipos(tiposUnicos);
      } catch (e) {
        console.error('Erro ao buscar artes:', e);
        setError('Não foi possível carregar as artes.');
      } finally {
        setLoading(false);
      }
    };

    fetchArtes();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    let filtered = artes;

    // Busca
    if (searchTerm) {
      const st = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (arte) =>
          arte.nome.toLowerCase().includes(st) ||
          arte.projeto.nome.toLowerCase().includes(st) ||
          arte.projeto.cliente.nome.toLowerCase().includes(st)
      );
    }

    // Status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((arte) => arte.status === statusFilter);
    }

    // Tipo
    if (tipoFilter !== 'todos') {
      filtered = filtered.filter((arte) => arte.tipo === tipoFilter);
    }

    // Projeto
    if (projetoFilter !== 'todos') {
      filtered = filtered.filter((arte) => arte.projeto.nome === projetoFilter);
    }

    // Ordenação (copiar antes de ordenar)
    const ordered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'criado_em':
          return (
            new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
          );
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'projeto':
          return a.projeto.nome.localeCompare(b.projeto.nome);
        case 'versao':
          return b.versao - a.versao;
        case 'tamanho':
          return b.tamanho - a.tamanho;
        default:
          return 0;
      }
    });

    setFilteredArtes(ordered);
  }, [artes, searchTerm, statusFilter, tipoFilter, projetoFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando artes...</p>
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
    total: artes.length,
    emAnalise: artes.filter((a) => a.status === 'EM_ANALISE').length,
    aprovadas: artes.filter((a) => a.status === 'APROVADO').length,
    rejeitadas: artes.filter((a) => a.status === 'REJEITADO').length,
    pendentes: artes.filter((a) => a.status === 'PENDENTE').length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artes</h1>
          <p className="text-muted-foreground">
            Gerencie todas as artes dos seus projetos
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Arte
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total de Artes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {estatisticas.emAnalise}
            </div>
            <p className="text-sm text-muted-foreground">Em Análise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {estatisticas.aprovadas}
            </div>
            <p className="text-sm text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {estatisticas.rejeitadas}
            </div>
            <p className="text-sm text-muted-foreground">Rejeitadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {estatisticas.pendentes}
            </div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por arte, projeto ou cliente..."
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
            <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
            <SelectItem value="APROVADO">Aprovado</SelectItem>
            <SelectItem value="REJEITADO">Rejeitado</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {tipos.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projetoFilter} onValueChange={setProjetoFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Projetos</SelectItem>
            {projetos.map((projeto) => (
              <SelectItem key={projeto.id} value={projeto.nome}>
                {projeto.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais Recente</SelectItem>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="projeto">Projeto</SelectItem>
            <SelectItem value="versao">Versão</SelectItem>
            <SelectItem value="tamanho">Tamanho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Artes */}
      {filteredArtes.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtes.map((arte) => (
            <ArteCard key={arte.id} arte={arte} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma arte encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ||
              statusFilter !== 'todos' ||
              tipoFilter !== 'todos' ||
              projetoFilter !== 'todos'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece fazendo upload da sua primeira arte.'}
            </p>
            {!searchTerm &&
              statusFilter === 'todos' &&
              tipoFilter === 'todos' &&
              projetoFilter === 'todos' && (
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Primeira Arte
                </Button>
              )}
          </div>
        </Card>
      )}
    </div>
  );
}
