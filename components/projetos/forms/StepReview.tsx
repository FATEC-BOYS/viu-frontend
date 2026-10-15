"use client";
import AdminOnly from '@/components/layout/AdminOnly';

export default function StepReview({ resumo }: { resumo: {
  nome: string; cliente?: string; prazo?: string; orcamento: string; status: string;
} }) {
  return (
    <div className="space-y-5 text-sm">
      <dl className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
        <div><dt className="text-muted-foreground">Projeto</dt><dd className="font-medium">{resumo.nome}</dd></div>
        <div><dt className="text-muted-foreground">Cliente principal</dt><dd>{resumo.cliente || 'Cliente selecionado'}</dd></div>
        <div><dt className="text-muted-foreground">Status</dt><dd>{resumo.status}</dd></div>
        <div><dt className="text-muted-foreground">Entrega</dt><dd>{resumo.prazo || 'Sem prazo'}</dd></div>
        <AdminOnly><div><dt className="text-muted-foreground">Orçamento</dt><dd>{resumo.orcamento}</dd></div></AdminOnly>
      </dl>
      <p className="rounded-2xl border border-border/60 p-4 leading-relaxed">
        Você envia cada versão para aprovação. O cliente principal aprova ou pede ajustes, informando o que precisa mudar.
      </p>
    </div>
  );
}
