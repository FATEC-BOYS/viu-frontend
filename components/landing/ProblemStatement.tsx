'use client'

import Reveal from './Reveal'

/**
 * Faixa em `muted` para quebrar o ritmo entre duas seções sobre fundo — é o
 * respiro que separa a promessa do hero da explicação do produto.
 */
export default function ProblemStatement() {
  return (
    <section className="border-y border-border/60 bg-muted/40 px-6 py-24 md:py-32">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] sm:text-4xl md:text-5xl">
          Chega de caçar feedback no WhatsApp.
        </h2>
        <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
          Áudios perdidos. Prints sem contexto. Arquivos chamados{' '}
          <span className="whitespace-nowrap rounded-md bg-background px-1.5 py-0.5 font-mono text-[0.9em] text-foreground/80 ring-1 ring-border/70">
            final_v2_agora_vai.pdf
          </span>
          . A criatividade merece um processo tão limpo quanto o resultado final.
        </p>
      </Reveal>
    </section>
  )
}
