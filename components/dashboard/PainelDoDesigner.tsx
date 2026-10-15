'use client'
import { podeVerFinanceiro } from '@/lib/financeiro';
import AdminOnly from '@/components/layout/AdminOnly';

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Receipt, Wallet, AlertCircle, ArrowRight, CreditCard } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { api, getAll } from '@/lib/api'
import { destinoDaNotificacao, type Notificacao } from '@/lib/notificacoes'
import { diasAte, formatarDia } from '@/lib/diaDeCalendario'
import { pagamentosApi, SaldoInfo, type Vigencia, Fatura } from '@/lib/pagamentos'

import TrilhaInicial from '@/components/dashboard/TrilhaInicial'
import PainelDoDia from '@/components/dashboard/PainelDoDia'
import FilaDoDia, { type ItemDaFila } from '@/components/dashboard/FilaDoDia'
import ParadoNoCliente, { type ItemParado } from '@/components/dashboard/ParadoNoCliente'
import FunilDoLink from '@/components/dashboard/FunilDoLink'
import DesdeOntem, { type Evento } from '@/components/dashboard/DesdeOntem'
import EstaSemana, { type SemanaResumo } from '@/components/dashboard/EstaSemana'


type Projeto = {
  id: string
  nome: string
  status: string
  prazo?: string | null
  cliente?: { nome?: string | null } | null
  /**
   * Quem ocupa cada ponta — porque agora as duas podem ser esta pessoa.
   *
   * Ser cliente virou posição no projeto, não tipo de conta: um designer pode
   * contratar outro. Sem estes dois ids, a linha do projeto onde ELE é o
   * cliente saía como "Marca do estúdio da Ana — Ana Silva", ou seja, ela
   * própria listada como cliente de si mesma.
   */
  clienteId?: string | null
  designer?: { nome?: string | null } | null
  _count?: { artes?: number }
}

