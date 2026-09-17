import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, DollarSign, Users2 } from "lucide-react";
import type { Projeto } from "@/lib/projects";
import PeopleStack from "./PeopleStack";
import StatusBadge from "./StatusBadge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/*
 * Sem `as any`.
 *
 * Era `(p as any)?.metricas?.totalArtes`, e o cast desligou a única checagem
 * que teria denunciado o problema: o backend nunca mandou `metricas`. A barra
 * ficava zerada em todo projeto, para sempre, e nada reclamava — nem o
 * compilador, nem a tela, que desenha uma barra vazia com a mesma cara de
 * "0% feito".
 */
function useProjetoProgress(p: Projeto) {
  const totalArtes = p.metricas?.totalArtes ?? 0;
  const aprovadas = p.metricas?.aprovadas ?? 0;
  if (!totalArtes) return null;
  const v = Math.round((aprovadas / totalArtes) * 100);
  return { value: v, texto: `${aprovadas} de ${totalArtes} aprovadas` };
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
    <Card className="group card-interativo">
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">
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
              {/* `min-w-0` para o `line-clamp` ter onde encolher: sem ele o
                  nome do cliente sumia atrás do "&", e ficava "Ana Silva &…"
                  em todo cartão — o cliente é metade do que identifica um
                  projeto numa lista. */}
              <span className="min-w-0 line-clamp-1">
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
        {/*
          Sem artes não há barra.

          Desenhar a régua vazia com um "—" ao lado ocupava a mesma altura de
          um progresso real para dizer que não há nada a mostrar — e as três
          barras vazias lado a lado davam à grade a aparência de um projeto
          travado. Uma linha diz melhor.

          E o rótulo diz a contagem, não a porcentagem: "1 de 2 aprovadas" é
          o que a pessoa quer saber; "50%" ela teria que reconstituir.
        */}
        {prog ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{prog.texto}</span>
              <span>{prog.value}%</span>
            </div>
            <Progress value={prog.value} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma arte neste projeto ainda.</p>
        )}

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
          {p.equipe && (
            <Badge variant="outline" className="gap-1">
              <Users2 className="h-3 w-3" />
              {p.equipe.nome}
            </Badge>
          )}
          {/*
            Aqui havia um badge "N artes ativas" lendo
            `(p as any).metricas.artesAtivas`. O backend nunca mandou esse
            campo tampouco, então a condição era sempre falsa e o badge nunca
            apareceu para ninguém. Sai em vez de ganhar um número novo: a linha
            de progresso acima já diz quantas artes existem e quantas passaram.
          */}
        </div>

        {/*
          As três ações viviam atrás de `opacity-0 group-hover:opacity-100`.
          Celular e tablet não têm hover: no telefone sobrava uma faixa vazia
          no rodapé do cartão, com três botões invisíveis e ainda clicáveis, e
          "Abrir" — a ação principal — entre eles. Dava para chegar ao projeto
          só acertando o nome no título.

          "Abrir" sai do grupo e fica sempre visível, porque esconder a ação
          principal de um cartão nunca foi a intenção. Editar e Excluir usam
          `acoes-hover`, que só se esconde onde existe cursor. E Excluir deixa
          de ser um bloco vermelho: visível o tempo todo em cada cartão de uma
          grade, ele virava a coisa mais chamativa da tela.
        */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-2">
          <div className="flex gap-1 acoes-hover">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
          </div>
          <Button variant="outline" size="sm" asChild><Link href={`/projetos/${p.id}`}>Abrir</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
