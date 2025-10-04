"use client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

type Props = {
  search: string; setSearch: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  prioridade: string; setPrioridade: (v: string) => void;
  responsavel: string; setResponsavel: (v: string) => void;
  sortBy: string; setSortBy: (v: string) => void;
  responsaveis: Array<{ id: string; nome: string }>;
};

export function FiltersBar({
  search, setSearch,
  status, setStatus,
  prioridade, setPrioridade,
  responsavel, setResponsavel,
  sortBy, setSortBy,
  responsaveis
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Digite para achar a missão secreta 🔎"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="PENDENTE">Pendente</SelectItem>
          <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
          <SelectItem value="CONCLUIDA">Concluída</SelectItem>
          <SelectItem value="CANCELADA">Cancelada</SelectItem>
        </SelectContent>
      </Select>

      <Select value={prioridade} onValueChange={setPrioridade}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas</SelectItem>
          <SelectItem value="ALTA">Alta</SelectItem>
          <SelectItem value="MEDIA">Média</SelectItem>
          <SelectItem value="BAIXA">Baixa</SelectItem>
        </SelectContent>
      </Select>

      <Select value={responsavel} onValueChange={setResponsavel}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Responsa" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="prazo">Prazo</SelectItem>
          <SelectItem value="prioridade">Prioridade</SelectItem>
          <SelectItem value="titulo">Título</SelectItem>
          <SelectItem value="status">Status</SelectItem>
          <SelectItem value="criado_em">Mais recente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