type Feedback = {
  id: string
  conteudo: string
  criado_em: string
  arteId: string
  autor?: { nome?: string | null } | null
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
  assinatura: Vigencia | null
}) {
  /*
   * O aviso só aparece quando há o que fazer.
   *
   * Antes disparava para TODO designer: a condição era `!assinatura`, e
   * assinatura era `null` para quem não tinha linha — ou seja, para todo mundo
   * que se cadastrou antes de o produto passar a criar a do Gratuito. O painel
   * abria com "Sem assinatura ativa — Escolha um plano para continuar usando o
   * VIU" de forma permanente, enquanto a taxa e os limites já vinham do
   * Gratuito. Alarme que toca sempre é alarme que ninguém escuta.
   *
   * Estar no Gratuito não é problema. Problema é a cobrança ter parado
   * (PAUSADA), o checkout não ter fechado (PENDENTE) ou a assinatura estar
   * correndo para o fim depois de cancelada.
   */
  const linha = assinatura?.assinatura ?? null
  const aviso: { titulo: string; texto: string } | null = assinatura?.cancelada
    ? {
        titulo: 'Assinatura cancelada',
        texto: assinatura.vigenteAte
          ? `Seu plano vale até ${formatarDia(assinatura.vigenteAte, { day: '2-digit', month: 'short', year: 'numeric' })}. Depois disso você volta ao Gratuito.`
          : 'Você volta ao plano Gratuito ao fim do período pago.',
      }
    : linha?.status === 'PAUSADA'
      ? {
          titulo: 'Assinatura pausada',
          texto: 'A cobrança recorrente parou. Revise o pagamento para continuar no plano.',
        }
      : linha?.status === 'PENDENTE'
        ? {
            titulo: 'Assinatura aguardando pagamento',
            texto: 'O checkout ainda não foi concluído. Termine para ativar o plano.',
          }
        : null

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
          <Wallet className="size-3.5" />
          Financeiro
        </h2>
        {/* assinatura alert */}
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
          >
            {/* `amber-400` sozinho é claro demais sobre o cartão branco: a
                variante escura entra só no tema escuro. */}
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{aviso.titulo}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{aviso.texto}</p>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-7 flex-shrink-0 px-2 text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
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

/**
 * O painel de quem ENTREGA.
 *
 * Isto era `app/(dashboard)/dashboard/page.tsx` — uma tela só, servida a todo
 * mundo. O cliente entrava no VIU e recebia a fila do designer: "3 feedbacks
 * esperando você — o cliente comentou e ainda não teve resposta", "Parado no
 * cliente", e a trilha de onboarding mandando ele subir a primeira arte.
 * Nada disso é dele, e o `isDesigner` que existia aqui só trocava a origem
 * das faturas.
 *
 * Virou componente, e o `page.tsx` virou o roteador: são dois painéis, não um
 * painel com buracos. Assim o cliente também deixa de disparar as consultas
 * daqui — links, notificações, aprovações decididas — que para ele voltavam
 * vazias ou negadas.
 */
export default function PainelDoDesigner() {
  const { user, loading: authLoading } = useAuth()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [erro, setErro] = useState(false)
  const [erroFinanceiro, setErroFinanceiro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({
    totalProjetos: 0,
    projetosAtivos: 0,
    totalArtes: 0,
    feedbacksRecentes: 0,
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
  const [assinatura, setAssinatura] = useState<Vigencia | null>(null)
  const [saldo, setSaldo] = useState<SaldoInfo | null>(null)
  const [faturasPendentes, setFaturasPendentes] = useState<Fatura[]>([])

  const isDesigner = (user as any)?.tipo === 'DESIGNER'

  const carregar = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setErro(false)
    try {
      const [todosProjetos, comentarios, linksData, eventos, decisoes] = await Promise.all([
        getAll<any>('/projetos'),
        getAll<any>('/feedbacks?status=ABERTO'),
        api.get<{ data: any[] }>('/links').then(r => r.data ?? []),
        getAll<any>('/notificacoes'),
        getAll<any>('/aprovacoes'),
      ])
      // Aqui se acompanha o trabalho entregue pelo designer; suas contratações
      // continuam na fila pessoal e na lista de projetos.
      const meusProjetos = todosProjetos.filter(p => p.designer?.id === user.id)
      const ids = new Set(meusProjetos.map(p => p.id))
      const projetosData: Projeto[] = meusProjetos.map(p => ({
        id: p.id, nome: p.nome, status: p.status, prazo: p.prazo ?? null,
        cliente: p.cliente, clienteId: p.cliente?.id ?? p.clienteId,
        designer: p.designer,
        _count: { artes: p.metricas?.totalArtes ?? p._count?.artes ?? 0 },
      }))
      const comentariosAbertos = comentarios.filter(f =>
        ids.has(f.arte?.projeto?.id) &&
        (f.autorId ?? f.autor?.id) !== user.id &&
        !f.resolvidoEm && f.status !== 'RESOLVIDO' && !f.parentId,
      )
      setProjetos(projetosData)
      setFeedbacks(comentariosAbertos.map(f => ({
        id: f.id, arteId: f.arteId ?? f.arte?.id,
        conteudo: f.conteudo || f.transcricao || 'Comentário em áudio',
        criado_em: f.criadoEm ?? '', autor: f.autor,
      })))
      setMetricas({
        totalProjetos: projetosData.length,
        projetosAtivos: projetosData.filter(p => p.status === 'EM_ANDAMENTO').length,
        totalArtes: projetosData.reduce((n, p) => n + (p._count?.artes ?? 0), 0),
        feedbacksRecentes: comentariosAbertos.length,
          })
      setLinks(linksData.filter(l => l.criadorId === user.id))
      setNotificacoes(eventos)
      setAprovacoes(decisoes.filter(a => ids.has(a.arte?.projetoId ?? a.arte?.projeto?.id)))
      setContextoCarregado(true)
    } catch {
      setErro(true)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading) void carregar()
  }, [authLoading, carregar])

  // financial data — separate effect, non-blocking
  useEffect(() => {
    if (authLoading || !podeVerFinanceiro(user?.tipo)) return
    const tipo = isDesigner ? 'designer' : 'cliente'
    setErroFinanceiro(false)
    Promise.allSettled([
      pagamentosApi.getMinhaAssinatura(),
      pagamentosApi.getFaturas(tipo),
      isDesigner ? pagamentosApi.getSaldo() : Promise.resolve(null),
    ]).then(([assinaturaRes, faturasRes, saldoRes]) => {
      setErroFinanceiro([assinaturaRes, faturasRes, saldoRes].some(r => r.status === 'rejected'))
      if (assinaturaRes.status === 'fulfilled') setAssinatura(assinaturaRes.value.data)
      if (faturasRes.status === 'fulfilled') {
        const pendentes = (faturasRes.value.data ?? []).filter(f => f.status === 'PENDENTE')
        setFaturasPendentes(pendentes)
      }
      if (saldoRes.status === 'fulfilled' && saldoRes.value) setSaldo(saldoRes.value.data)
    }).catch(console.error)
  }, [authLoading, isDesigner, user?.tipo])

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

  if (erro) return (
    <section role="alert" className="rounded-xl border bg-card p-5">
      <h1 className="font-semibold">Não foi possível carregar seu painel</h1>
      <p className="mt-1 text-sm text-muted-foreground">Suas pendências não puderam ser verificadas. Tente novamente.</p>
      <Button className="mt-3" onClick={() => void carregar()}>Tentar novamente</Button>
    </section>
  )

  const projetosEmAndamento = projetos.filter(p => p.status === 'EM_ANDAMENTO')
  const proximosPrazos = [...projetosEmAndamento]
    .filter(p => p.prazo)
    .sort((a, b) => new Date(a.prazo as string).getTime() - new Date(b.prazo as string).getTime())
    .slice(0, 6)

  /**
   * Uma fila só, em ordem de quem está esperando: primeiro outra pessoa
   * (feedback), depois o seu roteiro (tarefa), por último o calendário.
   * Eram três cartões do mesmo tamanho, como se escolher entre eles fosse
   * trabalho de quem lê.
   */
  const ajustesPorArte = new Map<string, any>()
  for (const a of aprovacoes) {
    if (a.status === 'REJEITADO' && a.versaoNumero != null && a.versaoNumero === a.arte?.versao) {
      ajustesPorArte.set(a.arte.id, a)
    }
  }
  const ajustes = [...ajustesPorArte.values()]

  const fila: ItemDaFila[] = [
    ...ajustes.slice(0, 4).map<ItemDaFila>(a => ({
      id: `decisao-${a.id}`, tipo: 'feedback',
      titulo: `Ajustes pedidos em ${a.arte.nome}`,
      apoio: a.comentario || 'Confira a decisão antes de enviar a próxima versão.',
      href: `/artes?arte=${encodeURIComponent(a.arte.id)}`,
    })),
    ...feedbacks.slice(0, 4).map<ItemDaFila>(f => ({
      id: f.id,
      tipo: 'feedback',
      titulo: `${f.autor?.nome || 'Alguém'} comentou`,
      apoio: f.conteudo,
      href: f.arteId ? `/viewer/arte/${f.arteId}?feedback=${encodeURIComponent(f.id)}` : '/feedbacks',
    })),
    ...proximosPrazos.slice(0, 3).map<ItemDaFila>(p => {
      const dias = diasAte(p.prazo as string)
      return {
        id: p.id,
        tipo: 'prazo',
        titulo: p.nome,
        apoio:
          dias < 0
            ? `Passou do prazo em ${formatarDia(p.prazo as string)}`
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

  // Espera é uma solicitação de aprovação pendente da versão atual,
  // não a mera existência de um link. Uma linha por arte.
  const vistas = new Set<string>()
  const itensParados: ItemParado[] = aprovacoes
    .filter((a: any) => a.status === 'PENDENTE' &&
      a.versaoNumero != null && a.versaoNumero === a.arte?.versao && !ajustesPorArte.has(a.arte.id))
    .filter((a: any) => {
      if (vistas.has(a.arte.id)) return false
      vistas.add(a.arte.id)
      return true
    })
    .map((a: any) => ({
      id: a.id, arte: a.arte.nome, cliente: a.aprovador?.nome ?? 'Aprovador',
      dias: Math.max(0, Math.floor((Date.now() - new Date(a.criadoEm).getTime()) / 86400000)),
      aberto: null,
      href: `/viewer/arte/${a.arte.id}`,
    }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 4)

  /* ---------- Desde ontem ---------- */

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
      /*
       * A notificação agora guarda o que ela está falando (`entidadeTipo` e
       * `entidadeId`), então o evento leva à linha, não só à tela.
       *
       * Antes era um mapa de tipo para rota escrito aqui — e keyed pelo
       * vocabulário que o sistema havia parado de falar: dos cinco tipos,
       * só NOVO_FEEDBACK existia de verdade, então todo evento que não fosse
       * feedback nascia sem link nenhum.
       */
      href: destinoDaNotificacao(n as Notificacao),
    }))

  /* ---------- Esta semana ---------- */

  /** `decididoEm` é quando a aprovação saiu de PENDENTE — é a data da entrega. */
  const decididasEm = aprovacoes
    .filter((a: any) => a.status === 'APROVADO')
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
          vence: formatarDia(proximaFatura.dataVencimento as string, {
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
    /* A moldura (largura, respiro, espaçamento vertical) é do roteador: ela
       vale para os dois painéis, e repetir aqui daria padding em dobro. */
    <div className="space-y-6">
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
            comTrilha={mostrarTrilha}
            pendencia={{
              feedbacks: metricas.feedbacksRecentes,
              ajustes: ajustes.length ? { total: ajustes.length, href: `/artes?arte=${encodeURIComponent(ajustes[0].arte.id)}` } : undefined,
              tarefas: 0,
              prazoProximo,
              temArte,
            }}
          />

          {/*
            A linha de números saiu daqui.
            
            Ela ficava entre o recado do dia e a fila, e repetia os dois: o
            recado já diz "3 feedbacks esperando você" e a fila lista os três,
            um a um. A mesma pendência era anunciada três vezes antes de a
            pessoa poder tocar em qualquer uma — e a linha ficava no meio do
            caminho entre a manchete e o que ela resume.
            
            Os outros dois números (projetos ativos, total de artes) não são
            trabalho de hoje: "Seus projetos" logo abaixo lista os projetos, e
            o total de artes é estatística, não fila.
          */}
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
            {!erroFinanceiro && <EstaSemana resumo={resumoSemana} />}
          </div>

          {/* Contexto, como as duas faixas acima: diz onde a volta trava, não
              o que fazer hoje. Some sozinho para quem ainda não compartilhou
              nada e para o cliente, que recebe 403. */}
          <FunilDoLink />

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
                        <span className="block truncate text-sm font-medium">
                          {projeto.nome}
                          {/* Quando a pessoa é o CLIENTE deste projeto, dizer
                              isso. Sem a etiqueta a linha ficava "Marca do
                              estúdio da Ana — Ana Silva": ela listada como
                              cliente de si mesma, na própria fila de trabalho. */}
                          {projeto.clienteId && projeto.clienteId === user?.id ? (
                            <span className="ml-2 rounded-full border border-border bg-muted px-2 py-0.5 align-middle text-[10px] font-medium text-muted-foreground">
                              você é o cliente
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {projeto.clienteId && projeto.clienteId === user?.id
                            ? projeto.designer?.nome
                              ? `com ${projeto.designer.nome}`
                              : 'sem designer definido'
                            : projeto.cliente?.nome || 'Sem cliente'}{' '}
                          · {projeto._count?.artes ?? 0}{' '}
                          {(projeto._count?.artes ?? 0) === 1 ? 'arte' : 'artes'}
                          {projeto.prazo
                            ? ` · entrega ${formatarDia(projeto.prazo)}`
                            : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </div>

<AdminOnly>          {erroFinanceiro ? <p role="alert" className="rounded-xl border p-4 text-sm">Não foi possível carregar o financeiro. <Link className="underline" href="/faturas">Consultar faturas</Link></p> : <FinanceiroCard
            isDesigner={isDesigner}
            faturasPendentes={faturasPendentes}
            saldo={saldo}
            assinatura={assinatura}
          />}</AdminOnly>
        </div>
      )}
    </div>
  )
}
