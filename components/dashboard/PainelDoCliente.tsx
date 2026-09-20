'use client'

import { useEffect, useState } from 'react'
import { diasAte } from '@/lib/diaDeCalendario'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { pagamentosApi, type Fatura, formatReais } from '@/lib/pagamentos'
import AguardandoVoce from '@/components/dashboard/AguardandoVoce'
import { ChevronRight } from 'lucide-react'
import { Pilula } from '@/components/dashboard/pecasDoCartao'

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
  /*
   * Em dias de calendário, não na diferença bruta contra `Date.now()`.
   *
   * Prazo é dia guardado como meia-noite UTC. Subtrair o instante de agora
   * fazia um prazo de HOJE virar "prazo passou há 1 dia" para quem está no
   * Brasil, porque a meia-noite UTC já passou às 21h do dia anterior local.
   */
  const dias = diasAte(prazo)
  if (!Number.isFinite(dias)) return null
  if (dias < 0) return `prazo passou há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'prazo é hoje'
  if (dias === 1) return 'prazo é amanhã'
  return `faltam ${dias} dias`
}

/** Nada pendente não é erro nem vazio — é a boa notícia do dia. */
function FilaVazia({ temProjeto }: { temProjeto: boolean }) {
  return (
    <section className="rounded-xl border border-dashed bg-card/60 px-4 py-8 text-center sm:px-5">
      <p className="text-sm font-medium">Nada esperando por você agora ✶</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        {temProjeto
          ? 'Quando o designer mandar uma peça para sua revisão, ela aparece aqui em cima.'
          : 'Assim que um designer te incluir num projeto, o trabalho dele aparece por aqui.'}
      </p>
    </section>
  )
}

/**
 * Os projetos como LISTA, não como grade de cartões com capa.
 *
 * A versão anterior dava a cada projeto um cartão com a arte mais recente
 * como capa. A capa não informava nada: aqui a pessoa está navegando, não
 * decidindo — quem precisa ver a peça é a fila de cima, e lá a miniatura tem
 * função. Como decoração, a capa custava três vezes a altura e empurrava o
 * resto da tela para baixo da dobra.
 *
 * Um cartão, linhas separadas por fio, pílula dizendo o estado. Assim
 * "concluído" e "em andamento" convivem sem que um título minta sobre o
 * outro, que era o problema da separação em duas seções.
 */
function ListaDeProjetos({ projetos }: { projetos: ProjetoDoCliente[] }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold tracking-tight">Seus projetos</h2>
        <p className="shrink-0 text-xs text-muted-foreground">
          {projetos.length === 1 ? '1 projeto' : `${projetos.length} projetos`}
        </p>
      </header>

      <ul className="divide-y">
        {projetos.map((p) => {
          const prazo = prazoEmPalavras(p.prazo)
          return (
            <li key={p.id}>
              <Link
                href={`/projetos/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.designer ? `com ${p.designer}` : 'sem designer definido'}
                    {/* Só mostra prazo quando ele existe: "sem prazo" repetido
                        em toda linha é ruído, não informação. */}
                    {prazo ? ` · ${prazo}` : ''}
                  </p>
                </div>

                <Pilula tom={TOM_STATUS[p.status] ?? 'neutro'}>
                  {ROTULO_STATUS[p.status] ?? p.status}
                </Pilula>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
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
      /*
       * Duas chamadas, não três. A terceira buscava `/artes?limit=50` só para
       * pegar uma capa por projeto — e a capa saiu da lista, porque ali a
       * pessoa navega em vez de decidir. Requisição que ninguém lê é peso e
       * mentira: diz que a tela mostra a peça quando ela não mostra.
       */
      const [resProjetos, resFaturas] = await Promise.allSettled([
        api.get<{ data: any[] }>('/projetos?limit=20'),
        // `tipo=cliente`: as faturas que ELE deve, não as que alguém tem a receber.
        pagamentosApi.getFaturas('cliente'),
      ])
      if (!vivo) return

      if (resProjetos.status === 'fulfilled') {
        setProjetos(
          (resProjetos.value.data ?? []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            status: p.status,
            prazo: p.prazo ?? null,
            designer: p.designer?.nome ?? null,
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
   * Ordenados, não separados em duas seções.
   *
   * Projeto concluído embaixo do título "Em andamento" era rótulo mentindo
   * sobre metade da lista. A separação em dois blocos resolvia isso e custava
   * duas molduras; com uma pílula por linha dizendo o estado, o que anda vem
   * primeiro e a verdade fica em cada linha, onde ela pertence.
   */
  const ORDEM: Record<string, number> = { EM_ANDAMENTO: 0, PAUSADO: 1, CONCLUIDO: 2 }
  const listados = projetos
    .filter((p) => p.status !== 'CANCELADO')
    .sort((a, b) => (ORDEM[a.status] ?? 9) - (ORDEM[b.status] ?? 9))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Oi, {nome}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {carregando ? 'Carregando seus trabalhos…' : 'O que precisa de você está logo abaixo.'}
        </p>
      </header>

      <AguardandoVoce
        usuarioId={usuarioId}
        vazio={carregando ? null : <FilaVazia temProjeto={projetos.length > 0} />}
      />

      {listados.length > 0 && <ListaDeProjetos projetos={listados} />}

      {/* Abaixo de tudo, e só quando existe. Um cartão "R$ 0,00 a pagar" é uma
          preocupação inventada, e cobrança no topo faz a tela receber alguém
          com uma conta em vez de com o trabalho.

          O valor é o herói, com legenda embaixo: quem abre quer saber QUANTO,
          e a frase em volta só atrapalhava a leitura do número. */}
      {faturas.length > 0 && (
        <section className="rounded-xl border bg-card px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">A pagar</h2>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {formatReais(aPagar)}
              </p>
              <p className="text-xs text-muted-foreground">
                {faturas.length === 1 ? '1 fatura em aberto' : `${faturas.length} faturas em aberto`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/faturas">Ver faturas</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
