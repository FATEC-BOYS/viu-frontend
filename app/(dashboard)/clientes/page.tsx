"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Loader2, Settings2, Phone, Mail, Calendar, CheckCircle2, ChevronRight, Trash2, Undo2,
} from "lucide-react";

import ClienteWizard from "@/components/clientes/ClienteWizard";

/* ============================== Tipos ============================== */
type ArteStatus = "EM_ANALISE" | "APROVADO" | "REJEITADO" | "PENDENTE" | "RASCUNHO";
type ProjetoStatus = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";

type Arte = { id: string; status: ArteStatus };
type Projeto = {
  id: string; nome: string; descricao?: string | null;
  status: ProjetoStatus;
  orcamento: number | null;
  prazo?: string | null;
  artes: Arte[];
};
type Cliente = {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  avatar: string | null;
  tipo: "DESIGNER" | "CLIENTE";
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  projetos: Projeto[];
};

/* ============================== Helpers ============================== */
const LOADER_LINES = ["Afiando os lápis…","Abrindo pastas…","Buscando inspirações…","Alinhando pixels…"] as const;
type Mode = "cards" | "board" | "calendar";
type StatusFiltro = "todos" | "ativo" | "inativo";
const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const formatBRLFromCents = (v?: number | null) =>
  typeof v === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100)
    : "—";

/* ============================== Bulk Bar ============================== */
function BulkBarClientes({
  count, onClose, onAtivar, onDesativar,
}: { count: number; onClose: () => void; onAtivar: () => void; onDesativar: () => void; }) {
  if (count === 0) return null;
  return (
    <div className="sticky top-0 z-10 mb-4 rounded-md border bg-card p-2 shadow-sm flex items-center justify-between">
      <span className="text-sm">Selecionados: <b>{count}</b></span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onAtivar}>Ativar</Button>
        <Button size="sm" variant="outline" onClick={onDesativar}><Undo2 className="h-4 w-4 mr-1" /> Desativar</Button>
        <Button size="sm" variant="ghost" onClick={onClose}><Settings2 className="h-4 w-4 mr-1" /> Fechar</Button>
      </div>
    </div>
  );
}

/* ============================== Card ============================== */
function ClienteCard({
  c, selectMode, selected, onToggle, onEdit, onDelete,
}: {
  c: Cliente; selectMode: boolean; selected: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const totalProjetos = c.projetos.length;
  const concluidos = c.projetos.filter((p) => p.status === "CONCLUIDO").length;
  const ativos = c.projetos.filter((p) => p.status === "EM_ANDAMENTO").length;
  const totalArtes = c.projetos.reduce((acc, p) => acc + (p.artes?.length || 0), 0);
  const aprovadas = c.projetos.reduce((acc, p) => acc + (p.artes?.filter(a => a.status === "APROVADO").length || 0), 0);
  const orcamentoTotal = c.projetos.reduce((acc, p) => acc + (p.orcamento || 0), 0);
  const proxPrazo = c.projetos
    .filter((p) => p.prazo && p.status === "EM_ANDAMENTO")
    .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())[0];

  return (
    <div className={`border rounded-lg p-3 transition ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt={c.nome} className="w-10 h-10 object-cover" />
              ) : (
                <span className="text-primary font-semibold">
                  {c.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{c.nome}</h4>
                <Badge variant={c.ativo ? "default" : "secondary"} className="shrink-0">
                  {c.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                {c.telefone && <span className="hidden sm:flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
              </div>
            </div>
          </div>
        </div>
        {selectMode ? (
          <input type="checkbox" className="mt-1" checked={selected} onChange={onToggle} />
        ) : (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div><div className="text-lg font-bold">{totalProjetos}</div><p className="text-[11px] text-muted-foreground">Projetos</p></div>
        <div><div className="text-lg font-bold">{concluidos}</div><p className="text-[11px] text-muted-foreground">Concluídos</p></div>
        <div><div className="text-lg font-bold">{ativos}</div><p className="text-[11px] text-muted-foreground">Ativos</p></div>
      </div>

      {totalArtes > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Artes aprovadas</span>
            <span className="font-medium">{aprovadas}/{totalArtes}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-1">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(aprovadas / totalArtes) * 100 || 0}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" />Próximo prazo</span>
          <span className="font-medium">{formatDate(proxPrazo?.prazo || null)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">Orçamento</span>
          <span className="font-semibold">{formatBRLFromCents(orcamentoTotal)}</span>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/clientes/${c.id}`}>Abrir <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
        </Button>
      </div>
    </div>
  );
}

