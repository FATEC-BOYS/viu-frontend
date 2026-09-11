'use client'

import Link from 'next/link'

/**
 * O que você já entregou, e o que vem.
 *
 * As outras faixas são dívida: o que falta responder, o que está parado. Esta
 * é a única que devolve alguma coisa — e é por isso que ela existe. "3
 * aprovações esta semana" é uma alegria que o designer ganhou, diferente de
 * confete que o app fabrica.
 *
 * A sparkline mostra as quatro últimas semanas para o número ter com o que se
 * comparar: três aprovações não dizem nada sozinhas; três depois de uma semana
 * de zero, sim.
 */
export type SemanaResumo = {
  aprovacoes: number
  /** As quatro últimas semanas, a atual por último. */
  historico: number[]
  aReceberCentavos: number
  proximaFatura?: { id: string; vence: string } | null
}

function formatBRL(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * O recado muda com o número, porque "3 aprovações" com um rótulo fixo é só um
 * contador. O que interessa é se foi uma semana boa.
 */
export function recadoDaSemana(historico: number[], aprovacoes: number): string {
  const anteriores = historico.slice(0, -1)
  const maiorAnterior = anteriores.length ? Math.max(...anteriores) : 0

  if (aprovacoes === 0) {
    return maiorAnterior > 0
      ? 'nenhuma aprovação ainda — a semana passada teve ' + maiorAnterior
      : 'nenhuma aprovação ainda'
  }
  const palavra = aprovacoes === 1 ? 'aprovação' : 'aprovações'
  if (anteriores.length && aprovacoes > maiorAnterior) {
    return `${palavra} — sua melhor semana do mês`
  }
  return palavra
}

function Sparkline({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null

  const max = Math.max(...valores, 1)
  const largura = 120
  const altura = 34
  const passo = valores.length > 1 ? (largura - 12) / (valores.length - 1) : 0
  const pontos = valores.map((v, i) => {
    const x = 6 + i * passo
    const y = altura - 6 - (v / max) * (altura - 12)
    return { x, y }
  })
  const fim = pontos[pontos.length - 1]

  return (
    <svg
      /* Sem limite de largura a linha estica e achata: 120 de viewBox em
         380 de caixa deforma o desenho, e a subida some. */
      className="mt-2 block h-[34px] w-full max-w-[200px]"
      viewBox={`0 0 ${largura} ${altura}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Aprovações por semana: ${valores.join(', ')}.`}
    >
      <polyline
        points={pontos.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={fim.x} cy={fim.y} r="3" fill="currentColor" />
    </svg>
  )
}

export default function EstaSemana({ resumo }: { resumo: SemanaResumo }) {
  const { aprovacoes, historico, aReceberCentavos, proximaFatura } = resumo

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        Esta semana
      </h2>

      <div className="rounded-lg bg-pastel-menta/40 p-3.5">
        <p className="font-display text-3xl font-extrabold leading-none tracking-[-0.035em] tabular-nums">
          {aprovacoes}
        </p>
        <p className="mt-1 text-pretty text-xs text-muted-foreground">
          {recadoDaSemana(historico, aprovacoes)}
        </p>
        <Sparkline valores={historico} />
      </div>

      {/* O dinheiro desce de peso: é contexto, não a ação do dia. */}
      <p className="border-t pt-3 text-sm text-muted-foreground">
        {aReceberCentavos > 0 ? (
          <>
            <b className="font-semibold tabular-nums text-foreground">
              {formatBRL(aReceberCentavos)}
            </b>{' '}
            a receber
            {proximaFatura && (
              <>
                {' · '}
                <Link href={`/faturas/${proximaFatura.id}`} className="hover:underline">
                  vence {proximaFatura.vence}
                </Link>
              </>
            )}
          </>
        ) : (
          'Nenhuma fatura em aberto.'
        )}
      </p>
    </section>
  )
}
