// components/projetos/overview/ResumoCards.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, DollarSign, BarChart3 } from "lucide-react";
import { formatBRLFromCents } from "@/lib/projects";
import ProgressoBar from "./ProgressoBar";
import Sparkline from "./Sparkline";

/** Tipo local compatível com o adapter que montamos na page */
type ProjetoResumoUI = {
  artesAprovadas: number;
  artesPendentes: number;
  artesRejeitadas: number;
  artesTotal: number;
  prazoProjeto?: string | null;
  proximaRevisao?: string | null;
  orcamentoCentavos?: number | null;
  sparkline?: Array<{ date: string; value: number }>;
  pessoas?: {
    owner?: string;
    designers: number;
    clientes: number;
    aprovadores: number;
    observadores?: number;
  };
};

export default function ResumoCards({ resumo }: { resumo: ProjetoResumoUI }) {
  const aprovadas = resumo.artesAprovadas ?? 0;
  const total = resumo.artesTotal ?? 0;

  const pessoas = resumo.pessoas ?? {
    designers: 0,
    clientes: 0,
    aprovadores: 0,
    observadores: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Progresso */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Progresso
          </div>
          <ProgressoBar aprovadas={aprovadas} total={total} caption="(artes aprovadas)" />
        </CardContent>
      </Card>

      {/* Prazos */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Prazos
          </div>
          <div className="text-sm">
            Entrega:{" "}
            <span className="font-medium">
              {resumo.prazoProjeto
                ? new Date(resumo.prazoProjeto).toLocaleDateString("pt-BR")
                : "Sem prazo"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Próxima revisão:{" "}
            <span className="font-medium">
              {resumo.proximaRevisao
                ? new Date(resumo.proximaRevisao).toLocaleDateString("pt-BR")
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Orçamento */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" /> Orçamento
          </div>
          <div className="text-base font-medium">
            {formatBRLFromCents(resumo.orcamentoCentavos ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            Acompanhe o ritmo nas aprovações
          </div>
        </CardContent>
      </Card>

      {/* Pessoas */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Pessoas
          </div>
          <div className="text-sm">
            <span className="font-medium">{pessoas.designers ?? 0}</span> designers •{" "}
            <span className="font-medium">{pessoas.clientes ?? 0}</span> clientes
          </div>
          <div className="text-xs text-muted-foreground">
            {(pessoas.aprovadores ?? 0)} aprovadores • {(pessoas.observadores ?? 0)} observadores
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
