'use client'

import { FadeIn } from "@/components/layout/Motion";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  User as UserIcon, Calendar, Edit, Save, X, Loader2,
  Shield, Bell, Lock, Trash2, Download,
  BarChart3, Award, Clock, CheckCircle2, Camera,
  CreditCard, Wallet, ArrowDownToLine, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { pagamentosApi, Assinatura, SaldoInfo } from '@/lib/pagamentos'

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

function StatCard({ title, value, subtitle, icon: Icon }: {
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

const STATUS_ASSINATURA_CFG: Record<string, { label: string; cls: string }> = {
  ATIVA: { label: 'Ativa', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 border-emerald-500/20' },
  PENDENTE: { label: 'Pendente', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  CANCELADA: { label: 'Cancelada', cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  PAUSADA: { label: 'Pausada', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  EXPIRADA: { label: 'Expirada', cls: 'bg-muted text-muted-foreground border-border' },
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]?.toUpperCase()).join('').slice(0, 2)
}

async function fetchTotal(path: string): Promise<number> {
  try {
    // o total vem dentro de pagination; lendo res.total todas as estatísticas
    // do perfil davam 0, mesmo com projetos e artes na conta
    const res = await api.get<{ pagination?: { total?: number } }>(path)
    return res.pagination?.total ?? 0
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
  const [configuracoes, setConfiguracoes] = useState({
    notificacoesPush: true,
    notificacoesEmail: true,
    visibilidadePerfil: 'publico' as string,
  })

  // payment state
  const [assinatura, setAssinatura] = useState<Assinatura | null | undefined>(undefined)
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get<{ data: UsuarioPerfil; success: boolean }>('/auth/me')
        const u = res.data
        setUsuario(u)
        setFormData({ nome: u.nome, email: u.email, telefone: u.telefone || '' })

        const [
          totalProjetos, projetosAtivos, projetosConcluidos,
          totalArtes, artesAprovadas, totalFeedbacks, totalTarefas, tarefasConcluidas,
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
          totalProjetos, projetosAtivos, projetosConcluidos,
          totalArtes, artesAprovadas, totalFeedbacks, totalTarefas, tarefasConcluidas,
        })

        // payment data
        const tipo = u.tipo === 'DESIGNER' ? 'designer' : 'cliente'
        const [assinaturaRes, saldoRes] = await Promise.allSettled([
          pagamentosApi.getMinhaAssinatura(),
          u.tipo === 'DESIGNER' ? pagamentosApi.getSaldo() : Promise.resolve(null),
        ])
        if (assinaturaRes.status === 'fulfilled') setAssinatura(assinaturaRes.value.data)
        else setAssinatura(null)
        if (saldoRes.status === 'fulfilled' && saldoRes.value) setSaldo(saldoRes.value.data)
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
        { nome: formData.nome, ...(formData.telefone ? { telefone: formData.telefone } : {}) }
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
      setUsuario(prev => prev ? { ...prev, avatar: newAvatar } : prev)
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

  const assinaturaStatus = assinatura?.status ?? null
  const assinaturaCfg = assinaturaStatus ? STATUS_ASSINATURA_CFG[assinaturaStatus] : null
  const isDesigner = usuario.tipo === 'DESIGNER'

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
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
                    <Button variant="outline" size="sm" onClick={handleCancel}><X className="h-4 w-4" /></Button>
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
                    <AvatarFallback className="text-lg font-semibold">{getInitials(usuario.nome)}</AvatarFallback>
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
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden" onChange={handleAvatarChange} />
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
                  <Input id="nome" value={formData.nome}
                    onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                    disabled={!editMode} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" value={formData.telefone}
                    onChange={e => setFormData(p => ({ ...p, telefone: e.target.value }))}
                    disabled={!editMode} placeholder="(11) 99999-9999" />
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div>
                  <h4 className="font-medium mb-3">Notificações</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações Push</p>
                        <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                      </div>
                      <Switch checked={configuracoes.notificacoesPush}
                        onCheckedChange={checked => setConfiguracoes(p => ({ ...p, notificacoesPush: checked }))} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notificações por Email</p>
                        <p className="text-sm text-muted-foreground">Receba resumos por email</p>
                      </div>
                      <Switch checked={configuracoes.notificacoesEmail}
                        onCheckedChange={checked => setConfiguracoes(p => ({ ...p, notificacoesEmail: checked }))} />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Privacidade</h4>
                  <div>
                    <Label>Visibilidade do Perfil</Label>
                    <Select value={configuracoes.visibilidadePerfil}
                      onValueChange={value => setConfiguracoes(p => ({ ...p, visibilidadePerfil: value }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publico">Público</SelectItem>
                        <SelectItem value="privado">Privado</SelectItem>
                        <SelectItem value="equipe">Apenas Equipe</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <StatCard title="Projetos" value={estatisticas.totalProjetos}
                    subtitle={`${estatisticas.projetosAtivos} em andamento • ${estatisticas.projetosConcluidos} concluídos`}
                    icon={Award} />
                  <StatCard title="Artes" value={estatisticas.totalArtes}
                    subtitle={`${estatisticas.artesAprovadas} aprovadas`} icon={CheckCircle2} />
                  <StatCard title="Tarefas" value={estatisticas.totalTarefas}
                    subtitle={`${estatisticas.tarefasConcluidas} concluídas`} icon={Clock} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- assinatura card --- */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assinatura === undefined ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !assinatura ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
                    <Button asChild size="sm" className="w-full">
                      <Link href="/planos">Ver planos</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{assinatura.plano.nome}</p>
                      {assinaturaCfg && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${assinaturaCfg.cls}`}>
                          {assinaturaCfg.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {assinatura.plano.precoMensal === 0
                        ? 'Grátis'
                        : `${assinatura.plano.precoMensalFormatado}/mês`}
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full gap-1">
                      <Link href="/assinaturas">Gerenciar <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* --- saldo designer card --- */}
          {isDesigner && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4 text-primary" />
                    Saldo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!saldo ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Disponível</p>
                        <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
                          {saldo.saldoFormatado}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p className="uppercase tracking-wide text-[10px]">Recebido</p>
                          <p className="font-medium text-foreground">{saldo.totalRecebidoFormatado}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-wide text-[10px]">Sacado</p>
                          <p className="font-medium text-foreground">{saldo.totalSacadoFormatado}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" className="w-full gap-1">
                        <Link href="/saques">
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          Sacar
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
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
                <a href="/recuperar"><Lock className="h-4 w-4 mr-2" />Alterar Senha</a>
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
    </FadeIn>
  )
}
