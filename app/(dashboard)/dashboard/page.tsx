'use client'

import { FadeIn } from "@/components/layout/Motion";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Receipt, Wallet, AlertCircle, ArrowRight, CreditCard } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { pagamentosApi, SaldoInfo, Assinatura, Fatura, formatReais } from '@/lib/pagamentos'

import TrilhaInicial from '@/components/dashboard/TrilhaInicial'
import PainelDoDia from '@/components/dashboard/PainelDoDia'
import FilaDoDia, { type ItemDaFila } from '@/components/dashboard/FilaDoDia'
import ParadoNoCliente, { type ItemParado } from '@/components/dashboard/ParadoNoCliente'
import DesdeOntem, { type Evento } from '@/components/dashboard/DesdeOntem'
import EstaSemana, { type SemanaResumo } from '@/components/dashboard/EstaSemana'
import { prioridadeLabel } from '@/lib/tarefas'

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
  projeto?: { id?: string | null; nome?: string | null } | null
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
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
          <Wallet className="size-3.5" />
          Financeiro
        </h2>
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
    feedbacksRecentes: 0,
    tarefasPendentes: 0,
  })

  /*
   * As três perguntas que o Dashboard não respondia depois do onboarding: o que
   * mudou desde ontem, o que está parado no cliente, e quanto já foi entregue.
   * Nenhuma precisou de rota nova — /notificacoes já é o log de eventos do VIU,
   * /links guarda acessos e criadoEm, e a Aprovacao tem decididoEm.
   */
  const [links, setLinks] = useState<any[]>([])
  // Sem isto, `links` vazio por ainda não ter carregado e vazio por não existir
  // link nenhum são indistinguíveis — e a dica do vazio sairia errada num piscar.
  const [contextoCarregado, setContextoCarregado] = useState(false)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [aprovacoes, setAprovacoes] = useState<any[]>([])

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
                // `/tarefas` já devolve projeto: { id, nome } — o id era jogado
                // fora aqui, e sem ele a tarefa não tem como abrir no projeto.
                projeto: t.projeto ? { id: t.projeto.id, nome: t.projeto.nome } : null,
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

  /*
   * Efeito próprio: estas três faixas são contexto, não a ação do dia. Se uma
   * delas demorar ou falhar, a fila já está na tela — por isso allSettled e
   * nenhum setLoading aqui.
   */
  useEffect(() => {
    if (authLoading) return
    Promise.allSettled([
      api.get<{ data: any[] }>('/links'),
      api.get<{ data: any[] }>('/notificacoes?limit=100'),
      api.get<{ data: any[] }>('/aprovacoes?status=APROVADO&limit=100'),
    ]).then(([linksRes, notifRes, aprovRes]) => {
      if (linksRes.status === 'fulfilled') setLinks(linksRes.value.data ?? [])
      if (notifRes.status === 'fulfilled') setNotificacoes(notifRes.value.data ?? [])
      if (aprovRes.status === 'fulfilled') setAprovacoes(aprovRes.value.data ?? [])
      setContextoCarregado(true)
    })
  }, [authLoading])

  const displayName = user?.nome ?? (user as any)?.email?.split('@')[0] ?? 'você'

  const temProjeto = projetos.length > 0

  /*
   * Antes: `onboardingConcluido = temProjetoConcluido || (temProjeto &&
   * metricas.artesAprovadas > 0)`. O segundo termo era morto — `artesAprovadas`
   * nunca saía do literal 0 —, então a única saída da trilha era ter um projeto
   * com status CONCLUÍDO. Nenhum dos quatro passos conclui projeto: dava para
   * cadastrar cliente, criar projeto, subir arte e mandar o link, ver a trilha
   * se dar por encerrada, e ainda assim ficar sem Dashboard até fechar um
   * projeto inteiro — semanas depois, no primeiro projeto real.
   *
   * Agora são duas perguntas separadas, porque são duas coisas diferentes:
   *
   *   o Dashboard aparece quando existe projeto — é o portão de qualquer
   *   métrica, e quem chegou até aqui já tem o que olhar;
   *
   *   a trilha continua acima enquanto os quatro passos não fecham, e some
   *   quando ela própria avisa que fecharam. Quem sabe disso é ela: o
   *   progresso dos passos 1 e 4 vem de duas buscas que só existem lá dentro.
   *   Foi manter uma segunda regra aqui que criou o problema.
   */
  const [trilhaConcluida, setTrilhaConcluida] = useState(false)
  const aoConcluirTrilha = useCallback(() => setTrilhaConcluida(true), [])
  const mostrarTrilha = !trilhaConcluida
  const mostrarDashboard = temProjeto

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

  const diasAte = (iso: string) =>
    Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

  /**
   * Uma fila só, em ordem de quem está esperando: primeiro outra pessoa
   * (feedback), depois o seu roteiro (tarefa), por último o calendário.
   * Eram três cartões do mesmo tamanho, como se escolher entre eles fosse
   * trabalho de quem lê.
   */
  const fila: ItemDaFila[] = [
    ...feedbacks.slice(0, 4).map<ItemDaFila>(f => ({
      id: f.id,
      tipo: 'feedback',
      titulo: `${f.autor?.nome || 'Alguém'} comentou`,
      apoio: f.conteudo,
      href: '/feedbacks',
    })),
    ...tarefas.slice(0, 3).map<ItemDaFila>(t => ({
      id: t.id,
      tipo: 'tarefa',
      titulo: t.titulo,
      apoio: [t.projeto?.nome, prioridadeLabel[t.prioridade] ?? t.prioridade]
        .filter(Boolean)
        .join(' · '),
      // A tarefa mora dentro do projeto, e é lá que ela abre — /tarefas agora
      // só redireciona. `/tarefas` já devolve projeto.id no include.
      href: t.projeto?.id ? `/projetos/${t.projeto.id}?tab=tasks` : '/projetos',
    })),
    ...proximosPrazos.slice(0, 3).map<ItemDaFila>(p => {
      const dias = diasAte(p.prazo as string)
      return {
        id: p.id,
        tipo: 'prazo',
        titulo: p.nome,
        apoio:
          dias < 0
            ? `Passou do prazo em ${new Date(p.prazo as string).toLocaleDateString('pt-BR')}`
            : dias === 0
              ? 'Entrega hoje'
              : `Entrega em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
        href: `/projetos/${p.id}`,
      }
    }),
  ]

  /* ---------- Parado no cliente ---------- */

  const meiaNoite = (recuoEmDias = 0) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - recuoEmDias)
    return d
  }
  /** Segunda-feira como início: é a semana de trabalho, não a do calendário. */
  const inicioDaSemana = (recuoEmSemanas = 0) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - recuoEmSemanas * 7)
    return d
  }

  /* Uma arte já aprovada não está parada — está pronta. */
  const artesAprovadas = new Set(
    aprovacoes.map((a: any) => a.arteId ?? a.arte?.id).filter(Boolean),
  )

  const itensParados: ItemParado[] = links
    .filter((l: any) => {
      if (l.revogado) return false
      if (l.expiraEm && new Date(l.expiraEm).getTime() < Date.now()) return false
      const arteId = l.arte?.id
      return !!arteId && !artesAprovadas.has(arteId)
    })
    .map((l: any) => ({
      id: String(l.id),
      arte: l.arte?.nome || 'Arte sem nome',
      cliente: l.arte?.projeto?.cliente?.nome || 'O cliente',
      dias: Math.max(0, Math.floor((Date.now() - new Date(l.criadoEm).getTime()) / 86400000)),
      aberto: (l.acessos ?? 0) > 0,
      href: `/artes/${l.arte.id}`,
    }))
    // Quem nunca abriu vem primeiro: o link pode nem ter chegado, e é a única
    // das duas situações em que reenviar resolve.
    .sort((a, b) => Number(a.aberto) - Number(b.aberto) || b.dias - a.dias)
    .slice(0, 4)

  /* ---------- Desde ontem ---------- */

  const DESTINO_POR_TIPO: Record<string, string> = {
    NOVO_PROJETO: '/projetos',
    NOVA_ARTE: '/artes',
    NOVO_FEEDBACK: '/feedbacks',
    APROVACAO: '/artes',
    PRAZO: '/prazos',
  }

  const desdeOntem = meiaNoite(1).getTime()
  const eventosDesdeOntem: Evento[] = notificacoes
    .filter((n: any) => new Date(n.criadoEm ?? n.criado_em ?? 0).getTime() >= desdeOntem)
    .sort(
      (a: any, b: any) =>
        new Date(b.criadoEm ?? b.criado_em).getTime() - new Date(a.criadoEm ?? a.criado_em).getTime(),
    )
    .slice(0, 6)
    .map((n: any) => ({
      id: String(n.id),
      titulo: n.titulo ?? 'Atividade',
      apoio: n.conteudo ?? null,
      hora: new Date(n.criadoEm ?? n.criado_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      // Notificacao não guarda o id do recurso, só o tipo — dá para levar à
      // tela certa, não à linha certa. Melhor isso que um link que erra o alvo.
      href: DESTINO_POR_TIPO[n.tipo] ?? null,
    }))

  /* ---------- Esta semana ---------- */

  /** `decididoEm` é quando a aprovação saiu de PENDENTE — é a data da entrega. */
  const decididasEm = aprovacoes
    .map((a: any) => a.decididoEm ?? a.decidido_em)
    .filter(Boolean)
    .map((d: string) => new Date(d).getTime())

  const historicoAprovacoes = [3, 2, 1, 0].map((recuo) => {
    const inicio = inicioDaSemana(recuo).getTime()
    const fim = recuo === 0 ? Infinity : inicioDaSemana(recuo - 1).getTime()
    return decididasEm.filter((t) => t >= inicio && t < fim).length
  })

  const proximaFatura = [...faturasPendentes]
    .filter(f => f.dataVencimento)
    .sort((a, b) =>
      new Date(a.dataVencimento as string).getTime() - new Date(b.dataVencimento as string).getTime())[0]

  const resumoSemana: SemanaResumo = {
    aprovacoes: historicoAprovacoes[historicoAprovacoes.length - 1],
    historico: historicoAprovacoes,
    aReceberCentavos: faturasPendentes.reduce((soma, f) => soma + (f.valor ?? 0), 0),
    proximaFatura: proximaFatura
      ? {
          id: proximaFatura.id,
          vence: new Date(proximaFatura.dataVencimento as string).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
        }
      : null,
  }

  /*
   * Enquanto a conta está se montando, um cartão vazio não é "nada acontecendo"
   * — é "falta um passo". Dizer qual evita que a pessoa ache que o produto está
   * quebrado, e evita a pergunta "e agora?" em quatro lugares ao mesmo tempo.
   */
  const temArte = metricas.totalArtes > 0
  const proximoPasso: 'arte' | 'link' | null =
    !contextoCarregado ? null : !temArte ? 'arte' : links.length === 0 ? 'link' : null

  const prazoProximo = proximosPrazos[0]
    ? { nome: proximosPrazos[0].nome, dias: diasAte(proximosPrazos[0].prazo as string) }
    : null

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
      {/*
        * O título era "Dashboard ✶" com a linha "Aqui vai um panorama do seu
        * estúdio hoje" embaixo — duas linhas que ninguém lê duas vezes, no
        * lugar mais valioso da tela. Quem já entrou sabe onde está; o que ele
        * não sabe é o que precisa dele.
        */}
      {/* O cabeçalho de boas-vindas é só de quem ainda não tem projeto: com o
          Dashboard na tela, ele competiria com o recado do dia. */}
      {mostrarTrilha && !temProjeto && (
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Vamos começar ✶</h1>
          <p className="text-sm text-muted-foreground">
            Oi, {displayName}! Complete os passos abaixo e desbloqueie sua primeira entrega.
          </p>
        </div>
      )}

      {mostrarTrilha && (
        <TrilhaInicial
          /* Não há rota de "meus clientes" — GET /usuarios é ADMIN-only, e a
             tela de Clientes também deriva de projetos. Como criar projeto
             exige clienteId, ter projeto prova ter cliente. */
          temCliente={projetos.some(p => !!p.cliente)}
          temProjeto={temProjeto}
          temArte={metricas.totalArtes > 0}
          projetoId={projetos[0]?.id}
          clienteNome={projetos[0]?.cliente?.nome}
          aoConcluir={aoConcluirTrilha}
        />
      )}

      {mostrarDashboard && (
        <div className="flex flex-col gap-4">
          <PainelDoDia
            nome={displayName}
            pendencia={{
              feedbacks: metricas.feedbacksRecentes,
              tarefas: metricas.tarefasPendentes,
              prazoProximo,
              temArte,
            }}
          />

          {/*
            * Os números em uma linha, não em quatro caixas dentro de um
            * cartão. Quem procura o número acha; quem veio trabalhar não
            * tropeça neles antes de chegar na fila.
            */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-sm text-muted-foreground">
            <span>
              <b className="font-semibold tabular-nums text-foreground">{metricas.projetosAtivos}</b>{' '}
              {metricas.projetosAtivos === 1 ? 'projeto ativo' : 'projetos ativos'}
            </span>
            <span>
              <b className="font-semibold tabular-nums text-foreground">{metricas.totalArtes}</b>{' '}
              {metricas.totalArtes === 1 ? 'arte' : 'artes'}
            </span>
            <span>
              <b className="font-semibold tabular-nums text-foreground">{metricas.feedbacksRecentes}</b>{' '}
              {metricas.feedbacksRecentes === 1 ? 'feedback' : 'feedbacks'}
            </span>
            <span>
              <b className="font-semibold tabular-nums text-foreground">{metricas.tarefasPendentes}</b>{' '}
              {metricas.tarefasPendentes === 1 ? 'tarefa aberta' : 'tarefas abertas'}
            </span>
          </div>

          {/*
            * Duas linhas, e a ordem é a da urgência: em cima o que se faz
            * agora — a sua fila, e ao lado o que não está na sua mão. Embaixo
            * o contexto, que se lê e não se responde.
            */}
          {/* `items-start`: sem isso a coluna da direita estica para acompanhar
              a fila, e duas linhas paradas viram uma caixa de meia tela vazia. */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
            <FilaDoDia itens={fila} proximoPasso={proximoPasso} />
            <ParadoNoCliente itens={itensParados} proximoPasso={proximoPasso} />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
            <DesdeOntem eventos={eventosDesdeOntem} proximoPasso={proximoPasso} />
            <EstaSemana resumo={resumoSemana} />
          </div>

          {/* "Seus projetos" sai da primeira linha e desce inteiro: é
              navegação, não coisa a fazer hoje. */}
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                  Seus projetos
                </h2>
                <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                  <Link href="/projetos?novo=1">Novo projeto</Link>
                </Button>
              </div>

              {projetosEmAndamento.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-dashed bg-pastel-lavanda/15 p-4">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-pastel-lavanda">
                    <FolderOpen className="size-4 text-foreground/70" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Nenhum projeto em andamento</p>
                    <p className="text-xs text-muted-foreground">
                      É por onde o trabalho entra no VIU.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {projetosEmAndamento.slice(0, 5).map(projeto => (
                    <li key={projeto.id} className="border-b last:border-b-0">
                      <Link
                        href={`/projetos/${projeto.id}`}
                        className="block rounded-md py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <span className="block truncate text-sm font-medium">{projeto.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {projeto.cliente?.nome || 'Sem cliente'} ·{' '}
                          {projeto._count?.artes ?? 0} {(projeto._count?.artes ?? 0) === 1 ? 'arte' : 'artes'}
                          {projeto.prazo
                            ? ` · entrega ${new Date(projeto.prazo).toLocaleDateString('pt-BR')}`
                            : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <FinanceiroCard
            isDesigner={isDesigner}
            faturasPendentes={faturasPendentes}
            saldo={saldo}
            assinatura={assinatura}
          />
        </div>
      )}
    </FadeIn>
  )
}
