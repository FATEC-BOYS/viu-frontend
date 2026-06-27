'use client'

import { useState, useEffect, useRef } from 'react'
import { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  User as UserIcon,
  Calendar, Edit, Save, X, Loader2,
  Shield, Lock, Trash2, Download,
  BarChart3, Award, Clock, CheckCircle2, Camera,
} from 'lucide-react'

interface UsuarioPerfil {
  id: string
  email: string
  nome: string
  telefone: string | null
  avatar: string | null
  tipo: 'DESIGNER' | 'CLIENTE'
  ativo: boolean
  criadoEm: string
}

interface EstatisticasUsuario {
  totalProjetos: number
  projetosAtivos: number
  projetosConcluidos: number
  totalArtes: number
  artesAprovadas: number
  totalFeedbacks: number
  totalTarefas: number
  tarefasConcluidas: number
}

function StatCard({
  title, value, subtitle, icon: Icon,
}: {
  title: string
  value: number
  subtitle: string
  icon: LucideIcon
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
      </CardContent>
    </Card>
  )
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2)
}

async function fetchTotal(path: string): Promise<number> {
  try {
    const res = await api.get<{ total?: number }>(path)
    return res.total ?? 0
  } catch {
    return 0
  }
}

export default function PerfilPage() {
  const { updateUser } = useAuth()
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null)
  const [estatisticas, setEstatisticas] = useState<EstatisticasUsuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' })

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get<{ data: UsuarioPerfil; success: boolean }>('/auth/me')
        const u = res.data
        setUsuario(u)
        setFormData({ nome: u.nome, email: u.email, telefone: u.telefone || '' })

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
          fetchTotal('/projetos?limit=1'),
          fetchTotal('/projetos?limit=1&status=EM_ANDAMENTO'),
          fetchTotal('/projetos?limit=1&status=CONCLUIDO'),
          fetchTotal('/artes?limit=1'),
          fetchTotal('/artes?limit=1&status=APROVADO'),
          fetchTotal('/feedbacks?limit=1'),
          fetchTotal('/tarefas?limit=1'),
          fetchTotal('/tarefas?limit=1&status=CONCLUIDA'),
        ])

        setEstatisticas({
          totalProjetos,
          projetosAtivos,
          projetosConcluidos,
          totalArtes,
          artesAprovadas,
          totalFeedbacks,
          totalTarefas,
          tarefasConcluidas,
        })
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar o perfil')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  const handleSave = async () => {
    if (!usuario) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.put<{ data: UsuarioPerfil; success: boolean }>(
        `/usuarios/${usuario.id}`,
        {
          nome: formData.nome,
          ...(formData.telefone ? { telefone: formData.telefone } : {}),
        }
      )
      setUsuario(res.data)
      setEditMode(false)
    } catch {
      setError('Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (usuario) setFormData({ nome: usuario.nome, email: usuario.email, telefone: usuario.telefone || '' })
    setEditMode(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !usuario) return

    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setAvatarUploading(true)
    setError(null)

    try {
      const formPayload = new FormData()
      formPayload.append('file', file)

      const token = typeof window !== 'undefined' ? localStorage.getItem('viu_token') : null
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
      const res = await fetch(`${BASE_URL}/usuarios/${usuario.id}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formPayload,
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.message ?? `Erro ${res.status}`)

      const newAvatar: string | null = body.data?.avatar ?? null
      setUsuario((prev) => prev ? { ...prev, avatar: newAvatar } : prev)
      updateUser({ avatar: newAvatar })
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar avatar')
      setAvatarPreview(null)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando perfil...</p>
      </div>
    )
  }

  if (error || !usuario) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center text-destructive">{error || 'Erro ao carregar perfil'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Shield className="h-3 w-3" />
          {usuario.tipo}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative group/avatar">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarPreview ?? usuario.avatar ?? undefined} alt={usuario.nome} />
                    <AvatarFallback className="text-lg font-semibold">
                      {getInitials(usuario.nome)}
                    </AvatarFallback>
                  </Avatar>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    aria-label="Alterar foto de perfil"
                  >
                    {avatarUploading
                      ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                      : <Camera className="h-6 w-6 text-white" />}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{usuario.nome}</h2>
                  <p className="text-muted-foreground">{usuario.email}</p>
                  {usuario.criadoEm && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Membro desde {formatDate(usuario.criadoEm)}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {error && <p className="text-sm text-destructive">{error}</p>}

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

        </div>

        <div className="space-y-6">
          {estatisticas && (
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
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/recuperar">
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Download className="h-4 w-4 mr-2" />
                Exportar Dados
                <span className="ml-auto text-xs text-muted-foreground">em breve</span>
              </Button>
              <Separator />
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" disabled>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Conta
                <span className="ml-auto text-xs text-muted-foreground">em breve</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