/* ============================== Página ============================== */
export default function ClientesPage() {
  // data
  const [rows, setRows] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaderLine, setLoaderLine] = useState<(typeof LOADER_LINES)[number]>(LOADER_LINES[0]);
  const [error, setError] = useState<string | null>(null);

  // ui
  const [mode, setMode] = useState<Mode>("cards");
  const [openClienteWizard, setOpenClienteWizard] = useState(false);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFiltro>("todos");
  const [prazoPreset, setPrazoPreset] = useState<"todos" | "7" | "30" | "90">("todos");
  const [orderBy, setOrderBy] = useState<"criado_em" | "nome">("criado_em");
  const [ascending, setAscending] = useState(false);

  // seleção em massa
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  // loader frases
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setLoaderLine((prev) => LOADER_LINES[(LOADER_LINES.indexOf(prev as any) + 1) % LOADER_LINES.length]);
    }, 1600);
    return () => clearInterval(id);
  }, [loading]);

  // fetch
  const reload = async () => {
    setLoading(true);
    try {
      const SELECT = `
        id, email, nome, telefone, avatar, tipo, ativo, criado_em, atualizado_em,
        projetos:projetos!cliente_id (
          id, nome, status, orcamento, prazo,
          artes (id, status)
        )
      `;
      const { data, error } = await supabase
        .from("usuarios")
        .select(SELECT)
        .eq("tipo", "CLIENTE")
        .order("nome", { ascending: true });

      if (error) throw error;
      setRows((data as any) || []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar clientes");
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
      f = f.filter((c) =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.telefone ?? "").toLowerCase().includes(q) ||
        c.projetos.some((p) => p.nome.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "todos") {
      f = f.filter((c) => (statusFilter === "ativo" ? c.ativo : !c.ativo));
    }

    if (prazoPreset !== "todos") {
      const days = Number(prazoPreset);
      const until = new Date().getTime() + days * 24 * 60 * 60 * 1000;
      f = f.filter((c) =>
        c.projetos.some((p) => (p.prazo ? new Date(p.prazo).getTime() <= until : false))
      );
    }

    const sorted = [...f].sort((a, b) => {
      if (orderBy === "nome") return a.nome.localeCompare(b.nome) * (ascending ? 1 : -1);
      const at = new Date(a.criado_em).getTime();
      const bt = new Date(b.criado_em).getTime();
      return (bt - at) * (ascending ? -1 : 1);
    });

    setFiltered(sorted);
  }, [rows, searchTerm, statusFilter, prazoPreset, orderBy, ascending]);

  const estatisticas = useMemo(() => ({
    total: rows.length,
    ativos: rows.filter((c) => c.ativo).length,
    inativos: rows.filter((c) => !c.ativo).length,
  }), [rows]);

  // seleção em massa
  const toggleSelectMode = () => { setSelectMode((s) => !s); setSelected({}); };
  const toggleSelect = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const bulkAtivar = async () => {
    if (!selectedIds.length) return;
    try {
      setRows((prev) => prev.map((c) => selectedIds.includes(c.id) ? { ...c, ativo: true } : c));
      const { error } = await supabase.from("usuarios").update({ ativo: true }).in("id", selectedIds);
      if (error) throw error;
      toast.success("Clientes ativados.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao ativar"); await reload();
    } finally { setSelected({}); setSelectMode(false); }
  };
  const bulkDesativar = async () => {
    if (!selectedIds.length) return;
    try {
      setRows((prev) => prev.map((c) => selectedIds.includes(c.id) ? { ...c, ativo: false } : c));
      const { error } = await supabase.from("usuarios").update({ ativo: false }).in("id", selectedIds);
      if (error) throw error;
      toast.success("Clientes desativados.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao desativar"); await reload();
    } finally { setSelected({}); setSelectMode(false); }
  };

  // calendar items
  const calendarItems = useMemo(() => {
    const items: { when: number; label: string; cliente: Cliente; projeto: Projeto }[] = [];
    filtered.forEach((c) => {
      c.projetos.forEach((p) => {
        if (p.prazo) items.push({ when: new Date(p.prazo).getTime(), label: p.nome, cliente: c, projeto: p });
      });
    });
    return items.sort((a, b) => a.when - b.when);
  }, [filtered]);

  // loading / error
  if (loading) {
    return (
      <div className="flex flex-col gap-3 items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-sm text-muted-foreground">{loaderLine}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-md border bg-muted/30" />
          ))}
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
          <h1 className="text-3xl font-bold tracking-tight">Clientes ✦</h1>
          <Badge variant="secondary" className="h-6">{estatisticas.total} clientes</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setOpenClienteWizard(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Input
            placeholder="Buscar por nome, email, telefone ou projeto…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(v: StatusFiltro) => setStatusFilter(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={prazoPreset} onValueChange={(v: any) => setPrazoPreset(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prazo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os prazos</SelectItem>
            <SelectItem value="7">Até 7 dias</SelectItem>
            <SelectItem value="30">Até 30 dias</SelectItem>
            <SelectItem value="90">Até 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orderBy} onValueChange={(v: any) => setOrderBy(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Mais recente</SelectItem>
            <SelectItem value="nome">Nome</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => setAscending((s) => !s)}>
          {ascending ? "Asc ↑" : "Desc ↓"}
        </Button>

        <Button variant={selectMode ? "secondary" : "outline"} size="sm" onClick={() => { setSelectMode((s) => !s); setSelected({}); }}>
          <Settings2 className="h-4 w-4 mr-2" />
          {selectMode ? "Cancelar seleção" : "Selecionar"}
        </Button>
      </div>

      {/* Conteúdo por modo */}
      <Tabs value={mode}>
        <TabsContent value="cards" className="mt-0">
          {empty ? (
            <div className="p-10 text-center">
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || statusFilter !== "todos" || prazoPreset !== "todos"
                  ? "Não achei nada por aqui 🐈‍⬛" : "Seus clientes aparecerão aqui"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "todos" || prazoPreset !== "todos"
                  ? "Tente outro termo ou limpe filtros."
                  : "Crie seu primeiro cliente — prometo que é rápido."}
              </p>
              {!(searchTerm || statusFilter !== "todos" || prazoPreset !== "todos") && (
                <Button onClick={() => setOpenClienteWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />Criar cliente
                </Button>
              )}
            </div>
          ) : (
            <>
              <BulkBarClientes
                count={selectedIds.length}
                onClose={() => { setSelectMode(false); setSelected({}); }}
                onAtivar={bulkAtivar}
                onDesativar={bulkDesativar}
              />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((c) => (
                  <ClienteCard
                    key={c.id}
                    c={c}
                    selectMode={selectMode}
                    selected={!!selected[c.id]}
                    onToggle={() => setSelected((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                    onEdit={() => toast.message("Editar cliente", { description: "Abra o modal/rota de edição." })}
                    onDelete={() => toast.message("Excluir cliente", { description: "Implemente conforme sua regra." })}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border p-3">
              <h4 className="text-sm font-semibold mb-2">Ativos</h4>
              <div className="space-y-3">
                {filtered.filter(c => c.ativo).map(c => (
                  <div key={c.id} className="border rounded-md p-2 flex items-center justify-between">
                    <span className="truncate">{c.nome}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        setRows(prev => prev.map(x => x.id === c.id ? { ...x, ativo: false } : x));
                        const { error } = await supabase.from("usuarios").update({ ativo: false }).eq("id", c.id);
                        if (error) { toast.error("Falhou"); await reload(); }
                      }}>Desativar</Button>
                      <Button asChild size="sm" variant="ghost"><Link href={`/clientes/${c.id}`}>Abrir</Link></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <h4 className="text-sm font-semibold mb-2">Inativos</h4>
              <div className="space-y-3">
                {filtered.filter(c => !c.ativo).map(c => (
                  <div key={c.id} className="border rounded-md p-2 flex items-center justify-between">
                    <span className="truncate">{c.nome}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        setRows(prev => prev.map(x => x.id === c.id ? { ...x, ativo: true } : x));
                        const { error } = await supabase.from("usuarios").update({ ativo: true }).eq("id", c.id);
                        if (error) { toast.error("Falhou"); await reload(); }
                      }}>Ativar</Button>
                      <Button asChild size="sm" variant="ghost"><Link href={`/clientes/${c.id}`}>Abrir</Link></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          {calendarItems.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Sem prazos para mostrar.</div>
          ) : (
            <div className="space-y-2">
              {calendarItems.map((it, i) => (
                <div key={i} className="border rounded-md p-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{it.projeto.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{it.cliente.nome} • {formatDate(new Date(it.when).toISOString())}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/projetos/${it.projeto.id}`}>Abrir</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Wizard de cliente */}
      <ClienteWizard
        open={openClienteWizard}
        onOpenChange={setOpenClienteWizard}
        onCreated={() => {
          // atualiza listagem após criação
          reload();
        }}
      />
    </div>
  );
}
