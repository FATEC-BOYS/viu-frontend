"use client";

import InlineAlert from "@/components/commom/InlineAlert";

export default function ProjetoAlertBanner({
  prazosSemana,
  aprovacaoTravada,
  semAprovador,
  onResolver,
}: {
  prazosSemana: number;
  aprovacaoTravada: number;
  semAprovador: boolean;
  onResolver?: () => void;
}) {
  const alerts = [];

  if (prazosSemana > 0) {
    alerts.push(
      <InlineAlert
        key="prazos"
        tone="warn"
        title={`${prazosSemana} prazo${prazosSemana > 1 ? "s" : ""} vencendo esta semana`}
        description="Fique de olho para não estourar o cronograma."
      />
    );
  }

  if (aprovacaoTravada > 0) {
    alerts.push(
      <InlineAlert
        key="aprovacao"
        tone="info"
        title={`Aprovação travada há ${aprovacaoTravada} dia${aprovacaoTravada > 1 ? "s" : ""}`}
        description="Você pode lembrar os aprovadores ou aplicar override como Owner."
        actions={
          onResolver ? (
            <button
              onClick={onResolver}
              className="text-xs rounded-md border px-2 py-1 hover:bg-muted"
            >
              Resolver agora
            </button>
          ) : null
        }
      />
    );
  }

  if (semAprovador) {
    alerts.push(
      <InlineAlert
        key="sem-aprovador"
        tone="error"
        title="Sem cliente aprovador definido"
        description="Defina pelo menos um aprovador para habilitar o fluxo de aprovação."
        actions={
          onResolver ? (
            <button
              onClick={onResolver}
              className="text-xs rounded-md border px-2 py-1 hover:bg-muted"
            >
              Configurar
            </button>
          ) : null
        }
      />
    );
  }

  if (alerts.length === 0) return null;

  return <div className="grid gap-2">{alerts}</div>;
}
