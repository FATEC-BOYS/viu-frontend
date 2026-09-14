'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { pagamentosApi, type Fatura, formatReais } from '@/lib/pagamentos'
import AguardandoVoce from '@/components/dashboard/AguardandoVoce'
import { Miniatura, Pilula } from '@/components/dashboard/pecasDoCartao'

/**
 * O painel de quem CONTRATA.
 *
 * Antes não existia: o cliente recebia a tela do designer inteira — "3
 * feedbacks esperando você / o cliente comentou e ainda não teve resposta",
 * "Parado no cliente", "a receber esta semana" e a trilha de onboarding
 * mandando subir a primeira arte. Tudo verdadeiro, nada dele.
 *
 * A ordem da tela é a ordem da urgência dele:
 *
 *   1. o que espera decisão   — a fila, com a peça grande e um botão
 *   2. o que está andando     — os projetos, para saber onde as coisas estão
 *   3. o que ele deve         — abaixo da dobra, porque cobrança não é a
 *                               primeira coisa que alguém quer ver ao entrar
 *
 * Sem gráfico e sem métrica de operação: medir a produção é assunto de quem
 * entrega. Repetir esses números aqui seria dar ao cliente um painel de gestão
 * de um negócio que não é o dele.
 */

type ProjetoDoCliente = {
  id: string
  nome: string
  status: string
  prazo: string | null
  designer: string | null
  capa: string | null
}

const ROTULO_STATUS: Record<string, string> = {
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado',
}

const TOM_STATUS: Record<string, 'atencao' | 'neutro' | 'feito'> = {
  EM_ANDAMENTO: 'neutro',
  CONCLUIDO: 'feito',
  PAUSADO: 'neutro',
  CANCELADO: 'neutro',
}

