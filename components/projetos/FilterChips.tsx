import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronsUpDown, Filter, Search, Users } from "lucide-react";
import { Check } from "lucide-react";
import { orderLabel, StatusFiltro } from "./types";

export function ChipPopover({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">{icon}{label}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">{children}</PopoverContent>
    </Popover>
  );
}
export function ChipOption({ selected, onClick, label }: { selected?: boolean; onClick: () => void; label: string }) {
  return (
    <Button variant={selected ? "secondary" : "ghost"} size="sm" className="justify-start" onClick={onClick}>
      {selected && <Check className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}

export default function FilterChips({
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  prazoPreset, setPrazoPreset,
  clienteFilter, setClienteFilter,
  clientes,
  orderBy, setOrderBy,
  ascending, setAscending,
  rightSlot,
}: {
  searchTerm: string; setSearchTerm: (v: string) => void;
  statusFilter: StatusFiltro; setStatusFilter: (v: StatusFiltro) => void;
  prazoPreset: "todos" | "7" | "30" | "90"; setPrazoPreset: (v: "todos" | "7" | "30" | "90") => void;
  clienteFilter: string | "todos"; setClienteFilter: (v: string | "todos") => void;
  clientes: { id: string; nome: string }[];
  orderBy: "criado_em" | "prazo" | "nome"; setOrderBy: (v: "criado_em" | "prazo" | "nome") => void;
  ascending: boolean; setAscending: (v: boolean) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative w-full sm:w-auto sm:min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Busque por nome, cliente ou vibe…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status */}
      <ChipPopover label={`Status: ${statusFilter === "todos" ? "Todos" : statusFilter}`} icon={<Filter className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-2">
          {(["todos", "EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"] as StatusFiltro[]).map((s) => (
            <ChipOption key={s} selected={statusFilter === s} onClick={() => setStatusFilter(s)} label={s === "todos" ? "Todos" : s} />
          ))}
        </div>
      </ChipPopover>

      {/* Prazo */}
      <ChipPopover label={`Prazo: ${prazoPreset === "todos" ? "Todos" : `Próx. ${prazoPreset} dias`}`} icon={<CalendarIcon className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-2">
          {(["todos", "7", "30", "90"] as const).map((p) => (
            <ChipOption key={p} selected={prazoPreset === p} onClick={() => setPrazoPreset(p)} label={p === "todos" ? "Todos" : `Próx. ${p} dias`} />
          ))}
        </div>
      </ChipPopover>

      {/* Cliente */}
      <ChipPopover label={`Cliente: ${clienteFilter === "todos" ? "Todos" : (clientes.find(c => c.id === clienteFilter)?.nome ?? "—")}`} icon={<Users className="h-4 w-4" />}>
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-auto pr-1">
          <ChipOption selected={clienteFilter === "todos"} onClick={() => setClienteFilter("todos")} label="Todos" />
          {clientes.map((c) => (
            <ChipOption key={c.id} selected={clienteFilter === c.id} onClick={() => setClienteFilter(c.id)} label={c.nome} />
          ))}
        </div>
      </ChipPopover>

      {/* Ordenação */}
      <ChipPopover label={`Ordenar: ${orderLabel(orderBy)} ${ascending ? "↑" : "↓"}`} icon={<ChevronsUpDown className="h-4 w-4" />}>
        <div className="grid gap-2">
          <ChipOption selected={orderBy === "prazo"} onClick={() => setOrderBy("prazo")} label="Prazo" />
          <ChipOption selected={orderBy === "criado_em"} onClick={() => setOrderBy("criado_em")} label="Criação" />
          <ChipOption selected={orderBy === "nome"} onClick={() => setOrderBy("nome")} label="Nome" />
          <div className="h-px bg-border my-1" />
          <ChipOption selected={ascending} onClick={() => setAscending(!ascending)} label={ascending ? "Crescente ↑" : "Decrescente ↓"} />
        </div>
      </ChipPopover>

      {/* Slot à direita (ex.: botão Selecionar) */}
      <div className="ml-auto">{rightSlot}</div>
    </div>
  );
}
