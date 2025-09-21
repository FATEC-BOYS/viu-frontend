"use client";
import { supabase } from "@/lib/supabaseClient";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Search, Calendar, DollarSign, Users } from "lucide-react";
import ProjetoModal from "@/components/projetos/ProjetoModal";
import {
  type Projeto,
  type ProjetoInput,
  listProjetos,
  createProjeto,
  updateProjeto,
  deleteProjeto,
  formatBRLFromCents,
} from "@/lib/projects";
import { toast } from "sonner";

/** Shape mínimo que o ProjetoModal espera em `initial` */
type ProjetoInitial = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  orcamento: number;          // centavos
  prazo?: string | null;      // ISO | null
  cliente_id?: string | null; // opcional no resultado da API
};

export default function ProjetosPage() {
  const [rows, setRows] = useState<Projeto[]>([]);
  const [filtered, setFiltered] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO">("todos");
  const [orderBy, setOrderBy] = useState<"criado_em" | "prazo" | "nome">("criado_em");
  const [ascending, setAscending] = useState(false);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const { rows } = await listProjetos({
        search: searchTerm,
        status: statusFilter,
        orderBy,
        ascending,
        limit: 100,
        offset: 0,
      });
      setRows(rows);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let f = rows;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          (p.descricao ?? "").toLowerCase().includes(q) ||
          p.designer?.nome.toLowerCase().includes(q) ||
          p.cliente?.nome.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "todos") f = f.filter((p) => p.status === statusFilter);

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
  }, [rows, searchTerm, statusFilter, orderBy, ascending]);

  const estatisticas = useMemo(() => {
    return {
      total: rows.length,
      emAndamento: rows.filter((p) => p.status === "EM_ANDAMENTO").length,
      concluidos: rows.filter((p) => p.status === "CONCLUIDO").length,
      pausados: rows.filter((p) => p.status === "PAUSADO").length,
    };
  }, [rows]);

  // CREATE — otimista pós-retorno
  const onCreate = async (values: ProjetoInput) => {
    setBusy(true);
    try {
      const novo = await createProjeto(values);
      setRows((prev: Projeto[]) => [novo, ...prev]);
      toast.success("Projeto criado com sucesso!");
      setOpenModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar projeto");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  // UPDATE — substitui item na lista (pós-retorno)
  const onUpdate = async (values: ProjetoInput) => {
    if (!editing) return;
    setBusy(true);
    try {
      const atualizado = await updateProjeto(editing.id, values);
      setRows((prev: Projeto[]) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)));
      setEditing(null);
      toast.success("Projeto atualizado!");
      setOpenModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar projeto");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  // DELETE — otimista com rollback
const onDelete = async (id: string) => {
  if (!confirm("Excluir este projeto?")) return;
  setBusy(true);

  try {
    // pré-check de dependências
    const [{ count: artesCount, error: aErr }, { count: tarefasCount, error: tErr }] = await Promise.all([
      supabase.from("artes").select("id", { count: "exact", head: true }).eq("projeto_id", id),
      supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("projeto_id", id),
    ]);
    if (aErr || tErr) throw aErr || tErr;

    if ((artesCount ?? 0) > 0 || (tarefasCount ?? 0) > 0) {
      toast.error("Não é possível excluir: existem artes e/ou tarefas vinculadas.");
      return;
    }

    // optimistic (agora seguro)
    const backup = rows;
    setRows((prev) => prev.filter((p) => p.id !== id));
    await deleteProjeto(id);
    toast.success("Projeto excluído!");
  } catch (e: any) {
    toast.error(e?.message ?? "Erro ao excluir");
  } finally {
    setBusy(false);
  }
};


  function mapProjetoToInitial(p: Projeto | null): ProjetoInitial | null {
    if (!p) return null;
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      status: p.status,
      orcamento: p.orcamento ?? 0,
      prazo: p.prazo ?? null,
      cliente_id: p.cliente?.id ?? null,
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando projetos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">Gerencie todos os seus projetos em um só lugar</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpenModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Projetos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.emAndamento}</div>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</div>
            <p className="text-sm text-muted-foreground">Finalizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.pausados}</div>
            <p className="text-sm text-muted-foreground">Pausados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v: "todos" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO") => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
            <SelectItem value="CONCLUIDO">Finalizado</SelectItem>
            <SelectItem value="PAUSADO">Pausado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={orderBy} onValueChange={(v: "criado_em" | "prazo" | "nome") => setOrderBy(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="criado_em">Data de Criação</SelectItem>
            <SelectItem value="prazo">Data de Entrega</SelectItem>
            <SelectItem value="nome">Nome do Projeto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(ascending)} onValueChange={(v: "true" | "false") => setAscending(v === "true")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Direção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Mais Recente</SelectItem>
            <SelectItem value="true">Mais Antigo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      <Link href={`/projetos/${p.id}`} className="hover:underline">
                        {p.nome}
                      </Link>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {p.designer?.nome} • {p.cliente?.nome}
                    </p>
                  </div>
                  <span className="text-xs rounded-full px-2 py-1 bg-gray-100">
                    {p.status === "EM_ANDAMENTO" ? "Em Andamento" : p.status === "CONCLUIDO" ? "Finalizado" : "Pausado"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3 w-3" /> Valor
                    </div>
                    <p className="font-medium">{formatBRLFromCents(p.orcamento ?? 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Entrega
                    </div>
                    <p className="font-medium">
                      {p.prazo ? new Date(p.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projetos/${p.id}`}>Detalhes</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(p);
                      setOpenModal(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" disabled={busy} onClick={() => onDelete(p.id)}>
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || statusFilter !== "todos" ? "Nenhum projeto encontrado" : "Seus projetos aparecerão aqui"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "todos"
                ? "Tente usar filtros diferentes ou criar um novo projeto."
                : "Que tal começar criando seu primeiro projeto?"}
            </p>
            {!searchTerm && statusFilter === "todos" && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setOpenModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Meu Primeiro Projeto
              </Button>
            )}
          </div>
        </Card>
      )}

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
