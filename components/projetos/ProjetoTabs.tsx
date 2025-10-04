"use client";

import { cn } from "@/lib/utils";

export type ProjetoTabKey = "overview" | "artes" | "tasks" | "approval" | "activity";

const TABS: { key: ProjetoTabKey; label: string }[] = [
  { key: "overview", label: "Visão Geral" },
  { key: "artes", label: "Artes" },
  { key: "tasks", label: "Tarefas" },
  { key: "approval", label: "Aprovação" },
  { key: "activity", label: "Atividade" },
];

export default function ProjetoTabs({
  current,
  onChange,
  top = 64, // ajuste se seu header tiver outra altura
  className,
}: {
  current: ProjetoTabKey;
  onChange: (key: ProjetoTabKey) => void;
  top?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("sticky z-40 border-b bg-background/80 backdrop-blur", className)}
      style={{ top }}
    >
      <nav className="flex items-center gap-1 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "px-3 py-2 text-sm rounded-md transition-colors",
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
