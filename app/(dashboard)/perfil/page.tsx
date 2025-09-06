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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Camera,
  Edit,
  Save,
  X,
  Loader2,
  Shield,
  Bell,
  Eye,
  Lock,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';

// Tipos baseados no schema
interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  tipo: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface EstatisticasUsuario {
  totalProjetos: number;
  projetosAtivos: number;
  projetosConcluidos: number;
  totalArtes: number;
  artesAprovadas: number;
  totalFeedbacks: number;
  totalTarefas: number;
  tarefasConcluidas: number;
}

// Componente de Upload de Avatar
function AvatarUpload({ avatar, nome, onAvatarChange }: {
  avatar: string | null;
  nome: string;
  onAvatarChange: (file: File | null) => void;
}) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarChange(file);
    }
  };

  return (
    <div className="relative group">
      <Avatar className="w-24 h-24">
        <AvatarImage src={avatar || undefined} alt={nome} />
        <AvatarFallback className="text-lg font-semibold">
          {getInitials(nome)}
        </AvatarFallback>
      </Avatar>
      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <label htmlFor="avatar-upload" className="cursor-pointer">
          <Camera className="h-6 w-6 text-white" />
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// Componente de Card de Estatísticas
function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  trend?: { value: string; isPositive: boolean };
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        {trend && (
          <div className={`flex items-center mt-2 text-xs ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente Principal
export default function PerfilPage() {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    avatar: null as File | null,
  });

  // Estados de configurações
  const [configuracoes, setConfiguracoes] = useState({
    notificacoesPush: true,
    notificacoesEmail: true,
    visibilidadePerfil: 'publico' as string,
    tema: 'claro' as string,
  });

  // Buscar dados do usuário
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        // Simular busca do usuário atual (você implementará com auth real)
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', 'ana.silva@design.com') // Substituir pela sessão atual
          .single();

        if (userError) throw userError;

        setUsuario(userData);
        setFormData({
          nome: userData.nome,
          email: userData.email,
          telefone: userData.telefone || '',
          avatar: null,
        });

        // Buscar estatísticas
        const [projetos, artes, feedbacks, tarefas] = await Promise.all([
          supabase.from('projetos').select('id, status').eq('designer_id', userData.id),
          supabase.from('artes').select('id, status').eq('autor_id', userData.id),
          supabase.from('feedbacks').select('id').eq('autor_id', userData.id),
          supabase.from('tarefas').select('id, status').eq('responsavel_id', userData.id),
        ]);

        const stats: EstatisticasUsuario = {
          totalProjetos: projetos.data?.length || 0,
          projetosAtivos: projetos.data?.filter(p => p.status === 'EM_ANDAMENTO').length || 0,
          projetosConcluidos: projetos.data?.filter(p => p.status === 'CONCLUIDO').length || 0,
          totalArtes: artes.data?.length || 0,
          artesAprovadas: artes.data?.filter(a => a.status === 'APROVADO').length || 0,
          totalFeedbacks: feedbacks.data?.length || 0,
          totalTarefas: tarefas.data?.length || 0,
          tarefasConcluidas: tarefas.data?.filter(t => t.status === 'CONCLUIDA').length || 0,
        };

        setEstatisticas(stats);

      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        setError('Não foi possível carregar os dados do perfil.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, []);

  const handleSave = async () => {
    if (!usuario) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      if (error) throw error;

      setUsuario(prev => prev ? {
        ...prev,
        nome: formData.nome,
        telefone: formData.telefone || null,
        atualizado_em: new Date().toISOString(),
      } : null);

      setEditMode(false);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setError('Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone || '',
        avatar: null,
      });
    }
    setEditMode(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando perfil...</p>
      </div>
    );
  }

  if (error || !usuario || !estatisticas) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center text-destructive">{error || 'Erro ao carregar perfil'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Shield className="h-3 w-3" />
          {usuario.tipo}
        </Badge>
      </div>

      {/* Grid Principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Coluna da Esquerda - Informações Pessoais */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card de Informações Básicas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                {!editMode ? (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar e Nome */}
              <div className="flex items-center gap-6">
                <AvatarUpload 
                  avatar={usuario.avatar} 
                  nome={usuario.nome}
                  onAvatarChange={(file) => setFormData(prev => ({ ...prev, avatar: file }))}
                />
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{usuario.nome}</h2>
                  <p className="text-muted-foreground">{usuario.email}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Membro desde {formatDate(usuario.criado_em)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Formulário */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled // Email não pode ser editado
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                    disabled={!editMode}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status da Conta</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={usuario.ativo ? "default" : "secondary"}>
                      {usuario.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Configurações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {/* Notificações */}
                <div>
                  <h4 className="font-medium mb-3">Notificações</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações Push</p>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações no navegador
                        </p>
                      </div>
                      <Switch
                        checked={configuracoes.notificacoesPush}
                        onCheckedChange={(checked) => 
                          setConfiguracoes(prev => ({ ...prev, notificacoesPush: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por Email</p>
                        <p className="text-sm text-muted-foreground">
                          Receba resumos por email
                        </p>
                      </div>
                      <Switch
                        checked={configuracoes.notificacoesEmail}
                        onCheckedChange={(checked) => 
                          setConfiguracoes(prev => ({ ...prev, notificacoesEmail: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Privacidade */}
                <div>
                  <h4 className="font-medium mb-3">Privacidade</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Visibilidade do Perfil</Label>
                      <Select 
                        value={configuracoes.visibilidadePerfil}
                        onValueChange={(value) => 
                          setConfiguracoes(prev => ({ ...prev, visibilidadePerfil: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="publico">Público</SelectItem>
                          <SelectItem value="privado">Privado</SelectItem>
                          <SelectItem value="equipe">Apenas Equipe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita - Estatísticas */}
        <div className="space-y-6">
          
          {/* Estatísticas Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Minhas Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <StatCard
                  title="Projetos"
                  value={estatisticas.totalProjetos}
                  subtitle={`${estatisticas.projetosAtivos} ativos`}
                  icon={Award}
                  trend={{ value: "+2 este mês", isPositive: true }}
                />
                <StatCard
                  title="Artes"
                  value={estatisticas.totalArtes}
                  subtitle={`${estatisticas.artesAprovadas} aprovadas`}
                  icon={CheckCircle2}
                />
                <StatCard
                  title="Tarefas"
                  value={estatisticas.totalTarefas}
                  subtitle={`${estatisticas.tarefasConcluidas} concluídas`}
                  icon={Clock}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Dados
              </Button>
              <Separator />
              <Button variant="destructive" className="w-full justify-start">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}