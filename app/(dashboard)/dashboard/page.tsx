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
import {
  FolderOpen,
  Clock,
  MessageSquare,
  CalendarDays,
  Rocket,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// Onboarding steps
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

  const [displayName, setDisplayName] = useState<string>('você')

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

      const nameGuess =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        user.email?.split('@')?.[0] ||
        'você'
      setDisplayName(nameGuess)

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
            .limit(10)
            .throwOnError(),
          supabase
            .from('tarefas')
            .select(`id, titulo, status, prioridade, prazo, projeto:projeto_id ( nome )`)
            .in('status', ['PENDENTE', 'EM_ANDAMENTO'])
            .order('prazo', { ascending: true, nullsFirst: false })
            .limit(10)
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

  // ============================
  // Regras de visibilidade do Onboarding
  // ============================
  const { totalArtes, artesAprovadas } = metricas

  const temCliente = clientesCount > 0
  const temProjeto = projetos.length > 0
  const temProjetoConcluido = useMemo(
    () => projetos.some(p => ['CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'FINALIZADA'].includes(p.status?.toUpperCase?.() ?? '')),
    [projetos]
  )
  const temArteAprovada = totalArtes > 0 && artesAprovadas > 0

  const onboardingConcluido = temCliente && (temProjetoConcluido || (temProjeto && temArteAprovada))
  const mostrarOnboarding = !onboardingConcluido

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
              onClick={() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${origin}/auth/callback` },
                })
              }}
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

  // Prazos próximos — só com projetos que têm prazo
  const proximosPrazos = [...projetos]
    .filter(p => p.prazo)
    .sort((a, b) => new Date(a.prazo as string).getTime() - new Date(b.prazo as string).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6 p-6">
      {/* Header com carisma */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mostrarOnboarding ? 'Vamos começar ✦' : 'Dashboard ✦'}
          </h1>
          <p className="text-muted-foreground">
            {mostrarOnboarding
              ? `Oi, ${displayName}! Complete os passos abaixo e desbloqueie sua primeira entrega.`
              : `Bem-vindo(a), ${displayName}. Aqui vai um panorama do seu estúdio hoje.`}
          </p>
        </div>
        {!mostrarOnboarding && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Rocket className="h-4 w-4" />
            <span>Dica: use os atalhos abaixo para ganhar tempo</span>
          </div>
        )}
      </div>

      {/* Onboarding */}
      {mostrarOnboarding && (
        <section className="space-y-4">
          <StepCliente />
          <StepProjeto />
          <StepTime />
          <StepArte />
          <StepFeedback />
          <StepAprovacao />
          <StepConcluido />
        </section>
      )}

      {/* Dashboard 3×2 — todos os cards com mesma “altura” e rolagem interna */}
      {!mostrarOnboarding && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Hoje */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hoje</CardTitle>
              <CardDescription>Como você está indo</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid grid-cols-2 gap-3 h-full">
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
              </div>
            </CardContent>
          </Card>

          {/* 2. Atividade recente */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Feedbacks e comentários</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 h-full overflow-auto pr-1">
                {feedbacks.slice(0, 10).map((fb) => (
                  <div key={fb.id} className="flex gap-3 rounded-md border p-2 hover:bg-muted/40 transition">
                    <div className="w-8 h-8 bg-primary/10 rounded-full grid place-items-center">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fb.autor?.nome || 'Alguém'} comentou</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{fb.conteudo}</p>
                    </div>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">Sem novidades por aqui 🙂</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Ações rápidas */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
              <CardDescription>Atalhos que você realmente usa</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href="/projetos/novo">Novo projeto</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/artes/nova">Enviar arte</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/links">Gerar link</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link href="/feedbacks">Ver feedbacks</Link></Button>
              </div>
              <div className="mt-4 rounded-md border p-3 text-xs text-muted-foreground">
                Dica: arraste e solte arquivos na página de <Link href="/artes" className="underline underline-offset-4">Artes</Link>.
              </div>
            </CardContent>
          </Card>

          {/* 4. Projetos em andamento */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <FolderOpen className="h-5 w-5 mr-2" />
                Projetos em andamento
              </CardTitle>
              <CardDescription>Progresso e prazos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="grid gap-3 max-h-full overflow-auto pr-1">
                {projetosEmAndamento.slice(0, 8).map((projeto) => {
                  const total = projeto.artes?.length || 0
                  const aprovadas = projeto.artes?.filter((a) => a.status_atual === 'APROVADO').length || 0
                  const progresso = total > 0 ? Math.round((aprovadas / total) * 100) : 0

                  return (
                    <div key={projeto.id} className="rounded-lg border p-3 hover:shadow-sm transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{projeto.nome}</h4>
                          <p className="text-xs text-muted-foreground truncate">
                            Cliente: {projeto.cliente?.nome || '—'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{projeto.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span>{aprovadas}/{total} artes</span>
                        <span className="text-muted-foreground">
                          <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                          {projeto.prazo ? new Date(projeto.prazo).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                      {total > 0 && <Progress value={progresso} className="h-2 mt-2" />}
                      <div className="mt-2 flex justify-end">
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                          <Link href={`/projetos/${projeto.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {projetosEmAndamento.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Nenhum projeto em andamento
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 5. Tarefas urgentes */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Clock className="h-5 w-5 mr-2" />
                Tarefas urgentes
              </CardTitle>
              <CardDescription>Prazos mais próximos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 max-h-full overflow-auto pr-1">
                {tarefas.slice(0, 10).map((tarefa) => (
                  <div key={tarefa.id} className="space-y-1 border rounded-md p-2 hover:bg-muted/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h5 className="font-medium text-sm truncate">{tarefa.titulo}</h5>
                        <p className="text-xs text-muted-foreground truncate">{tarefa.projeto?.nome}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{tarefa.prioridade}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{tarefa.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {tarefa.prazo ? new Date(tarefa.prazo).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                  </div>
                ))}
                {tarefas.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Nada urgente por enquanto 🤙
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 6. Próximos prazos (novo) */}
          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <CalendarDays className="h-5 w-5 mr-2" />
                Próximos prazos
              </CardTitle>
              <CardDescription>O que vence primeiro</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 max-h-full overflow-auto pr-1">
                {proximosPrazos.length > 0 ? (
                  proximosPrazos.map((p) => {
                    const total = p.artes?.length || 0
                    const aprovadas = p.artes?.filter((a) => a.status_atual === 'APROVADO').length || 0
                    const pct = total > 0 ? Math.round((aprovadas / total) * 100) : 0
                    return (
                      <div key={p.id} className="rounded-md border p-3 hover:bg-muted/40 transition">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">Cliente: {p.cliente?.nome || '—'}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {p.prazo ? new Date(p.prazo).toLocaleDateString('pt-BR') : '—'}
                          </Badge>
                        </div>
                        {total > 0 && <Progress value={pct} className="h-2 mt-2" />}
                        <div className="mt-2 flex justify-end">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link href={`/projetos/${p.id}`}>Abrir</Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Sem prazos cadastrados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
