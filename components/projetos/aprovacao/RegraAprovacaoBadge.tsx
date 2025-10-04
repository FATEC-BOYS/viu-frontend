"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Clock } from "lucide-react";

export type RegraAprovacao = {
  modo: "TODOS" | "QUALQUER_UM";
  exigirDesigner?: boolean;
  slaDias?: number | null; // prazo sugerido para resposta
};

export default function RegraAprovacaoBadge({ regra }: { regra: RegraAprovacao }) {
  const label =
    regra.modo === "TODOS" ? "Todos precisam aprovar" : "Qualquer um aprova";

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant="outline" className="rounded-full gap-1">
        <Users className="h-3 w-3" />
        {label}
      </Badge>

      {regra.exigirDesigner && (
        <Badge variant="outline" className="rounded-full gap-1">
          <ShieldCheck className="h-3 w-3" />
          Exige aprovação do designer
        </Badge>
      )}

      {regra.slaDias ? (
        <Badge variant="outline" className="rounded-full gap-1">
          <Clock className="h-3 w-3" />
          SLA {regra.slaDias} dia{regra.slaDias > 1 ? "s" : ""}
        </Badge>
      ) : null}
    </div>
  );
}
