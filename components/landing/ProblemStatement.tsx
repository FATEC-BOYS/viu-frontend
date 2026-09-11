'use client'

import Reveal from './Reveal'

/**
 * O problema, mostrado em vez de descrito.
 *
 * Antes esta seção era um título centralizado e um parágrafo — dizia que
 * feedback no WhatsApp é ruim para quem já sabe disso, e não provava nada para
 * quem não sabe. A conversa abaixo é a rotina que o VIU substitui: qualquer
 * pessoa que já entregou design reconhece a cena em dois segundos.
 *
 * As mensagens são inventadas, e é o ponto — não é print de conversa de
 * ninguém.
 */
const CONVERSA = [
  { de: 'cliente', texto: 'oi! deu uma olhada na arte?' },
  { de: 'voce', texto: 'mandei ontem 🙂 chegou aí?' },
  { de: 'cliente', texto: 'acho que perdi, manda de novo?' },
  { de: 'cliente', audio: '2:47' },
  { de: 'cliente', texto: 'muda aquele negócio ali do lado esquerdo' },
  { de: 'voce', texto: 'o ícone ou o texto?' },
  { de: 'cliente', texto: 'então… tá aprovado assim mesmo?' },
]

export default function ProblemStatement() {
  return (
    <section className="border-y border-border/60 bg-muted/40 px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <h2 className="text-balance font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
            Chega de caçar feedback no WhatsApp.
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
            Áudios perdidos. Prints sem contexto. Arquivos chamados{' '}
            <span className="whitespace-nowrap rounded-md bg-background px-1.5 py-0.5 font-mono text-[0.9em] text-foreground/80 ring-1 ring-border/70">
              final_v2_agora_vai.pdf
            </span>
            . E, no fim, ninguém sabe dizer quem aprovou o quê, nem quando.
          </p>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            A criatividade merece um processo tão limpo quanto o resultado final.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            role="img"
            aria-label="Uma conversa de aplicativo de mensagens em que o cliente perde o arquivo, manda um áudio de dois minutos e pede para mudar 'aquele negócio ali', sem ninguém saber se a arte foi aprovada."
            className="mx-auto flex w-full max-w-sm flex-col gap-2.5 rounded-2xl border border-border/60 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_16px_50px_-30px_rgba(0,0,0,0.3)]"
          >
            {CONVERSA.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.de === 'voce' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    msg.de === 'voce'
                      ? 'rounded-br-sm bg-foreground/[0.06] text-foreground/80'
                      : 'rounded-bl-sm bg-muted text-foreground/70'
                  }`}
                >
                  {msg.audio ? (
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-foreground/10 text-[10px]">
                        ▶
                      </span>
                      <span aria-hidden className="flex items-end gap-[2px]">
                        {[6, 11, 8, 14, 9, 15, 7, 12, 10, 6, 13].map((h, j) => (
                          <span
                            key={j}
                            style={{ height: `${h}px` }}
                            className="w-[2px] rounded-full bg-foreground/25"
                          />
                        ))}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">{msg.audio}</span>
                    </span>
                  ) : (
                    msg.texto
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
