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
    <div className="space-y-4">
      <div className="grid gap-2">
        <div><strong>Projeto:</strong> {resumo.nome}</div>
        {resumo.cliente && <div><strong>Cliente:</strong> {resumo.cliente}</div>}
        <div><strong>Status:</strong> {resumo.status}</div>
        <div><strong>Prazo:</strong> {resumo.prazo ?? "—"}</div>
        <div><strong>Orçamento:</strong> {resumo.orcamento}</div>
      </div>

      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Designers adicionais:</span>
          {resumo.designersAdicionais.length ? resumo.designersAdicionais.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Clientes adicionais:</span>
          {resumo.clientesAdicionais.length ? resumo.clientesAdicionais.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium">Aprovadores (cliente):</span>
          {resumo.aprovadores.length ? resumo.aprovadores.map(n => <Badge key={n} variant="secondary">{n}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
        </div>
      </div>

      <div className="grid gap-1 text-sm">
        <div>Exigir aprovação do designer: <strong>{resumo.exigirAprovDesigner ? "Sim" : "Não"}</strong></div>
        <div>Todos os aprovadores são obrigatórios: <strong>{resumo.todosObrigatorios ? "Sim" : "Não"}</strong></div>
        <div>Permitir override do Owner: <strong>{resumo.overrideOwner ? "Sim" : "Não"}</strong></div>
        <div>Prazo p/ aprovação (dias): <strong>{resumo.prazoAprovDias ?? "—"}</strong></div>
      </div>
    </div>
  );
}
