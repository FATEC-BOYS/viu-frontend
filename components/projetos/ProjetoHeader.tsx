"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, ArrowLeft } from "lucide-react";
import type { Projeto } from "@/lib/projects";

type PillTone = "default" | "warning" | "success";

function pillClasses(tone: PillTone) {
  // usamos variant válido e ajustamos a cor via classes utilitárias
  switch (tone) {
    case "success":
      return "border-emerald-200 text-emerald-800 bg-emerald-50";
    case "warning":
      return "border-amber-200 text-amber-800 bg-amber-50";
    default:
      return "border-muted-foreground/20 text-foreground bg-background";
  }
}

export default function ProjetoHeader({
  projeto,
  statusPill,
  onEditar,
  onDuplicar,
  onExportar,
  onArquivar,
}: {
  projeto: Projeto;
  statusPill?: { label: string; tone: PillTone };
  onEditar: () => void;
  onDuplicar: () => void;
  onExportar: () => void;
  onArquivar: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {/* Breadcrumb simples */}
        <div className="mb-1 text-xs text-muted-foreground">
          <Link href="/projetos" className="hover:underline">Projetos</Link>
          <span className="mx-1">/</span>
          <span className="truncate">Projeto</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight truncate">
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

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projetos" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>

        <Button variant="outline" size="sm" onClick={onEditar}>
          Editar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" aria-label="Mais ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDuplicar}>Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={onExportar}>Exportar</DropdownMenuItem>
            <DropdownMenuItem onClick={onArquivar}>Arquivar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
