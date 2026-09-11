'use client'

import Link from 'next/link'

/**
 * Uma fila só, em vez de três cartões.
 *
 * Feedbacks, tarefas e prazos ocupavam um cartão cada, lado a lado e do mesmo
 * tamanho — como se decidir a prioridade entre eles fosse trabalho de quem
 * está lendo. Aqui vêm juntos e em ordem: primeiro o que outra pessoa está
 * esperando, depois o seu próprio roteiro, por último o que ainda tem prazo.
 *
 * O pino de 3px é a única cor da linha. Basta para o olho separar os tipos, e
 * é pouca o bastante para não competir com a arte em nenhuma outra tela.
 */
/**
 * O que falta para esta faixa ter dado.
 *
 * `null` quer dizer "nada falta" — a faixa está vazia porque está calma, e aí
 * a copy não deve mandar ninguém fazer nada.
 */
export type ProximoPasso = 'arte' | 'link' | null

export type ItemDaFila = {
  id: string
  tipo: 'feedback' | 'tarefa' | 'prazo'
  titulo: string
  apoio: string
  href: string
}

const PINO: Record<ItemDaFila['tipo'], string> = {
  feedback: 'bg-primary',
  tarefa: 'bg-pastel-lavanda',
  prazo: 'bg-pastel-menta',
}

export default function FilaDoDia({
  itens,
  proximoPasso = null,
}: {
  itens: ItemDaFila[]
  proximoPasso?: ProximoPasso
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        Precisa de você
      </h2>

      {itens.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed bg-pastel-menta/15 p-4">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-pastel-menta text-base">
            ✓
          </span>
          <div>
            <p className="text-sm font-medium">
              {proximoPasso ? 'A fila ainda não começou' : 'Nada na fila'}
            </p>
            <p className="text-xs text-muted-foreground">
              {proximoPasso === 'arte'
                ? 'Suba a primeira arte: é dela que nascem feedback, prazo e aprovação.'
                : proximoPasso === 'link'
                  ? 'Mande o link da arte ao cliente — a fila enche com o que ele responder.'
                  : 'Nenhum feedback, tarefa ou prazo pedindo atenção agora.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col">
          {itens.map((item) => (
            <li key={`${item.tipo}-${item.id}`} className="border-b last:border-b-0">
              <Link
                href={item.href}
                className="flex items-stretch gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
              >
                <span aria-hidden className={`w-[3px] shrink-0 rounded-full ${PINO[item.tipo]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.apoio}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
