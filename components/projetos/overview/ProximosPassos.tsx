"use client";

import type { ProximoPasso } from "@/lib/projects";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProximosPassos({
  passos,
  onAction,
}: {
  passos: ProximoPasso[];
  onAction: (p: ProximoPasso) => void;
}) {
  if (!passos?.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Tudo certo por aqui. Sem próximos passos urgentes 🎉
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {passos.map((p, i) => (
            <li key={i} className="p-4 flex items-center gap-3">
              {/*
                * Havia um Checkbox `disabled` aqui. Uma caixa que não marca
                * promete uma interação que não existe — e a ação de verdade
                * já é o botão ao lado.
                */}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.label}</div>
                {p.meta && (
                  <div className="text-xs text-muted-foreground truncate">
                    {Object.entries(p.meta).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(p)}>
                Resolver
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
