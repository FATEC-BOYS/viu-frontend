"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ProjetoTabKey = "overview" | "artes" | "tasks" | "approval" | "activity" | "billing";

const TABS: { key: ProjetoTabKey; label: string }[] = [
  { key: "overview", label: "Visão Geral" },
  { key: "artes", label: "Artes" },
  { key: "tasks", label: "Tarefas" },
  { key: "approval", label: "Aprovação" },
  /**
   * "Atividade" ao lado de "Tarefas" lia como coisa a fazer, quando é o
   * histórico do que já aconteceu. A chave continua `activity` porque é o
   * que o `?tab=` dos links existentes usa.
   */
  { key: "activity", label: "Linha do tempo" },
  { key: "billing", label: "Fatura" },
];

export default function ProjetoTabs({
  current,
  onChange,
  top = 64,
  className,
}: {
  current: ProjetoTabKey;
  onChange: (key: ProjetoTabKey) => void;
  top?: number;
  className?: string;
}) {
  /*
   * Rolando a trilha, a aba atual pode nascer fora da vista: dá para estar em
   * "Fatura" e ver só "Visão Geral … Aprovação", sem nada destacado — a tela
   * deixa de dizer onde você está. Trazê-la para o campo de visão a cada troca
   * resolve, inclusive quando a troca vem do `?tab=` da URL.
   */
  const trilhaRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const ativa = trilhaRef.current?.querySelector<HTMLElement>('[data-ativa="true"]');
    ativa?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [current]);

  return (
    <div
      className={cn("sticky z-40 border-b bg-background/80 backdrop-blur", className)}
      style={{ top }}
    >
      {/*
        Seis abas não cabem em 390px, e sem rolagem elas esticavam a página
        inteira: a barra de cima saía da tela e o conteúdo aparecia deslocado,
        com "Projetos / Projeto" cortado na esquerda. `overflow-x-auto` faz a
        própria trilha rolar; `whitespace-nowrap` + `shrink-0` impedem que os
        rótulos se espremam em três linhas antes disso.
      */}
      <nav ref={trilhaRef} className="flex items-center gap-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-ativa={current === t.key}
            aria-current={current === t.key ? "page" : undefined}
            onClick={() => onChange(t.key)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              current === t.key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
