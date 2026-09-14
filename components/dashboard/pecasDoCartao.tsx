'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * As duas peças que os cartões do painel do cliente compartilham.
 *
 * Elas existem juntas porque o cartão do cliente é sempre a mesma ideia — a
 * peça primeiro, o texto depois — e a miniatura é a parte com regra de
 * verdade: a URL é assinada e temporária, e falha por motivos banais (link
 * vencido, arquivo que o bucket não tem). Um `<img>` quebrado no meio de uma
 * grade de arte é pior que um espaço honesto.
 */

const TONS = {
  atencao: 'border-primary/25 bg-primary/10 text-primary',
  neutro: 'border-border bg-muted text-muted-foreground',
  feito: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
} as const

export function Pilula({
  tom = 'neutro',
  children,
  className,
}: {
  tom?: keyof typeof TONS
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        /* `w-fit`: a pílula quase sempre vive dentro de um `flex-col`, que
           estica os filhos por padrão — sem isto ela vira uma faixa da
           largura do cartão e deixa de parecer uma etiqueta. */
        'inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
        TONS[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * A peça, grande.
 *
 * `proporcao` e não altura fixa: a grade quer cartões do mesmo tamanho, e
 * recortar por `object-cover` mantém a fileira alinhada sem distorcer a arte.
 * Quem quiser ver a peça inteira abre a revisão — é para isso que o cartão tem
 * um botão.
 */
export function Miniatura({
  src,
  nome,
  proporcao = 'aspect-[3/2]',
}: {
  src: string | null
  nome: string
  proporcao?: string
}) {
  const [falhou, setFalhou] = useState(false)
  const inicial = (nome.trim()[0] ?? '?').toUpperCase()

  return (
    <div className={cn('relative w-full overflow-hidden bg-muted', proporcao)}>
      {src && !falhou ? (
        <Image
          src={src}
          alt={nome}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 400px"
          className="object-cover"
          onError={() => setFalhou(true)}
        />
      ) : (
        /*
          Sem ícone de "imagem quebrada": a peça existe, o que faltou foi o
          endereço de exibição. A inicial ocupa o espaço sem fingir que é a
          arte e sem acusar erro que não é do cliente.
        */
        <div className="absolute inset-0 grid place-items-center">
          <span
            aria-hidden
            className="select-none text-5xl font-semibold text-muted-foreground/35"
          >
            {inicial}
          </span>
        </div>
      )}
    </div>
  )
}
