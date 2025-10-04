import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Projeto } from "@/lib/projects";
import { addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import clsx from "clsx";

export default function CalendarView({
  projects,
  onCreateAtDate,
}: {
  projects: Projeto[];
  onCreateAtDate: (date: Date) => void;
}) {
  const today = new Date();
  const start = startOfWeek(startOfMonth(today), { locale: ptBR });
  const end = endOfWeek(endOfMonth(today), { locale: ptBR });

  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (<div key={d} className="text-center">{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const items = projects.filter((p) => p.prazo && isSameDay(parseISO(String(p.prazo)), d));
          return (
            <div key={i} className={clsx("min-h-[96px] rounded-lg border p-2", isSameDay(d, today) && "border-primary")}>
              <div className="flex items-center justify-between">
                <span className="text-xs">{format(d, "d", { locale: ptBR })}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onCreateAtDate(d)} title="Criar projeto neste dia">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0,3).map((p) => (
                  <Link key={p.id} href={`/projetos/${p.id}`} className="block text-xs rounded px-1 py-0.5 border hover:bg-accent">
                    {p.nome}
                  </Link>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} mais…</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
