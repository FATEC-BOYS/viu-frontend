import { Badge } from "@/components/ui/badge";
import PeopleStack from "./PeopleStack";
import type { Projeto } from "@/lib/projects";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BoardView({ projects }: { projects: Projeto[] }) {
  const byStatus = (s: Projeto["status"]) => projects.filter((p) => p.status === s);

  const Column = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border p-3 min-h-[240px] bg-background">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary">{Array.isArray(children) ? children.length : 0}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const Card = ({ p }: { p: Projeto }) => (
    <div
      id={p.id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
      className="rounded-lg border p-3 bg-background hover:shadow-sm cursor-grab active:cursor-grabbing"
      title={p.nome}
    >
      <div className="text-sm font-medium line-clamp-1">{p.nome}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <PeopleStack
          designer={p.designer ? { nome: p.designer.nome } : undefined}
          cliente={p.cliente ? { nome: p.cliente.nome } : undefined}
        />
        <span className="ml-2">
          {p.prazo ? format(parseISO(p.prazo), "P", { locale: ptBR }) : "—"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Column title="Em andamento">{byStatus("EM_ANDAMENTO").map((p) => <Card key={p.id} p={p} />)}</Column>
      <Column title="Pausado">{byStatus("PAUSADO").map((p) => <Card key={p.id} p={p} />)}</Column>
      <Column title="Concluído">{byStatus("CONCLUIDO").map((p) => <Card key={p.id} p={p} />)}</Column>
    </div>
  );
}
