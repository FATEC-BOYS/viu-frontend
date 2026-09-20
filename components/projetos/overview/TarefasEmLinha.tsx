"use client";

import type { TarefasKanban, TarefaCard } from "@/lib/projects";
import { formatarDia } from '@/lib/diaDeCalendario';

/**
 * As tarefas do projeto como lista, para a Visão Geral.
 *
 * O quadro de três colunas continua sendo a aba Tarefas — lá ele serve, porque
 * é onde se compara o que está parado com o que anda. Aqui ele não servia: com
 * uma tarefa no projeto, a Visão Geral desenhava três cartões, dois deles
 * dizendo "Sem tarefas", para mostrar uma linha de conteúdo. O caso totalmente
 * vazio já tinha ganhado tratamento; o quase-vazio, que é o comum, ficava
 * igualmente ruim.
 *
 * A pergunta que a Visão Geral responde não é "como está distribuído", é "o
 * que está na minha mão". Isso é uma lista, com o estado na segunda linha.
 */

const ROTULO: Record<Coluna, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

type Coluna = "pendente" | "em_andamento" | "concluida";

/** As colunas na ordem em que o trabalho anda, achatadas numa lista só. */
function achatar(kanban: TarefasKanban): Array<{ tarefa: TarefaCard; coluna: Coluna }> {
  const colunas: Coluna[] = ["pendente", "em_andamento", "concluida"];
  return colunas.flatMap((coluna) =>
    kanban[coluna].top.map((tarefa) => ({ tarefa, coluna })),
  );
}

function segundaLinha(tarefa: TarefaCard, coluna: Coluna): string {
  const partes = [ROTULO[coluna]];
  if (tarefa.responsavel_nome) partes.push(tarefa.responsavel_nome);
  partes.push(
    tarefa.prazo
      ? formatarDia(tarefa.prazo)
      : "sem prazo",
  );
  return partes.join(" · ");
}

export default function TarefasEmLinha({
  kanban,
  onAbrir,
  onVerTodas,
}: {
  kanban: TarefasKanban;
  onAbrir: (id: string) => void;
  /** Leva para a aba Tarefas, onde o quadro completo mora. */
  onVerTodas: () => void;
}) {
  const total =
    kanban.pendente.total + kanban.em_andamento.total + kanban.concluida.total;

  if (total === 0) {
    return (
      <div className="py-4">
        <p className="text-sm font-medium">Nenhuma tarefa neste projeto</p>
        <p className="text-xs text-muted-foreground">
          Tarefas ajudam a lembrar o que falta antes de mandar para o cliente.
        </p>
      </div>
    );
  }

  const linhas = achatar(kanban);
  const restante = Math.max(total - linhas.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-sm font-semibold">Tarefas</h3>
        <button
          type="button"
          onClick={onVerTodas}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Ver o quadro
        </button>
      </div>

      <ul className="divide-y">
        {linhas.map(({ tarefa, coluna }) => (
          <li key={tarefa.id}>
            {/*
              A linha inteira é o alvo do clique, e é um <button>: era uma <li>
              com `onClick`, que o teclado não alcança e o leitor de tela não
              anuncia como acionável.
            */}
            <button
              type="button"
              onClick={() => onAbrir(tarefa.id)}
              className="w-full py-2.5 text-left transition-colors hover:bg-muted/50"
            >
              <p className="truncate text-sm font-medium">{tarefa.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {segundaLinha(tarefa, coluna)}
              </p>
            </button>
          </li>
        ))}

        {restante > 0 && (
          <li className="py-2.5 text-xs text-muted-foreground">
            +{restante} {restante === 1 ? "tarefa" : "tarefas"} no quadro
          </li>
        )}
      </ul>
    </div>
  );
}
