'use client'

import Link from 'next/link'

/** Solicitações pendentes da versão atual, sem inferir envio ou leitura. */
import type { ProximoPasso } from './FilaDoDia'

export type ItemParado = {
  id: string
  arte: string
  cliente: string
  dias: number
  aberto: boolean | null
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
  const aindaNaoMandei = itens.length === 0 && proximoPasso !== null

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        {aindaNaoMandei ? 'Prepare a revisão' : 'Aguardando decisão'}
      </h2>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {proximoPasso === 'arte'
            ? 'Nada compartilhado ainda — primeiro sobe a arte, depois vai o link.'
            : proximoPasso === 'link'
              ? 'Você ainda não mandou nenhum link. É ele que põe a arte na mão do cliente.'
              : 'Nenhuma aprovação pendente da versão atual nas suas artes.'}
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
                    {item.aberto === null
                      ? `Decisão solicitada a ${item.cliente}`
                      : item.aberto
                      ? `Há acesso registrado no link; aprovação pendente`
                      : `Sem acesso registrado no link`}
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
