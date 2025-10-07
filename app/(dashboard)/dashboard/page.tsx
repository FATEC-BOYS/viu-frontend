'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FolderOpen, Clock, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getBaseUrl } from '@/lib/baseUrl'

// Cards de onboarding (Duolingo‑style)
import StepCliente from '@/components/dashboard/StepCliente'
import StepProjeto from '@/components/dashboard/StepProjeto'
import StepTime from '@/components/dashboard/StepTime'
import StepArte from '@/components/dashboard/StepArte'
import StepFeedback from '@/components/dashboard/StepFeedback'
import StepAprovacao from '@/components/dashboard/StepAprovacao'
import StepConcluido from '@/components/dashboard/StepConcluido'

// ============================
// Tipos
// ============================

type Projeto = {
  id: string
  nome: string
  status: string
  prazo?: string | null
  cliente?: { nome?: string | null } | null
  artes?: { id: string; nome: string; status_atual: string | null }[]
}

type Feedback = {
  id: string
  conteudo: string
  criado_em: string
  autor?: { nome?: string | null } | null
}

type Tarefa = {
  id: string
  titulo: string
  status: string
  prioridade: string
  prazo?: string | null
  projeto?: { nome?: string | null } | null
}

// ============================
// Página
// ============================

export default function DashboardPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [clientesCount, setClientesCount] = useState<number>(0)

  const [loading, setLoading] = useState(true)
  const [authIssue, setAuthIssue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [metricas, setMetricas] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    totalArtes: 0,
    artesAprovadas: 0,
    feedbacksRecentes: 0,
    tarefasPendentes: 0,
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)
      setAuthIssue(null)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr) console.error('Falha ao obter usuário:', userErr)
      if (!user) {
        setAuthIssue('Você precisa estar autenticado para ver o dashboard. Faça login e tente novamente.')
        setLoading(false)
        return
      }

      try {
        const [projetosQ, feedbacksQ, tarefasQ, clientesQ] = await Promise.all([
          supabase
            .from('projetos')
            .select(`id, nome, status, prazo, cliente:cliente_id ( nome ), artes (id, nome, status_atual)`) 
            .throwOnError(),
          supabase
            .from('feedbacks')
            .select(`id, conteudo, criado_em, autor:autor_id ( nome )`)
            .order('criado_em', { ascending: false })
            .limit(6)
            .throwOnError(),
          supabase
            .from('tarefas')
            .select(`id, titulo, status, prioridade, prazo, projeto:projeto_id ( nome )`)
            .in('status', ['PENDENTE', 'EM_ANDAMENTO'])
            .order('prazo', { ascending: true, nullsFirst: false })
            .limit(6)
            .throwOnError(),
          supabase
            .from('usuarios')
            .select('*', { count: 'exact', head: true })
            .eq('tipo', 'CLIENTE'),
        ])

        const projetosData = (projetosQ.data || []) as Projeto[]
        const feedbacksData = (feedbacksQ.data || []) as Feedback[]
        const tarefasData = (tarefasQ.data || []) as Tarefa[]

        setProjetos(projetosData)
        setFeedbacks(feedbacksData)
        setTarefas(tarefasData)
        setClientesCount(clientesQ.count ?? 0)

        const totalArtes = projetosData.reduce((acc, p) => acc + (p.artes?.length || 0), 0)
        const artesAprovadas = projetosData.reduce(
          (acc, p) => acc + (p.artes?.filter((a) => a.status_atual === 'APROVADO').length || 0),
          0
        )

        setMetricas({
          totalProjetos: projetosData.length,
          projetosAtivos: projetosData.filter((p) => p.status === 'EM_ANDAMENTO').length,
          totalArtes,
          artesAprovadas,
          feedbacksRecentes: feedbacksData.length,
          tarefasPendentes: tarefasData.length,
        })
      } catch (e: any) {
        console.error('Erro ao buscar dados do dashboard:', e)
        setError(e?.message || 'Erro ao carregar dados do dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="sr-only">Carregando…</span>
      </div>
    )

  if (authIssue)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">{authIssue}</p>
          <div className="mt-4">
            <Button
              onClick={() =>
                supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${getBaseUrl()}/auth/callback` },
                })
              }
            >
              Entrar com Google
            </Button>
          </div>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-destructive">{error}</div>
      </div>
    )

  const projetosEmAndamento = projetos.filter((p) => p.status === 'EM_ANDAMENTO')
  const mostrarOnboardingPrimeiro = clientesCount === 0 || projetos.length === 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mostrarOnboardingPrimeiro ? 'Vamos começar 🚀' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground">
            {mostrarOnboardingPrimeiro
              ? 'Complete os passos abaixo e desbloqueie sua primeira entrega'
              : 'Visão geral dos seus projetos e atividades'}
          </p>
        </div>
      </div>

      {/* Onboarding sempre visível no topo */}
      <section className="space-y-4">
        <StepCliente />
        <StepProjeto />
        <StepTime />
        <StepArte />
        <StepFeedback />
        <StepAprovacao />
        <StepConcluido />
      </section>

      {/* Grid Bento só quando já passou do início */}
      {!mostrarOnboardingPrimeiro && (
        <section className="grid gap-4 lg:grid-cols-6 auto-rows-[1fr]">
          {/* KPIs compactos */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo rápido</CardTitle>
              <CardDescription>Como você está hoje</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Projetos ativos</p>
                <p className="text-2xl font-semibold">{metricas.projetosAtivos}</p>
                <p className="text-[11px] text-muted-foreground">{metricas.totalProjetos} no total</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Artes aprovadas</p>
                <p className="text-2xl font-semibold">{metricas.artesAprovadas}</p>
                <p className="text-[11px] text-muted-foreground">{metricas.totalArtes} no total</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Feedbacks recentes</p>
                <p className="text-2xl font-semibold">{metricas.feedbacksRecentes}</p>
                <p className="text-[11px] text-muted-foreground">últimos itens</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Tarefas pendentes</p>
                <p className="text-2xl font-semibold">{metricas.tarefasPendentes}</p>
                <p className="text-[11px] text-muted-foreground">a fazer</p>
              </div>
            </CardContent>
          </Card>

          {/* Atividade recente (alto) */}
          <Card className="lg:col-span-2 lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Feedbacks e comentários</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbacks.slice(0, 5).map((fb) => (
                <div key={fb.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{fb.autor?.nome || 'Alguém'} comentou</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fb.conteudo}</p>
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem novidades por aqui 🙂</p>
              )}
              {feedbacks.length > 5 && (
                <div className="pt-2">
                  <Button asChild variant="link" className="px-0">
                    <Link href="/feedbacks">Ver tudo</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projetos em andamento (grande) */}
          <Card className="lg:col-span-4 lg:row-span-3">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2" />Projetos em andamento
              </CardTitle>
              <CardDescription>Progresso e prazos</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {projetosEmAndamento.slice(0, 6).map((projeto) => {
                const total = projeto.artes?.length || 0
                const aprovadas = projeto.artes?.filter((a) => a.status_atual === 'APROVADO').length || 0
                const progresso = total > 0 ? Math.round((aprovadas / total) * 100) : 0

                return (
                  <div key={projeto.id} className="border rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium truncate">{projeto.nome}</h4>
                      <Badge variant="secondary" className="shrink-0">{projeto.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Cliente: {projeto.cliente?.nome || '—'}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>{aprovadas}/{total} artes</span>
                      <span className="text-muted-foreground">Prazo: {projeto.prazo ? new Date(projeto.prazo).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    {total > 0 && <Progress value={progresso} className="h-2" />}
                    <div className="flex justify-end">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                        <Link href={`/projetos/${projeto.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
              {projetosEmAndamento.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum projeto em andamento</p>
              )}
            </CardContent>
          </Card>

          {/* Tarefas (médio) */}
          <Card className="lg:col-span-2 lg:row-span-2">
            <CardHeader>
              <CardTitle className="flex items-center"><Clock className="h-5 w-5 mr-2" />Tarefas urgentes</CardTitle>
              <CardDescription>Prazos mais próximos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tarefas.slice(0, 6).map((tarefa) => (
                <div key={tarefa.id} className="space-y-1 border rounded-md p-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-sm truncate">{tarefa.titulo}</h5>
                      <p className="text-xs text-muted-foreground truncate">{tarefa.projeto?.nome}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{tarefa.prioridade}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{tarefa.status}</Badge>
                    <span className="text-[11px] text-muted-foreground">{tarefa.prazo ? new Date(tarefa.prazo).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                </div>
              ))}
              {tarefas.length === 0 && (
                <p className="text-sm text-muted-foreground">Nada urgente por enquanto 🤙</p>
              )}
              {tarefas.length > 6 && (
                <div className="pt-2">
                  <Button asChild variant="link" className="px-0">
                    <Link href="/prazos">Abrir calendário</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações rápidas (fino) */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
              <CardDescription>Atalhos úteis</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm"><Link href="/projetos/novo">Novo projeto</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/artes/nova">Enviar arte</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/links">Gerar link</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link href="/feedbacks">Ver feedbacks</Link></Button>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
