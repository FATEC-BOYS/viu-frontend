"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export function MiniCalendar({
  date,
  onChange,
  dotsByDay,
  rightSlot,
  dateKey, // <- NOVO: função pra gerar a chave (YYYY-MM-DD)
}: {
  date: Date;
  onChange: (d: Date) => void;
  dotsByDay: Record<string, number>;
  rightSlot?: React.ReactNode; // lista do dia
  dateKey?: (d: Date) => string;
}) {
  const keyFor = dateKey ?? ((d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`);

  const y = date.getFullYear();
  const m = date.getMonth();

  const first = new Date(y, m, 1);
  const startOff = (first.getDay() + 6) % 7; // semana começando na segunda
  const dim = new Date(y, m + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOff; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthHasTasks = cells.some((d) => d && (dotsByDay[keyFor(d)] ?? 0) > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Calendário */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Mês anterior"
                onClick={() => onChange(new Date(y, m - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Hoje"
                onClick={() => {
                  const now = new Date();
                  now.setHours(12, 0, 0, 0); // normaliza “hoje” pra chave local
                  onChange(now);
                }}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Próximo mês"
                onClick={() => onChange(new Date(y, m + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 text-[11px] font-medium text-muted-foreground mb-1">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((l, i) => (
              <div key={`${l}-${i}`} className="text-center py-1">
                {l}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={i}
                  onClick={() => onChange(d)}
                  className={cn(
                    "relative h-16 rounded-md text-xs flex flex-col items-center justify-center border transition-colors",
                    "hover:border-border hover:bg-muted/40",
                    isSameDay(d, date) && "border-foreground bg-muted/60",
                    isSameDay(d, today) && "ring-1 ring-orange-500/60"
                  )}
                  title={`${d.getDate()}/${d.getMonth() + 1}`}
                >
                  {/* badge de contagem */}
                  {(() => {
                    const count = dotsByDay[keyFor(d)] ?? 0;
                    if (count <= 0) return null;
                    return (
                      <span
                        className="absolute right-1 top-1 inline-flex items-center justify-center rounded-full
                                   bg-orange-500 px-1 text-[10px] font-semibold text-white leading-none"
                        aria-label={`${count} tarefa(s)`}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    );
                  })()}

                  <span
                    className={cn(
                      "mb-1 font-medium",
                      isSameDay(d, date) && "text-foreground"
                    )}
                  >
                    {d.getDate()}
                  </span>

                  {/* pontinhos (máx 3) */}
                  <div className="flex gap-1">
                    {Array.from({
                      length: Math.min(dotsByDay[keyFor(d)] ?? 0, 3),
                    }).map((_, idx) => (
                      <span key={idx} className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    ))}
                  </div>
                </button>
              ) : (
                <div key={i} className="h-16 rounded-md bg-transparent" />
              )
            )}
          </div>

          {!monthHasTasks && (
            <div className="mt-3 text-[12px] text-muted-foreground">
              Nenhuma tarefa com prazo neste mês.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista do dia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tarefas do dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {rightSlot ?? <span className="text-muted-foreground">Selecione um dia no calendário.</span>}
        </CardContent>
      </Card>
    </div>
  );
}
