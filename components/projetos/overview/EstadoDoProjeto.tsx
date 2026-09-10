"use client";

import CTAContextual, { type EstadoCTA } from "./CTAContextual";

/**
 * A primeira coisa que a Visão Geral precisa responder é "em que pé está
 * isto?" — e a resposta tem que caber em uma linha.
 *
 * Antes, a tela abria com quatro cartões de peso igual (Progresso, Prazos,
 * Orçamento, Pessoas) e a ação principal ficava no canto inferior direito,
 * depois de tudo. Quem abria o projeto lia quatro números e não sabia o que
 * fazer com nenhum deles.
 */
export type EstadoResumo = {
  artesTotal: number;
  artesAprovadas: number;
  artesPendentes: number;
  artesRejeitadas: number;
  prazoProjeto?: string | null;
};

/** A frase é derivada do que já existe — nada aqui é calculado no servidor. */
export function frasePara(r: EstadoResumo): { titulo: string; detalhe: string } {
  if (r.artesTotal === 0) {
    return {
      titulo: "Nenhuma arte ainda",
      detalhe: "A revisão começa quando você sobe a primeira.",
    };
  }
  if (r.artesRejeitadas > 0) {
    return {
      titulo:
        r.artesRejeitadas === 1
          ? "1 arte com ajustes pedidos"
          : `${r.artesRejeitadas} artes com ajustes pedidos`,
      detalhe: "O cliente devolveu com comentários.",
    };
  }
  if (r.artesPendentes > 0) {
    return {
      titulo:
        r.artesPendentes === 1
          ? "1 arte esperando aprovação"
          : `${r.artesPendentes} artes esperando aprovação`,
      detalhe: `${r.artesAprovadas} de ${r.artesTotal} já aprovadas.`,
    };
  }
  if (r.artesAprovadas === r.artesTotal) {
    return {
      titulo: "Tudo aprovado",
      detalhe: `${r.artesTotal} ${r.artesTotal === 1 ? "arte aprovada" : "artes aprovadas"}. Dá para fechar o projeto.`,
    };
  }
  return {
    titulo: `${r.artesTotal} ${r.artesTotal === 1 ? "arte" : "artes"} no projeto`,
    detalhe: "Nenhuma esperando você agora.",
  };
}

export default function EstadoDoProjeto({
  resumo,
  estado,
  onAction,
}: {
  resumo: EstadoResumo;
  estado: EstadoCTA;
  onAction: () => void;
}) {
  const { titulo, detalhe } = frasePara(resumo);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight">{titulo}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detalhe}</p>
      </div>
      {/* A ação sobe para o topo: é o que a pessoa veio fazer. */}
      <CTAContextual estado={estado} onClick={onAction} className="shrink-0" />
    </div>
  );
}
