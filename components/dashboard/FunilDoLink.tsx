'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Onde a volta trava.
 *
 * O produto promete encurtar o caminho entre "mandei a arte" e "está
 * aprovado", e até aqui ninguém sabia em qual trecho ele emperra. São quatro
 * travas diferentes com remédios diferentes: link que não chega (reenviar),
 * link que chega e não abre (cobrar), abre e o cliente não fala (perguntar
 * direto), fala e não decide (pedir a decisão). Sem o número, escolher o
 * remédio é palpite.
 *
 * Os dados sempre existiram — `acessos` no link, `autorId` no feedback,
 * `decididoEm` na aprovação. Faltava alguém somar.
 *
 * Não mostra porcentagem de uma etapa para a outra quando a de cima é pequena:
 * "50% de queda" sobre dois links é ruído com cara de estatística.
 */

type Funil = {
  compartilhadas: number
  abertas: number
  comentadas: number
  decididas: number
  medianaDiasAteDecidir: number | null
}

const MINIMO_PARA_PORCENTAGEM = 5

function Etapa({
  rotulo,
  valor,
  anterior,
  destaque,
}: {
  rotulo: string
  valor: number
  anterior: number | null
  destaque: boolean
}) {
  const perdeu = anterior === null ? 0 : anterior - valor
  const largura = anterior === null || anterior === 0 ? 100 : (valor / anterior) * 100

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{rotulo}</span>
        <span className="font-mono text-sm tabular-nums">{valor}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={destaque ? 'h-full rounded-full bg-amber-500' : 'h-full rounded-full bg-primary/60'}
          style={{ width: `${Math.max(0, Math.min(100, largura))}%` }}
        />
      </div>
      {perdeu > 0 && anterior !== null ? (
        <span className="text-xs text-muted-foreground">
          {perdeu === 1 ? 'parou 1 aqui' : `pararam ${perdeu} aqui`}
          {anterior >= MINIMO_PARA_PORCENTAGEM
            ? ` · ${Math.round((perdeu / anterior) * 100)}%`
            : ''}
        </span>
      ) : null}
    </li>
  )
}

export default function FunilDoLink() {
  const [funil, setFunil] = useState<Funil | null>(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const r = await api.get<{ data: Funil }>('/funil')
        if (vivo) setFunil(r.data)
      } catch {
        /*
         * Cliente recebe 403 e a faixa simplesmente não existe para ele — este
         * panorama é de quem entrega. A recusa é do backend
         * (`funilController`, testada lá); aqui ela só não vira caixa de erro
         * numa tela onde o dado é contexto, não tarefa.
         */
        if (vivo) setFunil(null)
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  if (!funil || funil.compartilhadas === 0) return null

  // A maior queda é o que se faz a respeito; por isso ela é a barra em âmbar.
  const quedas = [
    funil.compartilhadas - funil.abertas,
    funil.abertas - funil.comentadas,
    funil.comentadas - funil.decididas,
  ]
  const maiorQueda = Math.max(...quedas)
  const indiceDaMaiorQueda = maiorQueda > 0 ? quedas.indexOf(maiorQueda) : -1

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        O caminho do link
      </h2>

      <ul className="flex flex-col gap-2.5">
        <Etapa
          rotulo="Compartilhadas"
          valor={funil.compartilhadas}
          anterior={null}
          destaque={false}
        />
        <Etapa
          rotulo="Abertas pelo cliente"
          valor={funil.abertas}
          anterior={funil.compartilhadas}
          destaque={indiceDaMaiorQueda === 0}
        />
        <Etapa
          rotulo="Comentadas"
          valor={funil.comentadas}
          anterior={funil.abertas}
          destaque={indiceDaMaiorQueda === 1}
        />
        <Etapa
          rotulo="Decididas"
          valor={funil.decididas}
          anterior={funil.comentadas}
          destaque={indiceDaMaiorQueda === 2}
        />
      </ul>

      {funil.medianaDiasAteDecidir !== null ? (
        <p className="text-xs text-muted-foreground">
          {/* Mediana, não média: com poucos casos um cliente que sumiu por um
              mês move a média e não move a verdade. */}
          Metade das decisões sai em até{' '}
          <b className="font-semibold tabular-nums text-foreground">
            {funil.medianaDiasAteDecidir < 1
              ? 'menos de um dia'
              : `${Math.round(funil.medianaDiasAteDecidir)} ${
                  Math.round(funil.medianaDiasAteDecidir) === 1 ? 'dia' : 'dias'
                }`}
          </b>
          .
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma decisão fechada ainda — sem isso não dá para dizer quanto tempo leva.
        </p>
      )}
    </section>
  )
}
