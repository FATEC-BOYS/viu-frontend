import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, DollarSign } from "lucide-react";
import type { Projeto } from "@/lib/projects";
import PeopleStack from "./PeopleStack";
import StatusBadge from "./StatusBadge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function useProjetoProgress(p: Projeto) {
  const totalArtes = (p as any)?.metricas?.totalArtes ?? 0;
  const aprovadas   = (p as any)?.metricas?.aprovadas  ?? 0;
  if (!totalArtes) return { value: 0, text: "—" };
  const v = Math.round((aprovadas / totalArtes) * 100);
  return { value: v, text: `${v}%` };
}

export default function ProjectCard({
  p,
  selectMode,
  selected,
  onToggle,
  onEdit,
  onDelete,
  formatBRLFromCents,
}: {
  p: Projeto;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatBRLFromCents: (cents: number) => string;
}) {
  const prog = useProjetoProgress(p);

  return (
    <Card className="transition hover:shadow-md hover:-translate-y-0.5 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              <Link href={`/projetos/${p.id}`} className="hover:underline focus:outline-none focus:underline">
                {p.nome}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PeopleStack
                designer={p.designer ? { nome: p.designer.nome } : undefined}
                cliente={p.cliente ? { nome: p.cliente.nome } : undefined}
              />
              {p.designer?.nome && p.cliente?.nome && <span className="text-xs">•</span>}
              <span className="line-clamp-1">
                {p.designer?.nome}{p.designer?.nome && p.cliente?.nome ? " & " : ""}{p.cliente?.nome}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={p.status} />
            {selectMode && <Checkbox checked={selected} onCheckedChange={onToggle} aria-label="Selecionar projeto" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progresso */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span><span>{prog.text}</span>
          </div>
          <Progress value={prog.value} />
        </div>

        {/* Infos */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <CalendarIcon className="h-3 w-3" />
            {p.prazo ? format(parseISO(p.prazo), "P", { locale: ptBR }) : "Sem prazo"}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <DollarSign className="h-3 w-3" />
            {formatBRLFromCents(p.orcamento ?? 0)}
          </Badge>
          {(p as any)?.metricas?.artesAtivas != null && (
            <Badge variant="outline">{(p as any).metricas.artesAtivas} artes ativas</Badge>
          )}
        </div>

        {/* Ações (hover) */}
        <div className="flex justify-end gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" asChild><Link href={`/projetos/${p.id}`}>Abrir</Link></Button>
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>Excluir</Button>
        </div>
      </CardContent>
    </Card>
  );
}
