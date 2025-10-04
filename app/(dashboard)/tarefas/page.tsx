"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, LayoutGrid, Kanban as KanbanIcon, CalendarDays, Loader2 } from "lucide-react";
import { FiltersBar } from "@/components/tarefas/FiltersBar";
import { GridSkeleton } from "@/components/tarefas/skeletons";
import { TaskCard, type Tarefa } from "@/components/tarefas/TaskCard";
import { TaskSheet } from "@/components/tarefas/TaskSheet";
import { KanbanBoard } from "@/components/tarefas/Kanban";
import { MiniCalendar } from "@/components/tarefas/MiniCalendar";
import { prioridadeOrder, statusOrder } from "@/lib/tarefas";

/* ========== helpers de data (padronizadas com o MiniCalendar) ========== */
function localDateKeyFromISO(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(12, 0, 0, 0); // meio-dia local pra evitar off-by-one/DST
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function localDateKeyFromDate(dIn: Date) {
  const d = new Date(dIn);
  d.setHours(12, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildDotsByDay(list: Tarefa[]) {
  const map: Record<string, number> = {};
  for (const t of list) {
    const key = localDateKeyFromISO(t.prazo);
    if (!key) continue;
    map[key] = (map[key] ?? 0) + 1;
  }
  return map;
}
/* ===================================================================== */

type Raw = any;
type Mode = "cards" | "board" | "calendar";

export default function TarefasPage() {
  // data
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [filtered, setFiltered] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ui
  const [mode, setMode] = useState<Mode>("cards");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // sheet
  const [openSheet, setOpenSheet] = useState(false);
  const [active, setActive] = useState<Tarefa | null>(null);
  const openTask = (t: Tarefa) => { setActive(t); setOpenSheet(true); };

  // filtros
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [prioridade, setPrioridade] = useState("todos");
  const [responsavel, setResponsavel] = useState("todos");
  const [sortBy, setSortBy] = useState("prazo");

  // responsáveis (chip)
  const [responsaveis, setResponsaveis] = useState<Array<{ id: string; nome: string }>>([]);

  // carregar
  const reload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tarefas")
        .select(`
          id, titulo, descricao, status, prioridade, prazo, criado_em, atualizado_em,
          projeto:projeto_id ( nome, cliente:cliente_id (nome) ),
          responsavel:responsavel_id (id, nome)
        `)
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const rows: Tarefa[] = (data ?? []).map((r: Raw) => ({
        id: String(r.id ?? ""),
        titulo: String(r.titulo ?? ""),
        descricao: r.descricao ?? null,
        status: String(r.status ?? ""),
        prioridade: String(r.prioridade ?? ""),
        prazo: r.prazo ?? null,
        criado_em: String(r.criado_em ?? ""),
        atualizado_em: String(r.atualizado_em ?? ""),
        projeto: r.projeto
          ? { nome: String(r.projeto.nome ?? ""), cliente: { nome: String(r.projeto?.cliente?.nome ?? "") } }
          : null,
        responsavel: { id: String(r.responsavel?.id ?? ""), nome: String(r.responsavel?.nome ?? "") },
      }));

      setTarefas(rows);

      const uniq = new Map<string, { id: string; nome: string }>();
      rows.forEach(t => { if (t.responsavel.id && !uniq.has(t.responsavel.id)) uniq.set(t.responsavel.id, t.responsavel); });
      setResponsaveis(Array.from(uniq.values()));
      setError(null);
    } catch (e) {
      setError("Ops! Deu ruim carregando suas tarefas. Tenta de novo em alguns segundos 😬");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  // filtra + ordena (client-side, igual projetos)
  useEffect(() => {
    let res = [...tarefas];
    const q = search.trim().toLowerCase();

    if (q) {
      res = res.filter((t) =>
        t.titulo.toLowerCase().includes(q) ||
        (t.descricao ? t.descricao.toLowerCase().includes(q) : false) ||
        (t.projeto ? t.projeto.nome.toLowerCase().includes(q) : false) ||
        t.responsavel.nome.toLowerCase().includes(q)
      );
    }
    if (status !== "todos") res = res.filter((t) => t.status === status);
    if (prioridade !== "todos") res = res.filter((t) => t.prioridade === prioridade);
    if (responsavel !== "todos") res = res.filter((t) => t.responsavel.id === responsavel);

    res.sort((a, b) => {
      switch (sortBy) {
        case "prazo": {
          const at = a.prazo ? +new Date(a.prazo) : Infinity;
          const bt = b.prazo ? +new Date(b.prazo) : Infinity;
          return at - bt;
        }
        case "prioridade": return (prioridadeOrder[b.prioridade] ?? 0) - (prioridadeOrder[a.prioridade] ?? 0);
        case "titulo": return a.titulo.localeCompare(b.titulo);
        case "status": return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
        case "criado_em": default: return +new Date(b.criado_em) - +new Date(a.criado_em);
      }
    });

    setFiltered(res);
  }, [tarefas, search, status, prioridade, responsavel, sortBy]);

  // estatísticas simples (para badge/título)
  const stats = useMemo(() => ({
    total: tarefas.length,
  }), [tarefas]);

  // kanban groups (das filtradas)
  const kanbanGroups = useMemo(() => {
    const g: Record<string, Tarefa[]> = { PENDENTE: [], EM_ANDAMENTO: [], CONCLUIDA: [], CANCELADA: [] };
    filtered.forEach((t) => (g[t.status] ?? (g[t.status] = [])).push(t));
    return g;
  }, [filtered]);

  // dots do calendário (todas as tarefas)
  const dotsByDay = useMemo(() => buildDotsByDay(tarefas), [tarefas]);

  // loading / erro no mesmo padrão dos projetos
  if (loading) {
    return (
      <div className="flex flex-col gap-3 items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Arrumando a mesa…</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mt-6">
          {Array.from({ length: 6 }).map((_, i) => <GridSkeleton key={i} />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <p className="text-lg font-medium mb-2">Deu ruim por aqui.</p>
          <p className="text-muted-foreground mb-6">Que tal recarregar? (se persistir, me chama).</p>
          <Button onClick={reload}>Recarregar</Button>
        </div>
      </div>
    );
  }

  const empty = filtered.length === 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header (mesma diagramação dos projetos) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Tarefas ✦</h1>
          <Badge variant="secondary" className="h-6">{stats.total} tarefas</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="cards"><LayoutGrid className="mr-2 h-4 w-4" /> Cards</TabsTrigger>
              <TabsTrigger value="board"><KanbanIcon className="mr-2 h-4 w-4" /> Board</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="mr-2 h-4 w-4" /> Calendário</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => {/* abrir criador de tarefa */}} title="Criar tarefa — bora tirar do papel?">
            <Plus className="h-4 w-4 mr-2" /> Nova
          </Button>
        </div>
      </div>

      {/* Filtros (equivalente ao FilterChips) */}
      <FiltersBar
        search={search} setSearch={setSearch}
        status={status} setStatus={setStatus}
        prioridade={prioridade} setPrioridade={setPrioridade}
        responsavel={responsavel} setResponsavel={setResponsavel}
        sortBy={sortBy} setSortBy={setSortBy}
        responsaveis={responsaveis}
      />

      {/* Conteúdo por modo */}
      <Tabs value={mode}>
        {/* Cards */}
        <TabsContent value="cards" className="mt-0">
          {empty ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-semibold mb-2">
                {search || status !== "todos" || prioridade !== "todos" || responsavel !== "todos"
                  ? "Não achei nada por aqui 🐈‍⬛" : "Suas tarefas aparecerão aqui"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search || status !== "todos" || prioridade !== "todos" || responsavel !== "todos"
                  ? "Tente outro termo, limpe os filtros ou crie uma nova tarefa."
                  : "Crie sua primeira tarefa — rapidinho!"}
              </p>
              {!(search || status !== "todos" || prioridade !== "todos" || responsavel !== "todos") && (
                <Button onClick={() => {/* abrir criador de tarefa */}}>
                  <Plus className="h-4 w-4 mr-2" /> Criar tarefa
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <TaskCard key={t.id} tarefa={t} onOpen={openTask} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Board (Kanban) */}
        <TabsContent value="board" className="mt-0">
          <KanbanBoard
            groups={kanbanGroups}
            onOpen={openTask}
            onMove={async (taskId, from, to) => {
              if (from === to) return;
              // otimista
              setTarefas((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: to } : t)));
              try {
                const { error } = await supabase
                  .from("tarefas")
                  .update({ status: to, atualizado_em: new Date().toISOString() })
                  .eq("id", taskId);
                if (error) throw error;
              } catch {
                // rollback
                setTarefas((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: from } : t)));
              }
            }}
          />
        </TabsContent>

        {/* Calendário */}
        <TabsContent value="calendar" className="mt-0">
          <MiniCalendar
            date={calendarDate}
            onChange={setCalendarDate}
            dotsByDay={dotsByDay}
            dateKey={localDateKeyFromDate}
            rightSlot={(() => {
              const key = localDateKeyFromDate(calendarDate);
              const items = filtered.filter((t) => localDateKeyFromISO(t.prazo) === key);
              return items.length ? (
                items.map((t) => (
                  <button key={t.id} onClick={() => openTask(t)} className="block text-left hover:underline">
                    {t.titulo}
                  </button>
                ))
              ) : (
                <div className="text-muted-foreground">Dia livre 😎</div>
              );
            })()}
          />
        </TabsContent>
      </Tabs>

      {/* Painel lateral */}
      <TaskSheet open={openSheet} onOpenChange={setOpenSheet} tarefa={active} />
    </div>
  );
}
