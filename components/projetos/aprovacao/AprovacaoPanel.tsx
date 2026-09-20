"use client";

import Thumb from "@/components/layout/Thumb";
import { formatarDia } from '@/lib/diaDeCalendario';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellRing } from "lucide-react";
import { cn } from "@/lib/utils";

export type AprovadorChip = {
  id: string;
  nome: string;
  avatar?: string | null;
  status: "APROVADO" | "PENDENTE" | "REJEITADO";
  prazo?: string | null; // ISO limite para aprovar
  comentario?: string | null;
};

export type AprovacaoArteRow = {
  aprovacaoId: string;              // id do registro de aprovação ativo (por arte / versão)
  arteId: string;
  arteNome: string;
  versaoAtual: number;
  status: "EM_ANALISE" | "APROVADO" | "REJEITADO" | "PENDENTE";
  criadoEm: string;                 // quando a aprovação foi aberta
  previewUrl?: string | null;
  aprovadores: AprovadorChip[];
};

export type AprovacaoPainel = {
  items: AprovacaoArteRow[];
};

export default function AprovacaoPanel({
  painel,
  onLembrar,
  acoes,
}: {
  painel: AprovacaoPainel;
  onLembrar: (aprovacaoId: string) => void;
  /** Gatilho do designer. Sem ele o painel só consegue mostrar o que já existe. */
  acoes?: React.ReactNode;
}) {
  const items = painel.items ?? [];

  return (
    <div className="space-y-4">
      {acoes && <div className="flex justify-end">{acoes}</div>}

      {/*
        Uma borda para a lista, com fio entre as artes.

        Eram dois cartões lado a lado numa grade `md:grid-cols-2`, e o conteúdo
        saía cortado: "Pend…" no lugar de "Pendente", "Enviar lemb…" no lugar
        do botão. A causa é a de sempre — uma faixa `1fr` nasce com
        `min-width: auto` e se recusa a encolher abaixo do conteúdo, então ela
        crescia para fora do cartão e o `overflow-hidden` do cartão cortava.
        A correção não é mais largura: é `min-w-0` em quem precisa encolher,
        e aqui ela vem por construção.
      */}
      {items.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((it) => {
            const pendentes = it.aprovadores.filter((a) => a.status === "PENDENTE");
            const rejeitados = it.aprovadores.filter((a) => a.status === "REJEITADO").length;
            const aprovado =
              it.status === "APROVADO" ||
              (rejeitados === 0 && pendentes.length === 0 && it.aprovadores.length > 0);
            const desde = new Date(it.criadoEm).toLocaleDateString("pt-BR");
            const recado =
              rejeitados > 0
                ? "Ajustes pedidos — os comentários estão na arte."
                : pendentes.length > 0
                  ? pendentes.length === 1
                    ? `esperando ${pendentes[0].nome} desde ${desde}`
                    : `esperando ${pendentes.length} pessoas desde ${desde}`
                  : aprovado
                    ? `aprovada em ${desde}`
                    : "ninguém foi convidado para aprovar ainda";

            return (
              <li key={it.aprovacaoId} className="flex items-center gap-3 px-3 py-3">
                {/* Ver ArtesDenseList: `<Image>` cru derruba a página em host não
                    declarado; `Thumb` transforma a falha em ícone. */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Thumb src={it.previewUrl} alt={it.arteNome} sizes="48px" iconClassName="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{it.arteNome}</span>
                    {/*
                      Contornado, não preenchido. O verde sólido disputava o
                      destaque com "Solicitar aprovação", que é a ação da aba —
                      e um estado não compete com uma ação.
                    */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-full text-[11px] font-normal",
                        aprovado && "border-emerald-600/30 text-emerald-700 dark:text-emerald-400",
                        rejeitados > 0 && "border-destructive/30 text-destructive",
                      )}
                    >
                      {aprovado ? "Aprovada" : rejeitados > 0 ? "Rejeitada" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    v{it.versaoAtual} · {recado}
                  </p>
                </div>

                {/* O botão antes dos avatares, e não depois, para os avatares
                    ficarem na mesma coluna em toda linha: com o botão por
                    último, a linha sem pendência empurrava o seu avatar para a
                    borda e as duas listas não se alinhavam. */}
                {pendentes.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLembrar(it.aprovacaoId)}
                    className="shrink-0 gap-1"
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    {/* "Lembrar" sozinho lê como "lembrar-se de algo".
                        Quem clica aqui está cobrando outra pessoa. */}
                    Enviar lembrete
                  </Button>
                )}

                <PilhaDeAprovadores aprovadores={it.aprovadores} />
              </li>
            );
          })}
        </ul>
      )}

      {/* Uma linha: "não há nada" não merece a maior caixa da tela. */}
      {!items.length && (
        <p className="py-6 text-sm text-muted-foreground">
          Nenhuma arte em aprovação. Solicite a aprovação de uma arte para o cliente decidir.
        </p>
      )}
    </div>
  );
}

/**
 * Quem tem que decidir, e em que pé cada um está.
 *
 * Era uma lista vertical dentro de um `ScrollArea` de 28 de altura, com um
 * chip por pessoa — o bloco mais alto do cartão para, no caso comum, dizer uma
 * linha. O anel da cor do estado carrega a mesma informação sem ocupar altura,
 * e o nome continua alcançável: fica no tooltip e no texto para leitor de tela.
 */
function PilhaDeAprovadores({ aprovadores }: { aprovadores: AprovadorChip[] }) {
  if (!aprovadores.length) {
    return <span className="shrink-0 text-xs text-muted-foreground">sem aprovadores</span>;
  }

  const ANEL: Record<AprovadorChip["status"], string> = {
    APROVADO: "ring-emerald-600",
    REJEITADO: "ring-destructive",
    PENDENTE: "ring-border",
  };
  const DITO: Record<AprovadorChip["status"], string> = {
    APROVADO: "aprovou",
    REJEITADO: "recusou",
    PENDENTE: "ainda não decidiu",
  };

  return (
    <TooltipProvider>
      <ul className="flex shrink-0 -space-x-1.5">
        {aprovadores.map((ap) => (
          <li key={ap.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className={cn("h-7 w-7 ring-2", ANEL[ap.status])}>
                  {ap.avatar ? (
                    <AvatarImage src={ap.avatar} alt="" />
                  ) : (
                    <AvatarFallback className="text-[10px]">
                      {ap.nome.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                  <span className="sr-only">
                    {ap.nome} {DITO[ap.status]}
                  </span>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {ap.nome} — {DITO[ap.status]}
                  {ap.status === "PENDENTE" && ap.prazo
                    ? ` (prazo: ${formatarDia(ap.prazo)})`
                    : ap.comentario
                      ? `: ${ap.comentario}`
                      : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </TooltipProvider>
  );
}