function prazoEmPalavras(prazo: string | null): string | null {
  if (!prazo) return null
  const dias = Math.ceil((new Date(prazo).getTime() - Date.now()) / 86400000)
  if (!Number.isFinite(dias)) return null
  if (dias < 0) return `prazo passou há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'prazo é hoje'
  if (dias === 1) return 'prazo é amanhã'
  return `faltam ${dias} dias`
}

/** Nada pendente não é erro nem vazio — é a boa notícia do dia. */
function FilaVazia({ temProjeto }: { temProjeto: boolean }) {
  return (
    <section className="rounded-2xl border border-dashed bg-card/60 p-8 text-center">
      <p className="text-base font-medium">Nada esperando por você agora ✶</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {temProjeto
          ? 'Quando o designer mandar uma peça para sua revisão, ela aparece aqui em cima.'
          : 'Assim que um designer te incluir num projeto, o trabalho dele aparece por aqui.'}
      </p>
    </section>
  )
}

function GrupoDeProjetos({
  titulo,
  projetos,
  discreto = false,
}: {
  titulo: string
  projetos: ProjetoDoCliente[]
  /** O que já acabou fica na tela, mas não disputa atenção com o que anda. */
  discreto?: boolean
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className={
          discreto
            ? 'font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground'
            : 'text-lg font-semibold tracking-tight'
        }
      >
        {titulo}
      </h2>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projetos.map((p) => {
          const prazo = prazoEmPalavras(p.prazo)
          return (
            <li key={p.id} className="overflow-hidden rounded-2xl border bg-card">
              <Link href={`/projetos/${p.id}`} className="block">
                <Miniatura src={p.capa} nome={p.nome} proporcao="aspect-[16/10]" />
                <div className="flex flex-col gap-2 p-4">
                  <Pilula tom={TOM_STATUS[p.status] ?? 'neutro'}>
                    {ROTULO_STATUS[p.status] ?? p.status}
                  </Pilula>
                  <h3 className="text-sm font-semibold leading-snug tracking-tight">{p.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.designer ? `com ${p.designer}` : 'sem designer definido'}
                    {/* Só mostra prazo quando ele existe: "sem prazo" repetido
                        em todo cartão é ruído, não informação. */}
                    {prazo ? ` · ${prazo}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default function PainelDoCliente({
  nome,
  usuarioId,
}: {
  nome: string
  usuarioId: string | null
}) {
  const [projetos, setProjetos] = useState<ProjetoDoCliente[]>([])
  const [faturas, setFaturas] = useState<Fatura[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const [resProjetos, resArtes, resFaturas] = await Promise.allSettled([
        api.get<{ data: any[] }>('/projetos?limit=20'),
        // A capa de cada projeto é a arte mais recente dele. `/artes` já
        // devolve `previewUrl` assinada; sem esta chamada o cartão do projeto
        // seria só texto, e a tela inteira depende de ver a peça.
        api.get<{ data: any[] }>('/artes?limit=50'),
        // `tipo=cliente`: as faturas que ELE deve, não as que alguém tem a receber.
        pagamentosApi.getFaturas('cliente'),
      ])
      if (!vivo) return

      const capaPorProjeto = new Map<string, string>()
      if (resArtes.status === 'fulfilled') {
        for (const a of resArtes.value.data ?? []) {
          const projetoId = a.projeto?.id ?? a.projetoId
          if (!projetoId || !a.previewUrl) continue
          // `/artes` já vem em ordem decrescente de criação: a primeira que
          // aparece para cada projeto é a mais recente dele.
          if (!capaPorProjeto.has(projetoId)) capaPorProjeto.set(projetoId, a.previewUrl)
        }
      }

      if (resProjetos.status === 'fulfilled') {
        setProjetos(
          (resProjetos.value.data ?? []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            status: p.status,
            prazo: p.prazo ?? null,
            designer: p.designer?.nome ?? null,
            capa: capaPorProjeto.get(p.id) ?? null,
          })),
        )
      }
      if (resFaturas.status === 'fulfilled') {
        setFaturas((resFaturas.value.data ?? []).filter((f) => f.status === 'PENDENTE'))
      }
      setCarregando(false)
    })()
    return () => {
      vivo = false
    }
  }, [])

  const aPagar = faturas.reduce((soma, f) => soma + (f.valor ?? 0), 0)

  /*
   * Dois grupos, e não um "tudo que não foi cancelado".
   *
   * Antes projeto concluído entrava embaixo do título "Em andamento" — o
   * rótulo mentia sobre metade da lista. Separar custa uma seção a mais e
   * devolve a pergunta que o cliente faz de verdade ao abrir: o que ainda
   * está acontecendo?
   */
  const emAndamento = projetos.filter((p) => p.status === 'EM_ANDAMENTO' || p.status === 'PAUSADO')
  const concluidos = projetos.filter((p) => p.status === 'CONCLUIDO')

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Oi, {nome}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {carregando ? 'Carregando seus trabalhos…' : 'O que precisa de você está logo abaixo.'}
        </p>
      </header>

      <AguardandoVoce
        usuarioId={usuarioId}
        vazio={carregando ? null : <FilaVazia temProjeto={projetos.length > 0} />}
      />

      {emAndamento.length > 0 && (
        <GrupoDeProjetos titulo="Em andamento" projetos={emAndamento} />
      )}

      {concluidos.length > 0 && (
        <GrupoDeProjetos titulo="Concluídos" projetos={concluidos} discreto />
      )}

      {/* Abaixo de tudo, e só quando existe. Um cartão "R$ 0,00 a pagar" é uma
          preocupação inventada, e cobrança no topo faz a tela receber alguém
          com uma conta em vez de com o trabalho. */}
      {faturas.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            A pagar
          </h2>
          <p className="text-sm">
            <b className="font-semibold tabular-nums">{formatReais(aPagar)}</b> em{' '}
            {faturas.length === 1 ? '1 fatura em aberto' : `${faturas.length} faturas em aberto`}.
          </p>
          <div>
            <Button asChild size="sm" variant="outline">
              <Link href="/faturas">Ver faturas</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
