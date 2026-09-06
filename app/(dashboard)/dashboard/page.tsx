'use client'

import { FadeIn } from "@/components/layout/Motion";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen, Clock, MessageSquare, CalendarDays, Rocket,
  Receipt, Wallet, AlertCircle, ArrowRight, CreditCard
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { pagamentosApi, SaldoInfo, Assinatura, Fatura, formatReais } from '@/lib/pagamentos'

import StepCliente from '@/components/dashboard/StepCliente'
import StepProjeto from '@/components/dashboard/StepProjeto'
import StepTime from '@/components/dashboard/StepTime'
import StepArte from '@/components/dashboard/StepArte'
import StepFeedback from '@/components/dashboard/StepFeedback'
import StepAprovacao from '@/components/dashboard/StepAprovacao'
import StepConcluido from '@/components/dashboard/StepConcluido'
import { prioridadeLabel, statusLabel } from '@/lib/tarefas'
import type { ProjetoStatus } from '@/lib/projects'
import StatusBadge from '@/components/projetos/StatusBadge'

type Projeto = {
  id: string
  nome: string
  status: string
  prazo?: string | null
  cliente?: { nome?: string | null } | null
  _count?: { artes?: number }
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

// --- mini financial card ---

function FinanceiroCard({
  isDesigner,
  faturasPendentes,
  saldo,
  assinatura,
}: {
  isDesigner: boolean
  faturasPendentes: Fatura[]
  saldo: SaldoInfo | null
  assinatura: Assinatura | null
}) {
  const assinaturaAlerta =
    !assinatura || assinatura.status === 'CANCELADA' || assinatura.status === 'EXPIRADA'

  return (
    <Card className="h-full flex flex-col min-h-[360px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base gap-2">
          <Wallet className="h-5 w-5" />
          Financeiro
        </CardTitle>
        <CardDescription>Resumo de pagamentos</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {/* assinatura alert */}
        {assinaturaAlerta && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
          >
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-300">
                {!assinatura ? 'Sem assinatura ativa' : `Assinatura ${assinatura.status.toLowerCase()}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Escolha um plano para continuar usando o VIU.
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-amber-300 hover:text-amber-200 flex-shrink-0">
              <Link href="/planos">Ver planos</Link>
            </Button>
          </motion.div>
        )}

        {/* saldo designer */}
        {isDesigner && saldo && (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
            <motion.p
              key={saldo.saldo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 dark:text-emerald-400"
            >
              {saldo.saldoFormatado}
            </motion.p>
            {saldo.saldo > 0 && (
              <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-0 gap-1 text-xs">
                <Link href="/saques">
                  Sacar <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* faturas pendentes (cliente) */}
        {!isDesigner && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Faturas pendentes</p>
              <Button asChild size="sm" variant="ghost" className="h-6 px-1 text-[11px] gap-1">
                <Link href="/faturas">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            {faturasPendentes.length === 0 ? (
              <p className="text-sm font-medium text-muted-foreground mt-1">Nenhuma pendente 🎉</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {faturasPendentes.slice(0, 3).map(f => (
                  <Link key={f.id} href={`/faturas/${f.id}`}>
                    <div className="flex items-center justify-between rounded-md hover:bg-muted/40 transition px-1 py-1">
                      <p className="text-xs truncate">{f.projeto.nome}</p>
                      <span className="text-xs font-semibold tabular-nums ml-2 flex-shrink-0 text-amber-400">
                        {f.valorFormatado}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* faturas pendentes designer */}
        {isDesigner && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Faturas a receber</p>
              <Button asChild size="sm" variant="ghost" className="h-6 px-1 text-[11px] gap-1">
                <Link href="/faturas">
                  Ver <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
            {faturasPendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">Nenhuma pendente</p>
            ) : (
              <p className="text-2xl font-semibold tabular-nums mt-1">{faturasPendentes.length}</p>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline">
            <Link href="/assinaturas"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Assinatura</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/faturas"><Receipt className="h-3.5 w-3.5 mr-1.5" />Faturas</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    totalArtes: 0,
    artesAprovadas: 0,
    feedbacksRecentes: 0,
    tarefasPendentes: 0,
  })

  // financial state
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null)
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)
  const [faturasPendentes, setFaturasPendentes] = useState<Fatura[]>([])

  const isDesigner = (user as any)?.tipo === 'DESIGNER'

  useEffect(() => {
    if (authLoading) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [projetosRes, feedbacksRes, tarefasRes] = await Promise.allSettled([
          api.get<{ data: any[] }>('/projetos?limit=10'),
          api.get<{ data: any[] }>('/feedbacks?limit=10').catch(() => ({ data: [] as any[] })),
          api.get<{ data: any[] }>('/tarefas?status=PENDENTE&limit=10').catch(() => ({ data: [] as any[] })),
        ])

        const projetosData: Projeto[] =
          projetosRes.status === 'fulfilled'
            ? (projetosRes.value.data ?? []).map((p: any) => ({
                id: p.id, nome: p.nome, status: p.status,
                prazo: p.prazo ?? null,
                cliente: p.cliente ? { nome: p.cliente.nome } : null,
                _count: p._count,
              }))
            : []

        const feedbacksData: Feedback[] =
          feedbacksRes.status === 'fulfilled'
            ? (feedbacksRes.value.data ?? []).map((f: any) => ({
                id: f.id, conteudo: f.conteudo,
                criado_em: f.criadoEm ?? f.criado_em ?? '',
                autor: f.autor ? { nome: f.autor.nome } : null,
              }))
            : []

        const tarefasData: Tarefa[] =
          tarefasRes.status === 'fulfilled'
            ? (tarefasRes.value.data ?? []).map((t: any) => ({
                id: t.id, titulo: t.titulo, status: t.status,
                prioridade: t.prioridade ?? 'MEDIA',
                prazo: t.prazo ?? null,
                projeto: t.projeto ? { nome: t.projeto.nome } : null,
              }))
            : []

        setProjetos(projetosData)
        setFeedbacks(feedbacksData)
        setTarefas(tarefasData)

        const totalArtes = projetosData.reduce((acc, p) => acc + (p._count?.artes ?? 0), 0)
        setMetricas({
          totalProjetos: projetosData.length,
          projetosAtivos: projetosData.filter(p => p.status === 'EM_ANDAMENTO').length,
          totalArtes,
          artesAprovadas: 0,
          feedbacksRecentes: feedbacksData.length,
          tarefasPendentes: tarefasData.length,
        })
      } catch (e) {
        console.error('Erro ao buscar dados do dashboard:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [authLoading])

  // financial data — separate effect, non-blocking
  useEffect(() => {
    if (authLoading) return
    const tipo = isDesigner ? 'designer' : 'cliente'
    Promise.allSettled([
      pagamentosApi.getMinhaAssinatura(),
      pagamentosApi.getFaturas(tipo),
      isDesigner ? pagamentosApi.getSaldo() : Promise.resolve(null),
    ]).then(([assinaturaRes, faturasRes, saldoRes]) => {
      if (assinaturaRes.status === 'fulfilled') setAssinatura(assinaturaRes.value.data)
      if (faturasRes.status === 'fulfilled') {
        const pendentes = (faturasRes.value.data ?? []).filter(f => f.status === 'PENDENTE')
        setFaturasPendentes(pendentes)
      }
      if (saldoRes.status === 'fulfilled' && saldoRes.value) setSaldo(saldoRes.value.data)
    }).catch(console.error)
  }, [authLoading, isDesigner])

  const displayName = user?.nome ?? (user as any)?.email?.split('@')[0] ?? 'você'

  const temProjeto = projetos.length > 0
  const temProjetoConcluido = useMemo(
    () => projetos.some(p =>
      ['CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'FINALIZADA'].includes(p.status?.toUpperCase?.() ?? '')
    ),
    [projetos]
  )
  const onboardingConcluido = temProjetoConcluido || (temProjeto && metricas.artesAprovadas > 0)
  const mostrarOnboarding = !onboardingConcluido

  if (loading || authLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="sr-only">Carregando…</span>
      </div>
    )

  const projetosEmAndamento = projetos.filter(p => p.status === 'EM_ANDAMENTO')
  const proximosPrazos = [...projetos]
    .filter(p => p.prazo)
    .sort((a, b) => new Date(a.prazo as string).getTime() - new Date(b.prazo as string).getTime())
    .slice(0, 6)

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mostrarOnboarding ? 'Vamos começar ✶' : 'Dashboard ✶'}
          </h1>
          <p className="text-sm text-muted-foreground">
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

      {!mostrarOnboarding && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="text-xs text-muted-foreground">Artes</p>
                  <p className="text-2xl font-semibold">{metricas.totalArtes}</p>
                  {/* dizia só "no total" embaixo do total — legenda sem informação */}
                  <p className="text-[11px] text-muted-foreground">{metricas.artesAprovadas} aprovadas</p>
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

          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividade recente</CardTitle>
              <CardDescription>Feedbacks e comentários</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 h-full overflow-y-auto overflow-x-hidden pr-1">
                {feedbacks.slice(0, 10).map(fb => (
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
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Sem novidades por aqui 🙂
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ações rápidas</CardTitle>
              <CardDescription>Atalhos que você realmente usa</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href="/projetos/novo">Novo projeto</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/artes/nova">Enviar arte</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href="/artes">Gerar link</Link></Button>
                <Button asChild size="sm" variant="ghost"><Link href="/feedbacks">Ver feedbacks</Link></Button>
              </div>
              <div className="mt-4 rounded-md border p-3 text-xs text-muted-foreground">
                Dica: arraste e solte arquivos na página de{' '}
                <Link href="/artes" className="underline underline-offset-4">Artes</Link>.
              </div>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <FolderOpen className="h-5 w-5 mr-2" />
                Projetos em andamento
              </CardTitle>
              <CardDescription>Progresso e prazos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 gap-3 max-h-full overflow-y-auto overflow-x-hidden pr-1">
                {projetosEmAndamento.slice(0, 8).map(projeto => (
                  <div key={projeto.id} className="rounded-lg border p-3 card-interativo">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium truncate">{projeto.nome}</h4>
                        <p className="text-xs text-muted-foreground truncate">Cliente: {projeto.cliente?.nome || '—'}</p>
                      </div>
                      <StatusBadge status={projeto.status as ProjetoStatus} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span>{projeto._count?.artes ?? 0} artes</span>
                      <span className="text-muted-foreground">
                        <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                        {projeto.prazo ? new Date(projeto.prazo).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                        <Link href={`/projetos/${projeto.id}`}>Abrir</Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {projetosEmAndamento.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">Nenhum projeto em andamento</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Clock className="h-5 w-5 mr-2" />
                Tarefas urgentes
              </CardTitle>
              <CardDescription>Prazos mais próximos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 max-h-full overflow-y-auto overflow-x-hidden pr-1">
                {tarefas.slice(0, 10).map(tarefa => (
                  <div key={tarefa.id} className="space-y-1 border rounded-md p-2 hover:bg-muted/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h5 className="font-medium text-sm truncate">{tarefa.titulo}</h5>
                        <p className="text-xs text-muted-foreground truncate">{tarefa.projeto?.nome}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{prioridadeLabel[tarefa.prioridade] ?? tarefa.prioridade}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{statusLabel[tarefa.status] ?? tarefa.status}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {tarefa.prazo ? new Date(tarefa.prazo).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>
                  </div>
                ))}
                {tarefas.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">Nada urgente por enquanto 🦙</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="h-full flex flex-col min-h-[360px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <CalendarDays className="h-5 w-5 mr-2" />
                Próximos prazos
              </CardTitle>
              <CardDescription>O que vence primeiro</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="space-y-3 max-h-full overflow-y-auto overflow-x-hidden pr-1">
                {proximosPrazos.length > 0 ? (
                  proximosPrazos.map(p => (
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
                      <div className="mt-2 flex justify-end">
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                          <Link href={`/projetos/${p.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-6">Sem prazos cadastrados</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* financial card */}
          <FinanceiroCard
            isDesigner={isDesigner}
            faturasPendentes={faturasPendentes}
            saldo={saldo}
            assinatura={assinatura}
          />
        </section>
      )}
    </FadeIn>
  )
}
