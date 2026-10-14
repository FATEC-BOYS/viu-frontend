"use client";
import { Badge } from "@/components/ui/badge";

export default function StepReview({
  resumo,
}: {
  resumo: {
    nome: string;
    cliente?: string;
    prazo?: string;
    orcamento: string;
    status: string;
    designersAdicionais: string[];
    clientesAdicionais: string[];
    aprovadores: string[];
    exigirAprovDesigner: boolean;
    todosObrigatorios: boolean;
    overrideOwner: boolean;
    prazoAprovDias?: number | null;
  };
}) {
  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <div><strong>Projeto:</strong> {resumo.nome}</div>
        {resumo.cliente && <div><strong>Cliente:</strong> {resumo.cliente}</div>}
        <div><strong>Status:</strong> {resumo.status}</div>
        <div><strong>Prazo:</strong> {resumo.prazo ?? "Não informado"}</div>
        <div><strong>Orçamento:</strong> {resumo.orcamento}</div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Designers adicionais:</span>
          {resumo.designersAdicionais.length ? resumo.designersAdicionais.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Clientes adicionais:</span>
          {resumo.clientesAdicionais.length ? resumo.clientesAdicionais.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Clientes aprovadores:</span>
          {resumo.aprovadores.length ? resumo.aprovadores.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 p-4 sm:p-5">
        <div>Exigir aprovação do designer: <strong>{resumo.exigirAprovDesigner ? "Sim" : "Não"}</strong></div>
        <div>Todos os aprovadores são obrigatórios: <strong>{resumo.todosObrigatorios ? "Sim" : "Não"}</strong></div>
        <div>Decisão final do responsável: <strong>{resumo.overrideOwner ? "Sim" : "Não"}</strong></div>
        <div>Prazo para aprovação (dias): <strong>{resumo.prazoAprovDias ?? "Não informado"}</strong></div>
      </div>
    </div>
  );
}
