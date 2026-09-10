"use client";

import { Calendar, Users, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/projects";
import ProgressoBar from "./ProgressoBar";

/**
 * Os números do projeto, em peso secundário.
 *
 * Eram quatro cartões do mesmo tamanho do resto da tela, competindo com a
 * pergunta principal. Aqui viram uma faixa: quem quer o número acha, e quem
 * abriu para trabalhar não tropeça neles.
 *
 * Onde falta dado, o vazio vira ação — "Sem prazo" sozinho é uma constatação;
 * o que a pessoa quer nesse ponto é definir um.
 */
export type NumerosResumo = {
  artesAprovadas: number;
  artesTotal: number;
  prazoProjeto?: string | null;
  orcamentoCentavos?: number | null;
  pessoas?: { designers: number; clientes: number; aprovadores: number; observadores?: number };
};

function Bloco({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof Calendar;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icone className="h-3.5 w-3.5 shrink-0" />
        {rotulo}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export default function NumerosDoProjeto({
  resumo,
  onDefinirPrazo,
  onEditarOrcamento,
}: {
  resumo: NumerosResumo;
  onDefinirPrazo: () => void;
  onEditarOrcamento: () => void;
}) {
  const pessoas = resumo.pessoas ?? { designers: 0, clientes: 0, aprovadores: 0, observadores: 0 };
  const semOrcamento = !resumo.orcamentoCentavos;

  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
      <Bloco icone={BarChart3} rotulo="Progresso">
        {/* Sem `caption`: a barra já escreve "0/0 aprovadas" à esquerda. */}
        <ProgressoBar aprovadas={resumo.artesAprovadas ?? 0} total={resumo.artesTotal ?? 0} />
      </Bloco>

      <Bloco icone={Calendar} rotulo="Entrega">
        {resumo.prazoProjeto ? (
          <span className="font-medium">
            {new Date(resumo.prazoProjeto).toLocaleDateString("pt-BR")}
          </span>
        ) : (
          <Button variant="link" className="h-auto p-0 text-sm" onClick={onDefinirPrazo}>
            Definir prazo
          </Button>
        )}
      </Bloco>

      <Bloco icone={DollarSign} rotulo="Orçamento">
        {semOrcamento ? (
          // Sem isto a fatura não pode ser gerada, e a pessoa só descobria
          // quando tentava e levava um erro.
          <Button variant="link" className="h-auto p-0 text-sm" onClick={onEditarOrcamento}>
            Definir valor
          </Button>
        ) : (
          <span className="font-medium">{formatBRLFromCents(resumo.orcamentoCentavos!)}</span>
        )}
      </Bloco>

      <Bloco icone={Users} rotulo="Pessoas">
        <span className="font-medium">{pessoas.designers ?? 0}</span> no time ·{" "}
        <span className="font-medium">{pessoas.clientes ?? 0}</span>{" "}
        {pessoas.clientes === 1 ? "cliente" : "clientes"}
      </Bloco>
    </div>
  );
}
