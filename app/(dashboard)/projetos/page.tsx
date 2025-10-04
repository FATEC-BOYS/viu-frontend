"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Settings2 } from "lucide-react";
import ProjetoModal from "@/components/projetos/ProjetoModal";
import { toast } from "sonner";
import {
  type Projeto,
  type ProjetoInput,
  listProjetos,
  createProjeto,
  updateProjeto,
  deleteProjeto,
  formatBRLFromCents,
} from "@/lib/projects";

import SkeletonCard from "@/components/projetos/SkeletonCard";
import ProjectCard from "@/components/projetos/ProjectCard";
import BulkBar from "@/components/projetos/BulkBar";
import BoardView from "@/components/projetos/BoardView";
import CalendarView from "@/components/projetos/CalendarView";
import FilterChips from "@/components/projetos/FilterChips";
import type { Mode, StatusFiltro } from "@/components/projetos/types";

const LOADER_LINES = ["Afiando os lápis…","Abrindo pastas…","Buscando inspirações…","Alinhando pixels…"];

type ProjetoInitial = {
  id: string; nome: string; descricao?: string | null;
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  orcamento: number; prazo?: string | null; cliente_id?: string | null;
};

export default function ProjetosPage() {
  // data
  const [rows, setRows] = useState<Projeto[]>([]);
  const [filtered, setFiltered] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loaderLine, setLoaderLine] = useState(LOADER_LINES[0]);
  const [error, setError] = useState<string | null>(null);

  // ui
  const [mode, setMode] = useState<Mode>("cards");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFiltro>("todos");
  const [prazoPreset, setPrazoPreset] = useState<"todos" | "7" | "30" | "90">("todos");
  const [clienteFilter, setClienteFilter] = useState<string | "todos">("todos");
  const [orderBy, setOrderBy] = useState<"criado_em" | "prazo" | "nome">("criado_em");
  const [ascending, setAscending] = useState(false);

  // seleção em massa
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.entries(selected).filter(([,v])=>v).map(([k])=>k), [selected]);

  // loader frases
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoaderLine((prev) => LOADER_LINES[(LOADER_LINES.indexOf(prev) + 1) % LOADER_LINES.length]);
    }, 1600);
    return () => clearInterval(id);
  }, [loading]);

  const reload = async () => {
    setLoading(true);
    try {
      const { rows } = await listProjetos({ search: searchTerm, status: statusFilter, orderBy, ascending, limit: 100, offset: 0 });
      setRows(rows);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  // filtros client-side
  useEffect(() => {
    let f = rows;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        (p.descricao ?? "").toLowerCase().includes(q) ||
        p.designer?.nome.toLowerCase().includes(q) ||
        p.cliente?.nome.toLowerCase().includes(q));
    }
    if (statusFilter !== "todos") f = f.filter(p => p.status === statusFilter);
    if (prazoPreset !== "todos") {
      const days = Number(prazoPreset);
      const until = new Date().getTime() + days * 24 * 60 * 60 * 1000;
      f = f.filter(p => (p.prazo ? new Date(p.prazo).getTime() <= until : false));
    }
    if (clienteFilter !== "todos") f = f.filter(p => p.cliente?.id === clienteFilter);

    const sorted = [...f].sort((a, b) => {
      if (orderBy === "nome") return a.nome.localeCompare(b.nome) * (ascending ? 1 : -1);
      if (orderBy === "prazo") {
        const at = a.prazo ? new Date(a.prazo).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.prazo ? new Date(b.prazo).getTime() : Number.POSITIVE_INFINITY;
        return (at - bt) * (ascending ? 1 : -1);
      }
      const at = new Date(a.criado_em).getTime();
      const bt = new Date(b.criado_em).getTime();
      return (bt - at) * (ascending ? -1 : 1);
    });
    setFiltered(sorted);
  }, [rows, searchTerm, statusFilter, prazoPreset, clienteFilter, orderBy, ascending]);

  const estatisticas = useMemo(() => ({
    total: rows.length,
    emAndamento: rows.filter((p) => p.status === "EM_ANDAMENTO").length,
    concluidos: rows.filter((p) => p.status === "CONCLUIDO").length,
    pausados: rows.filter((p) => p.status === "PAUSADO").length,
  }), [rows]);

  // CRUD
  const onCreate = async (values: ProjetoInput) => {
    setBusy(true);
    try {
      const novo = await createProjeto(values);
      setRows((prev) => [novo, ...prev]);
      toast.success("Projeto criado. Bora brilhar ✨");
      setOpenModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar projeto"); throw e;
    } finally { setBusy(false); }
  };
  const onUpdate = async (values: ProjetoInput) => {
    if (!editing) return;
    setBusy(true);
    try {
      const atualizado = await updateProjeto(editing.id, values);
      setRows((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
      setEditing(null);
      toast.success("Projeto atualizado!");
      setOpenModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar projeto"); throw e;
    } finally { setBusy(false); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("Jogar fora? Tem certeza? Ainda dá tempo de desfazer…")) return;
    setBusy(true);
    try {
      const [{ count: artesCount, error: aErr }, { count: tarefasCount, error: tErr }] = await Promise.all([
        supabase.from("artes").select("id", { count: "exact", head: true }).eq("projeto_id", id),
        supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("projeto_id", id),
      ]);
      if (aErr || tErr) throw aErr || tErr;
      if ((artesCount ?? 0) > 0 || (tarefasCount ?? 0) > 0) {
        toast.error("Não é possível excluir: existem artes e/ou tarefas vinculadas."); return;
      }
      setRows((prev) => prev.filter((p) => p.id !== id));
      await deleteProjeto(id);
      toast.success("Projeto excluído!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao excluir");
    } finally { setBusy(false); }
  };

  function mapProjetoToInitial(p: Projeto | null): ProjetoInitial | null {
    if (!p) return null;
    return {
      id: p.id, nome: p.nome, descricao: p.descricao ?? null,
      status: p.status, orcamento: p.orcamento ?? 0,
      prazo: p.prazo ?? null, cliente_id: p.cliente?.id ?? null,
    };
  }

  // seleção em massa
  const toggleSelectMode = () => { setSelectMode((s) => !s); setSelected({}); };
  const toggleSelect = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const bulkChangeStatus = (status: Projeto["status"]) => {
    setRows((prev) => prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status } : p)));
    toast.message("Status atualizado", { description: `${selectedIds.length} projeto(s) alterado(s).` });
    setSelected({}); setSelectMode(false);
  };
  const bulkSetPrazo = (days: number) => {
    const newDate = new Date(Date.now() + days*24*60*60*1000).toISOString();
    setRows((prev) => prev.map((p) => (selectedIds.includes(p.id) ? { ...p, prazo: newDate } : p)));
    toast.message("Prazo definido", { description: `${selectedIds.length} projeto(s) com novo prazo.` });
    setSelected({}); setSelectMode(false);
  };

  // clientes únicos (chip)
  const clientes = useMemo(() => {
    const map = new Map<string, { id: string; nome: string }>();
    rows.forEach((p) => { if (p.cliente) map.set(p.cliente.id, p.cliente); });
    return Array.from(map.values());
  }, [rows]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-sm text-muted-foreground">{loaderLine}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mt-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <p className="text-lg font-medium mb-2">Deu ruim por aqui.</p>
          <p className="text-muted-foreground mb-6">Que tal recarregar? (e se persistir, me chama).</p>
          <Button onClick={reload}>Recarregar</Button>
        </div>
      </div>
    );
  }

  const empty = filtered.length === 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Projetos ✦</h1>
          <Badge variant="secondary" className="h-6">{estatisticas.total} projetos</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => { setEditing(null); setOpenModal(true); }} title="Criar projeto — vamos dar um nome bonito?">
            <Plus className="h-4 w-4 mr-2" /> Novo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <FilterChips
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        prazoPreset={prazoPreset} setPrazoPreset={setPrazoPreset}
        clienteFilter={clienteFilter} setClienteFilter={setClienteFilter}
        clientes={clientes}
        orderBy={orderBy} setOrderBy={setOrderBy}
        ascending={ascending} setAscending={setAscending}
        rightSlot={
          <Button variant={selectMode ? "secondary" : "outline"} size="sm" onClick={() => { setSelectMode((s) => !s); setSelected({}); }}>
            <Settings2 className="h-4 w-4 mr-2" />
            {selectMode ? "Cancelar seleção" : "Selecionar"}
          </Button>
        }
      />

      {/* Conteúdo por modo */}
      <Tabs value={mode}>
        <TabsContent value="cards" className="mt-0">
          {empty ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || statusFilter !== "todos" || prazoPreset !== "todos" || clienteFilter !== "todos"
                  ? "Não achei nada por aqui 🐈‍⬛" : "Seus projetos aparecerão aqui"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "todos" || prazoPreset !== "todos" || clienteFilter !== "todos"
                  ? "Tentar outro termo, limpar filtros ou criar um novo projeto."
                  : "Crie seu primeiro projeto — prometo que é rápido."}
              </p>
              {!(searchTerm || statusFilter !== "todos" || prazoPreset !== "todos" || clienteFilter !== "todos") && (
                <Button onClick={() => { setEditing(null); setOpenModal(true); }}><Plus className="h-4 w-4 mr-2" />Criar projeto</Button>
              )}
            </div>
          ) : (
            <>
              {selectMode && (
                <BulkBar
                  count={selectedIds.length}
                  onClose={() => { setSelectMode(false); setSelected({}); }}
                  onStatus={(s) => bulkChangeStatus(s)}
                  onPrazo={(d) => bulkSetPrazo(d)}
                />
              )}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    selectMode={selectMode}
                    selected={!!selected[p.id]}
                    onToggle={() => setSelected((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                    onEdit={() => { setEditing(p); setOpenModal(true); }}
                    onDelete={() => onDelete(p.id)}
                    formatBRLFromCents={formatBRLFromCents}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          {/* DnD: a mudança de status é feita via onDrop nativo (no “minhocão” original você já tratava no contexto) */}
          <BoardView projects={filtered} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <CalendarView projects={filtered} onCreateAtDate={() => { setEditing(null); setOpenModal(true); }} />
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <ProjetoModal
        open={openModal}
        onOpenChange={setOpenModal}
        initial={mapProjetoToInitial(editing)}
        onSubmit={editing ? onUpdate : onCreate}
      />
    </div>
  );
}
