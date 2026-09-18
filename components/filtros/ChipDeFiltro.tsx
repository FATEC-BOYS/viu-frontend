"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Um filtro como chip: um botão que abre as opções.
 *
 * Isto existe para as duas listas grandes do produto — Artes e Projetos —
 * usarem a mesma barra. Projetos já filtrava assim, numa linha; Artes
 * empilhava quatro linhas de controles antes do primeiro cartão.
 *
 * O chip diz o que está valendo. Esconder um filtro atrás de um botão só é
 * honesto se o botão disser que ele está aplicado: um filtro invisível e ativo
 * faz ler uma lista curta como se fosse tudo o que existe — que é o mesmo erro
 * de mostrar três artes e escrever "3 itens" quando são trinta.
 */
export function ChipPopover({
  label,
  valor,
  ativo,
  icon,
  children,
}: {
  /** O nome da dimensão: "Cliente", "Status". */
  label: string;
  /** O que está escolhido, quando há escolha. */
  valor?: string | null;
  /**
   * Se o chip deve se anunciar como aplicado. Por padrão, quando há valor.
   * A ordenação passa `false`: ela sempre tem um valor e não esconde nada.
   */
  ativo?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const aplicado = ativo ?? Boolean(valor);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={aplicado ? "secondary" : "outline"}
          size="sm"
          className={cn("gap-2", aplicado && "border border-foreground/25 font-medium")}
        >
          {icon}
          {valor ? `${label}: ${valor}` : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">{children}</PopoverContent>
    </Popover>
  );
}

export function ChipOption({
  selected,
  onClick,
  label,
}: {
  selected?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="sm"
      className="justify-start"
      onClick={onClick}
    >
      {selected && <Check className="h-4 w-4 mr-2" />}
      <span className="truncate">{label}</span>
    </Button>
  );
}
