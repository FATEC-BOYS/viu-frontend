"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Estado vazio padrão.
 *
 * Existia um EmptyState em components/commom/ que nenhuma tela importava — cada
 * uma escrevia o seu, e havia telas com dois tratamentos diferentes ao mesmo
 * tempo (uma caixa tracejada e um texto solto). Este substitui aquele.
 *
 * Duas coisas diferentes usavam a mesma caixa cinza:
 *
 *   "ainda não existe nada aqui"  — para uma conta nova, é a tela inteira: os
 *   quatro primeiros vazios são o produto que ela conhece. Cinza tracejado
 *   sobre cinza é a mesma linguagem de um erro, e quem chega lê defeito.
 *
 *   "o filtro não achou nada"     — não falta conteúdo, sobra critério. Um
 *   ícone grande aqui diz a coisa errada, e um botão de criar empurra para
 *   fora do caminho: o que se quer é limpar o filtro.
 *
 * `variante` separa as duas. O convite ganha a cor — o mesmo ladrilho pastel
 * já usado no Dashboard e na landing, na mesma dose: tinta no ícone e um véu
 * de 15% no fundo, nunca uma área chapada.
 */
export type TomVazio = "lavanda" | "menta" | "pessego" | "algodao";

/** Uma cor por entidade, para o vazio de cada tela ser reconhecível. */
const TINTA: Record<TomVazio, { ladrilho: string; veu: string }> = {
  lavanda: { ladrilho: "bg-pastel-lavanda", veu: "bg-pastel-lavanda/15" },
  menta: { ladrilho: "bg-pastel-menta", veu: "bg-pastel-menta/15" },
  pessego: { ladrilho: "bg-pastel-pessego", veu: "bg-pastel-pessego/15" },
  algodao: { ladrilho: "bg-pastel-algodao", veu: "bg-pastel-algodao/15" },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  tom = "lavanda",
  variante = "convite",
  actionLabel,
  onAction,
  acaoSecundaria,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Cor do convite. Ignorado quando `variante` é "filtro". */
  tom?: TomVazio;
  variante?: "convite" | "filtro";
  actionLabel?: string;
  onAction?: () => void;
  /** O caminho que destrava o passo anterior, quando ele existe. */
  acaoSecundaria?: { label: string; href: string };
  className?: string;
}) {
  if (variante === "filtro") {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-xl border border-dashed bg-muted/20 px-6 py-8 text-center",
          className,
        )}
      >
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {actionLabel && onAction && (
            <Button variant="outline" size="sm" onClick={onAction} className="mt-1">
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center rounded-xl border border-dashed px-6 py-12 text-center",
        TINTA[tom].veu,
        className,
      )}
    >
      <div className="max-w-md space-y-4">
        {Icon && (
          <span
            aria-hidden
            className={cn(
              "mx-auto grid size-14 place-items-center rounded-2xl",
              TINTA[tom].ladrilho,
            )}
          >
            <Icon className="size-6 text-foreground/70" strokeWidth={1.75} />
          </span>
        )}
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
          {description && (
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {(acaoSecundaria || (actionLabel && onAction)) && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
            {acaoSecundaria && (
              /*
               * Sozinha, uma ação em `ghost` some: sem fundo e sem contorno ela
               * lê como legenda, não como algo clicável — e em telas onde não
               * existe ação primária (Tarefas, Feedbacks) ela é a única saída.
               * Só vira discreta quando há um botão primário ao lado para ser
               * discreta em relação a ele.
               */
              <Button asChild variant={actionLabel && onAction ? "ghost" : "outline"}>
                <Link href={acaoSecundaria.href}>{acaoSecundaria.label}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
