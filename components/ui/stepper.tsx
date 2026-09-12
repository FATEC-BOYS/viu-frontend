"use client";
import { cn } from "@/lib/utils";

/**
 * A trilha de passos de um formulário em etapas.
 *
 * Isto era um `flex` sem quebra com os quatro rótulos por extenso — "Básico",
 * "Participantes", "Aprovação", "Revisão" — e uma barrinha entre cada um. No
 * celular o min-content disso passa de 500px, e como `DialogContent` é `grid`
 * (todo item de grid nasce com `min-width: auto`), essa largura ia parar na
 * linha inteira do modal: os campos saíam pela direita e o botão principal
 * ficava fora da tela, sobrando só "Cancelar".
 *
 * A saída não é apertar a fonte, é mostrar menos: o número de todos os passos
 * sempre cabe, e o nome só interessa do passo em que você está. No desktop,
 * onde há espaço, os quatro nomes voltam.
 */
export function Stepper({
  steps, current,
}: { steps: { key: string; label: string }[]; current: number }) {
  return (
    /*
     * `min-w-0` é o que impede esta trilha de ditar a largura do pai — sem ele
     * o contêiner volta a ser esticado pelo conteúdo.
     */
    <ol className="flex min-w-0 items-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex min-w-0 items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                done && "bg-primary text-primary-foreground border-primary",
                active && "bg-primary/10 border-primary text-primary",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "truncate text-sm",
                active ? "font-medium" : "text-muted-foreground",
                // Fora do passo atual, o nome só aparece quando há espaço.
                active ? "inline" : "hidden sm:inline",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-3 shrink-0 bg-border sm:w-6" />}
          </li>
        );
      })}
    </ol>
  );
}
