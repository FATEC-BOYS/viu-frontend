"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, ArrowLeft, Users } from "lucide-react";
import type { Projeto } from "@/lib/projects";

type PillTone = "default" | "warning" | "success";

function pillClasses(tone: PillTone) {
  // usamos variant válido e ajustamos a cor via classes utilitárias
  switch (tone) {
    case "success":
      return "border-emerald-200 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40";
    case "warning":
      return "border-amber-200 text-amber-800 bg-amber-50 dark:bg-amber-950/40";
    default:
      return "border-muted-foreground/20 text-foreground bg-background";
  }
}

export default function ProjetoHeader({
  projeto,
  statusPill,
  onEditar,
  onPessoas,
  onDuplicar,
  onPausar,
  onRetomar,
  onCancelar,
}: {
  projeto: Projeto;
  statusPill?: { label: string; tone: PillTone };
  onEditar: () => void;
  /** Abre o painel de pessoas com acesso e convites do projeto. */
  onPessoas?: () => void;
  onDuplicar: () => void;
  /**
   * O menu tinha "Duplicar", "Exportar" e "Arquivar", os três ligados a
   * `console.log`. "Arquivar" não existe no modelo de dados — os estados são
   * RASCUNHO, EM_ANDAMENTO, PAUSADO, CONCLUIDO e CANCELADO — e chamar de
   * arquivo o que na verdade cancela seria mentir sobre o que o clique faz.
   * "Exportar" não tem formato nem endpoint definidos, então sai daqui: item
   * de menu não é lugar de guardar intenção.
   */
  onPausar: () => void;
  onRetomar: () => void;
  onCancelar: () => void;
}) {
  return (
    /*
     * `flex-wrap` e uma base para o título: sem isso os quatro botões de ação
     * ficavam com a largura inteira no celular e sobravam uns 60px para o nome
     * do projeto, que em `text-3xl` virava uma letra por linha ("Ir" / "U").
     * Agora as ações descem para a linha de baixo quando não cabem.
     */
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-64">
        {/* Breadcrumb simples */}
        <div className="mb-1 text-xs text-muted-foreground">
          <Link href="/projetos" className="hover:underline">Projetos</Link>
          <span className="mx-1">/</span>
          <span className="truncate">Projeto</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {projeto.nome}
          </h1>

          {statusPill && (
            <Badge
              // use uma variante existente e pinte via className
              variant="outline"
              className={`rounded-full px-2 py-0.5 text-xs ${pillClasses(statusPill.tone)}`}
            >
              {statusPill.label}
            </Badge>
          )}
        </div>

        {projeto.descricao && (
          <p className="text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
            {projeto.descricao}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projetos" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>

        {onPessoas && (
          <Button variant="outline" size="sm" onClick={onPessoas}>
            <Users className="mr-1 h-4 w-4" aria-hidden /> Pessoas
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onEditar}>
          Editar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" aria-label="Mais ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onDuplicar}>Duplicar projeto</DropdownMenuItem>
            {/* As transições vêm de PROJETO_TRANSITIONS no backend: pausar só
                vale para quem está em andamento, retomar só para quem está
                pausado, e concluído ou cancelado não voltam. */}
            {projeto.status === "EM_ANDAMENTO" && (
              <DropdownMenuItem onClick={onPausar}>Pausar</DropdownMenuItem>
            )}
            {projeto.status === "PAUSADO" && (
              <DropdownMenuItem onClick={onRetomar}>Retomar</DropdownMenuItem>
            )}
            {["RASCUNHO", "EM_ANDAMENTO", "PAUSADO"].includes(projeto.status) && (
              <DropdownMenuItem onClick={onCancelar} className="text-destructive">
                Cancelar projeto
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
