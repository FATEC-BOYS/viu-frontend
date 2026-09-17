"use client";

import type { ProximoPasso } from "@/lib/projects";
import { Button } from "@/components/ui/button";

export default function ProximosPassos({
  passos,
  onAction,
}: {
  passos: ProximoPasso[];
  onAction: (p: ProximoPasso) => void;
}) {
  /* "Nada a fazer" não merece uma caixa: o cartão existia para emoldurar uma
     frase, e ficava do mesmo tamanho do quadro de tarefas ao lado. */
  if (!passos?.length) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nada esperando por você neste projeto.
      </p>
    );
  }

  return (
    <div>
      <h3 className="pb-1 text-sm font-semibold">Próximos passos</h3>

      {/* A borda é de quem agrupa as duas colunas, uma vez só. Aqui havia um
          Card dentro da grade, ao lado de outro Card cheio de Cards. */}
      <ul className="divide-y">
        {passos.map((p, i) => (
          <li key={i} className="flex items-center gap-3 py-2.5">
            {/*
              * Havia um Checkbox `disabled` aqui. Uma caixa que não marca
              * promete uma interação que não existe — e a ação de verdade
              * já é o botão ao lado. A seta que o substituiu também saiu:
              * decorava uma linha que o botão ao lado já explica.
              */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.label}</div>
              {/* Só `detalhe`, que é texto escrito para uma pessoa. Aqui se
                  imprimia o saco de `meta` inteiro, e o id da arte aparecia
                  na tela como se fosse informação. */}
              {p.detalhe && (
                <div className="truncate text-xs text-muted-foreground">{p.detalhe}</div>
              )}
            </div>
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => onAction(p)}>
              Resolver
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
