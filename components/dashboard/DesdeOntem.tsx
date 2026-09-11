'use client'

import Link from 'next/link'

/**
 * O que aconteceu enquanto você não estava.
 *
 * O onboarding responde "como eu começo?" e some. Esta é a pergunta seguinte,
 * a que se faz toda manhã pelos próximos dois anos: o cliente abriu o link, a
 * arte foi aprovada às onze da noite, a fatura caiu. Tudo isso existia
 * espalhado em Notificações e na aba de cada projeto — nada chegava aqui.
 *
 * Não precisou de tabela nova: Notificações já é o log de eventos do VIU.
 * Arte, feedback, aprovação, fatura, pagamento e assinatura escrevem lá a cada
 * mutação. O que faltava era alguém perguntar "e desde ontem?".
 */
import type { ProximoPasso } from './FilaDoDia'

export type Evento = {
  id: string
  titulo: string
  apoio?: string | null
  hora: string
  href?: string | null
}

function Linha({ evento }: { evento: Evento }) {
  return (
    <span className="flex items-start gap-3">
      <span className="w-[42px] shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {evento.hora}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{evento.titulo}</span>
        {evento.apoio && (
          <span className="block truncate text-xs text-muted-foreground">{evento.apoio}</span>
        )}
      </span>
    </span>
  )
}

export default function DesdeOntem({
  eventos,
  proximoPasso = null,
}: {
  eventos: Evento[]
  proximoPasso?: ProximoPasso
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
          Desde ontem
        </h2>
        {eventos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {eventos.length === 1 ? '1 coisa' : `${eventos.length} coisas`}
          </span>
        )}
      </div>

      {eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {proximoPasso === 'arte'
            ? 'Assim que a primeira arte subir, tudo que acontecer com ela aparece aqui.'
            : proximoPasso === 'link'
              ? 'Com o link na mão do cliente, cada abertura e cada comentário entram nesta lista.'
              : 'Nada se moveu desde ontem. Nenhuma arte enviada, nenhum comentário, nenhuma decisão.'}
        </p>
      ) : (
        <ul className="flex flex-col">
          {eventos.map((evento) => (
            <li key={evento.id} className="border-b last:border-b-0">
              {evento.href ? (
                <Link
                  href={evento.href}
                  className="block rounded-md py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Linha evento={evento} />
                </Link>
              ) : (
                /* Nem todo evento tem para onde ir — assinatura vencida, por
                   exemplo. Melhor uma linha que não é link do que um link que
                   não leva a lugar nenhum. */
                <div className="py-2.5">
                  <Linha evento={evento} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
