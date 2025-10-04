'use client';

import { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User as UserIcon,
  Calendar, Camera, Edit, Save, X, Loader2,
  Shield, Bell, Lock, Trash2, Download,
  BarChart3, Award, TrendingUp, Clock, CheckCircle2,
} from 'lucide-react';

// Tipos conforme schema do VIU
interface UsuarioPerfil {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  tipo: 'DESIGNER' | 'CLIENTE';
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface EstatisticasUsuario {
  totalProjetos: number;
  projetosAtivos: number;     // EM_ANDAMENTO
  projetosConcluidos: number; // CONCLUIDO
  totalArtes: number;
  artesAprovadas: number;     // APROVADO
  totalFeedbacks: number;
  totalTarefas: number;
  tarefasConcluidas: number;  // CONCLUIDA
}

// Upload de avatar
async function uploadAvatar(file: File, usuarioId: string) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `avatars/${usuarioId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl; // salva URL pública em usuarios.avatar
}

// Componente de Upload de Avatar
function AvatarUpload({
  avatar,
  nome,
  onAvatarChange,
}: {
  avatar: string | null;
  nome: string;
  onAvatarChange: (file: File | null) => void;
}) {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase())
      .join('')
      .slice(0, 2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onAvatarChange(file);
    e.currentTarget.value = '';
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

// Card de estatística
function StatCard({
  title, value, subtitle, icon: Icon, trend,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
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
          <div
            className={`flex items-center mt-2 text-xs ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [estatisticas, setEstatisticas] = useState<EstatisticasUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    avatar: null as File | null,
  });

  // Config locais (não persistidos no schema)
  const [configuracoes, setConfiguracoes] = useState({
    notificacoesPush: true,
    notificacoesEmail: true,
    visibilidadePerfil: 'publico' as string,
    tema: 'claro' as string,
  });

  // Helpers de contagem com head:true
  const countHead = async (
    table: string,
    filters: (q: any) => any
  ): Promise<number> => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    query = filters(query);
    const { count, error: err } = await query;
    if (err) throw err;
    return count ?? 0;
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1) pega usuário autenticado
        const { data: auth } = await supabase.auth.getUser();
        const authUser = auth.user;
        if (!authUser) throw new Error('Usuário não autenticado');

        const usuarioId = authUser.id;

        // 2) tenta buscar perfil; se não existir ainda, cria com dados básicos
        let { data: userRow, error: userErr, status } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', usuarioId)
          .maybeSingle();

        if (userErr && status !== 406) throw userErr;

        if (!userRow) {
          const meta = (authUser.user_metadata ?? {}) as Record<string, any>;
          const nome: string =
            meta.name ??
            meta.full_name ??
            meta.fullName ??
            meta.fullname ??
            meta.user_name ??
            (authUser.email ? authUser.email.split('@')[0] : 'Usuário');

          const avatar: string | null =
            meta.avatar_url ?? meta.picture ?? null;

          const tipo: 'DESIGNER' | 'CLIENTE' =
            (meta.tipo as any) ?? 'DESIGNER';

          const { data: upserted, error: upErr } = await supabase
            .from('usuarios')
            .upsert(
              {
                id: usuarioId,
                email: authUser.email!,
                nome,
                tipo,
                avatar: avatar ?? null,
                ativo: true,
              },
              { onConflict: 'id' }
            )
            .select()
            .single();

          if (upErr) throw upErr;
          userRow = upserted as UsuarioPerfil;
        }

        const u: UsuarioPerfil = userRow as UsuarioPerfil;
        setUsuario(u);
        setFormData({
          nome: u.nome,
          email: u.email,
          telefone: u.telefone || '',
          avatar: null,
        });

        // 3) estatísticas (contagens) – filtradas por usuarioId; requer RLS correta
        const [
          totalProjetos,
          projetosAtivos,
          projetosConcluidos,
          totalArtes,
          artesAprovadas,
          totalFeedbacks,
          totalTarefas,
          tarefasConcluidas,
        ] = await Promise.all([
          countHead('projetos', (q) => q.eq('designer_id', usuarioId)),
          countHead('projetos', (q) => q.eq('designer_id', usuarioId).eq('status', 'EM_ANDAMENTO')),
          countHead('projetos', (q) => q.eq('designer_id', usuarioId).eq('status', 'CONCLUIDO')),
          countHead('artes', (q) => q.eq('autor_id', usuarioId)),
          countHead('artes', (q) => q.eq('autor_id', usuarioId).eq('status', 'APROVADO')),
          countHead('feedbacks', (q) => q.eq('autor_id', usuarioId)),
          countHead('tarefas', (q) => q.eq('responsavel_id', usuarioId)),
          countHead('tarefas', (q) => q.eq('responsavel_id', usuarioId).eq('status', 'CONCLUIDA')),
        ]);

        setEstatisticas({
          totalProjetos,
          projetosAtivos,
          projetosConcluidos,
          totalArtes,
          artesAprovadas,
          totalFeedbacks,
          totalTarefas,
          tarefasConcluidas,
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Falha ao carregar o perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleSave = async () => {
    if (!usuario) return;

    setSaving(true);
    setError(null);

    try {
      let avatarUrl = usuario.avatar;

      // Se o usuário escolheu um novo arquivo, sobe para o bucket e atualiza URL
      if (formData.avatar) {
        avatarUrl = await uploadAvatar(formData.avatar, usuario.id);
      }

      const { error: updErr } = await supabase
        .from('usuarios')
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          avatar: avatarUrl,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      if (updErr) throw updErr;

      setUsuario((prev) =>
        prev
          ? {
              ...prev,
              nome: formData.nome,
              telefone: formData.telefone || null,
              avatar: avatarUrl,
              atualizado_em: new Date().toISOString(),
            }
          : prev
      );
      setEditMode(false);
    } catch (e: any) {
      console.error(e);
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

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

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
        <div className="text-center text-destructive">
          {error || 'Erro ao carregar perfil'}
        </div>
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
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
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
                  onAvatarChange={(file) => setFormData((p) => ({ ...p, avatar: file }))}
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
                    onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                    disabled={!editMode}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData((p) => ({ ...p, telefone: e.target.value }))}
                    disabled={!editMode}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status da Conta</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={usuario.ativo ? 'default' : 'secondary'}>
                      {usuario.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações (estado local) */}
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
                          setConfiguracoes((p) => ({ ...p, notificacoesPush: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por Email</p>
                        <p className="text-sm text-muted-foreground">Receba resumos por email</p>
                      </div>
                      <Switch
                        checked={configuracoes.notificacoesEmail}
                        onCheckedChange={(checked) =>
                          setConfiguracoes((p) => ({ ...p, notificacoesEmail: checked }))
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
                          setConfiguracoes((p) => ({ ...p, visibilidadePerfil: value }))
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

        {/* Coluna Direita */}
        <div className="space-y-6">
          {/* Estatísticas */}
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
                  subtitle={`${estatisticas.projetosAtivos} em andamento • ${estatisticas.projetosConcluidos} concluídos`}
                  icon={Award}
                  trend={{ value: '+2 este mês', isPositive: true }}
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

          {/* Segurança / Ações */}
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
