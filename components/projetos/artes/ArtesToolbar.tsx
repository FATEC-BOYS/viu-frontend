"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ArteStatus = "EM_ANALISE" | "APROVADO" | "REJEITADO" | "PENDENTE" | "RASCUNHO";

export type ArteFilters = {
  q: any;
  autor: boolean;
  tag: boolean;
  search?: string;
  tipo?: string[];          // ex: ["POST", "BANNER", "LOGO"]
  status?: ArteStatus[];    // múltipla seleção
  autorIds?: string[];      // chips (ids dos autores)
  tags?: string[];          // opcional, se você tiver tags
};

export type AutorOption = { id: string; nome: string };

export default function ArtesToolbar({
  filters,
  onChange,
  tiposDisponiveis,
  autoresDisponiveis,
  tagsDisponiveis,
  className,
}: {
  filters: ArteFilters;
  onChange: (next: ArteFilters) => void;
  tiposDisponiveis?: string[];
  autoresDisponiveis?: AutorOption[];
  tagsDisponiveis?: string[];
  className?: string;
}) {
  const statusOptions = useMemo<ArteStatus[]>(
    () => ["EM_ANALISE", "APROVADO", "REJEITADO", "PENDENTE", "RASCUNHO"],
    []
  );

  function toggleArray(key: keyof ArteFilters, value: string) {
    const arr = (filters[key] as string[] | undefined) ?? [];
    const exists = arr.includes(value);
    const next = exists ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  }

  function clearAll() {
    onChange({
      search: "", tipo: [], status: [], autorIds: [], tags: [],
      q: undefined,
      autor: false,
      tag: false
    });
  }

  const activeCount =
    (filters.tipo?.length ?? 0) +
    (filters.status?.length ?? 0) +
    (filters.autorIds?.length ?? 0) +
    (filters.tags?.length ?? 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Linha de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, autor ou vibe…"
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:underline"
          >
            limpar filtros
          </button>
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Tipo */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tipo:</span>
          <div className="flex flex-wrap gap-1">
            {(tiposDisponiveis ?? []).map((t) => {
              const active = filters.tipo?.includes(t);
              return (
                <Badge
                  key={t}
                  variant={active ? "default" : "outline"}
                  className={cn("cursor-pointer rounded-full", active && "bg-primary text-primary-foreground")}
                  onClick={() => toggleArray("tipo", t)}
                >
                  {t}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((s) => {
              const active = filters.status?.includes(s);
              const label =
                s === "EM_ANALISE" ? "Em análise" :
                s === "APROVADO" ? "Aprovado" :
                s === "REJEITADO" ? "Rejeitado" :
                s === "PENDENTE" ? "Pendente" :
                "Rascunho";
              return (
                <Badge
                  key={s}
                  variant={active ? "default" : "outline"}
                  className={cn("cursor-pointer rounded-full")}
                  onClick={() => toggleArray("status", s)}
                >
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Autor (popover com chips) */}
        {autoresDisponiveis && autoresDisponiveis.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Autor
                <ChevronsUpDown className="h-4 w-4" />
                {filters.autorIds?.length ? (
                  <span className="text-xs text-muted-foreground">({filters.autorIds.length})</span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="flex flex-wrap gap-1">
                {autoresDisponiveis.map((a) => {
                  const active = filters.autorIds?.includes(a.id);
                  return (
                    <Badge
                      key={a.id}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer rounded-full"
                      onClick={() => toggleArray("autorIds", a.id)}
                      title={a.nome}
                    >
                      {a.nome}
                    </Badge>
                  );
                })}
              </div>
              {filters.autorIds?.length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground"
                  onClick={() => onChange({ ...filters, autorIds: [] })}
                >
                  <X className="h-3 w-3 mr-1" /> limpar autores
                </Button>
              ) : null}
            </PopoverContent>
          </Popover>
        )}

        {/* Tags (opcional) */}
        {tagsDisponiveis && tagsDisponiveis.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tags:</span>
            <div className="flex flex-wrap gap-1">
              {tagsDisponiveis.map((t) => {
                const active = filters.tags?.includes(t);
                return (
                  <Badge
                    key={t}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer rounded-full"
                    onClick={() => toggleArray("tags", t)}
                  >
                    #{t}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
