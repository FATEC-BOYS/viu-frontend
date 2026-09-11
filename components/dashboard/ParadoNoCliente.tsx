'use client'

import Link from 'next/link'

/**
 * O que não está na sua mão.
 *
 * A fila ao lado é o que depende de você. Esta faixa é o contrário: arte
 * enviada, link mandado, e do outro lado silêncio. É a informação que faz
 * alguém ir cobrar — e até agora só existia se o designer abrisse Links
 * compartilhados e contasse nos dedos.
 *
 * Dois silêncios diferentes, e o primeiro dói mais:
 *   ainda não abriu — o link pode nem ter chegado
 *   abriu, sem aprovar — parece que está andando, e não está
 *
 * A segunda frase diz "sem aprovar", não "sem responder": aprovação é o que
 * temos como prova aqui. Afirmar que o cliente não comentou exigiria contar os
 * feedbacks de cada arte, e a tela não tem esse dado.
 *
 * O selo de dias esquenta em pêssego a partir de quatro dias; antes disso é
 * cedo para cobrar e a cor só faria barulho.
 */
import type { ProximoPasso } from './FilaDoDia'

export type ItemParado = {
  id: string
  arte: string
  cliente: string
  dias: number
  aberto: boolean
  href: string
}

const ESQUENTA_A_PARTIR_DE = 4

export default function ParadoNoCliente({
  itens,
  proximoPasso = null,
}: {
  itens: ItemParado[]
  proximoPasso?: ProximoPasso
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        Parado no cliente
      </h2>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {proximoPasso === 'arte'
            ? 'Nada compartilhado ainda — primeiro sobe a arte, depois vai o link.'
            : proximoPasso === 'link'
              ? 'Você ainda não mandou nenhum link. É ele que põe a arte na mão do cliente.'
              : 'Nenhum link esperando resposta. Tudo que você mandou já teve retorno.'}
        </p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            <li key={item.id} className="border-b last:border-b-0">
              <Link
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.arte}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.aberto
                      ? `${item.cliente} abriu, ainda sem aprovar`
                      : `${item.cliente} ainda não abriu`}
                  </span>
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                    item.dias >= ESQUENTA_A_PARTIR_DE
                      ? 'bg-pastel-pessego text-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.dias === 0 ? 'hoje' : item.dias === 1 ? '1 dia' : `${item.dias} dias`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
