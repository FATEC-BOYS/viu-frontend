"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Check, X, Clock, BellRing, ShieldAlert } from "lucide-react";
import RegraAprovacaoBadge, { type RegraAprovacao } from "./RegraAprovacaoBadge";
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
  regra: RegraAprovacao;
  items: AprovacaoArteRow[];
};

export default function AprovacaoPanel({
  painel,
  onLembrar,
  onOverride,
}: {
  painel: AprovacaoPainel;
  onLembrar: (aprovacaoId: string) => void;
  onOverride: (arteId: string) => void;
}) {
  const items = painel.items ?? [];

  return (
    <div className="space-y-4">
      {/* Regra ativa */}
      <RegraAprovacaoBadge regra={painel.regra} />

      {/* Lista de artes em aprovação */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => {
          const pendentes = it.aprovadores.filter(a => a.status === "PENDENTE").length;
          const rejeitados = it.aprovadores.filter(a => a.status === "REJEITADO").length;
          const aprovado = it.status === "APROVADO" || (rejeitados === 0 && pendentes === 0 && it.aprovadores.length > 0);

          return (
            <Card key={it.aprovacaoId} className="overflow-hidden">
              <div className="grid grid-cols-[96px_1fr] gap-0">
                {/* Thumb */}
                <div className="relative h-full min-h-[96px] bg-muted">
                  {it.previewUrl ? (
                    <Image src={it.previewUrl} alt={it.arteNome} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">
                      sem preview
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Cabeçalho da arte */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.arteNome}</div>
                      <div className="text-xs text-muted-foreground">
                        v{it.versaoAtual} • {new Date(it.criadoEm).toLocaleDateString("pt-BR")}
                      </div>
                    </div>

                    <Badge
                      className={cn(
                        "rounded-full",
                        aprovado
                          ? "bg-green-600 text-white hover:bg-green-600"
                          : rejeitados > 0
                          ? "bg-red-600 text-white hover:bg-red-600"
                          : "bg-yellow-500 text-white hover:bg-yellow-500"
                      )}
                    >
                      {aprovado ? "Aprovada" : rejeitados > 0 ? "Rejeitada" : "Pendente"}
                    </Badge>
                  </div>

                  {/* Chips de aprovadores */}
                  <TooltipProvider>
                    <ScrollArea className="max-h-28 rounded-md">
                      <ul className="flex flex-col gap-2 pr-2">
                        {it.aprovadores.map((ap) => (
                          <li key={ap.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {ap.avatar ? (
                                <AvatarImage src={ap.avatar} alt={ap.nome} />
                              ) : (
                                <AvatarFallback className="text-[10px]">
                                  {ap.nome.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className="text-sm truncate">{ap.nome}</div>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]",
                                    ap.status === "APROVADO" && "bg-emerald-100 text-emerald-700 border border-emerald-200",
                                    ap.status === "REJEITADO" && "bg-rose-100 text-rose-700 border border-rose-200",
                                    ap.status === "PENDENTE" && "bg-amber-100 text-amber-800 border border-amber-200"
                                  )}
                                >
                                  {ap.status === "APROVADO" && <Check className="h-3 w-3" />}
                                  {ap.status === "REJEITADO" && <X className="h-3 w-3" />}
                                  {ap.status === "PENDENTE" && <Clock className="h-3 w-3" />}
                                  <span>{ap.status === "PENDENTE" ? "Pendente" : ap.status === "REJEITADO" ? "Rejeitado" : "Aprovado"}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="text-xs">
                                  {ap.status === "PENDENTE" && ap.prazo
                                    ? `Prazo: ${new Date(ap.prazo).toLocaleDateString("pt-BR")}`
                                    : ap.comentario ?? "—"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </li>
                        ))}
                        {!it.aprovadores.length && (
                          <li className="text-xs text-muted-foreground">Sem aprovadores atribuídos</li>
                        )}
                      </ul>
                    </ScrollArea>
                  </TooltipProvider>

                  <Separator />

                  {/* Ações */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-muted-foreground">
                      {pendentes > 0
                        ? `${pendentes} pendente${pendentes > 1 ? "s" : ""}`
                        : rejeitados > 0
                        ? `${rejeitados} rejeição${rejeitados > 1 ? "es" : ""}`
                        : "Tudo aprovado"}
                    </div>

                    <div className="flex gap-2">
                      {pendentes > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLembrar(it.aprovacaoId)}
                          className="gap-1"
                        >
                          <BellRing className="h-3.5 w-3.5" />
                          Lembrar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onOverride(it.arteId)}
                        className="gap-1"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Override
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>

      {!items.length && (
        <div className="text-sm text-muted-foreground border rounded-xl p-6 text-center">
          Nenhuma arte em aprovação no momento.
        </div>
      )}
    </div>
  );
}
