// app/(dashboard)/projetos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, DollarSign, Users, Palette, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ProjetoModal from "@/components/projetos/ProjetoModal";
import {
  type Projeto,
  type ProjetoInput,
  getProjeto,
  updateProjeto,
  deleteProjeto,
  formatBRLFromCents,
} from "@/lib/projects";
import { supabase } from "@/lib/supabaseClient";

/** Tipos locais para listas associadas */
type ArteRow = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  versao: number;
  status: string;
  criado_em: string;
  autor: { id: string; nome: string } | null;
};

type TarefaRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  prazo: string | null;
  criado_em: string;
  responsavel: { id: string; nome: string } | null;
};

type AprovacaoRow = {
  id: string;
  status: string; // PENDENTE/APROVADO/REJEITADO (depende do teu fluxo)
  comentario: string | null;
  criado_em: string;
  aprovador: { id: string; nome: string } | null;
  arte: { id: string; nome: string } | null;
};

/** Initial para o modal */
type ProjetoInitial = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";
  orcamento: number;          // centavos
  prazo?: string | null;      // ISO | null
  cliente_id?: string | null;
};

const PAGE_SIZE = 10;

export default function ProjetoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Projeto
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);

  // Artes
  const [artes, setArtes] = useState<ArteRow[]>([]);
  const [artesTotal, setArtesTotal] = useState(0);
  const [artesLoading, setArtesLoading] = useState(false);
  const [artesFrom, setArtesFrom] = useState(0);

  // Tarefas
  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [tarefasTotal, setTarefasTotal] = useState(0);
  const [tarefasLoading, setTarefasLoading] = useState(false);
  const [tarefasFrom, setTarefasFrom] = useState(0);

  // Aprovações
  const [aprovacoes, setAprovacoes] = useState<AprovacaoRow[]>([]);
  const [aprovTotal, setAprovTotal] = useState(0);
  const [aprovLoading, setAprovLoading] = useState(false);
  const [aprovFrom, setAprovFrom] = useState(0);

  // Modal
  const [openModal, setOpenModal] = useState(false);

  /* ====== LOAD PROJECT ====== */
  async function loadProjeto() {
    setLoading(true);
    setError(null);
    try {
      const p = await getProjeto(id);
      setProjeto(p);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar projeto");
    } finally {
      setLoading(false);
    }
  }

  /* ====== LOAD ARTES ====== */
  async function loadArtes({ append }: { append: boolean }) {
    if (!id) return;
    setArtesLoading(true);
    try {
      const start = append ? artesFrom : 0;
      const end = start + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("artes")
        .select(
          `
            id, nome, descricao, tipo, versao, status, criado_em,
            autor:autor_id ( id, nome )
          `,
          { count: "exact" }
        )
        .eq("projeto_id", id)
        .order("criado_em", { ascending: false })
        .range(start, end);

      if (error) throw error;

      setArtes((prev) => (append ? [...prev, ...(data as any[])] : ((data as any[]) ?? [])));
      setArtesTotal(count ?? 0);
      setArtesFrom(end + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar artes");
    } finally {
      setArtesLoading(false);
    }
  }

  /* ====== LOAD TAREFAS ====== */
  async function loadTarefas({ append }: { append: boolean }) {
    if (!id) return;
    setTarefasLoading(true);
    try {
      const start = append ? tarefasFrom : 0;
      const end = start + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("tarefas")
        .select(
          `
            id, titulo, descricao, status, prioridade, prazo, criado_em,
            responsavel:responsavel_id ( id, nome )
          `,
          { count: "exact" }
        )
        .eq("projeto_id", id)
        .order("criado_em", { ascending: false })
        .range(start, end);

      if (error) throw error;

      setTarefas((prev) => (append ? [...prev, ...(data as any[])] : ((data as any[]) ?? [])));
      setTarefasTotal(count ?? 0);
      setTarefasFrom(end + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar tarefas");
    } finally {
      setTarefasLoading(false);
    }
  }

  /* ====== LOAD APROVAÇÕES ====== */
  async function loadAprovacoes({ append }: { append: boolean }) {
    if (!id) return;
    setAprovLoading(true);
    try {
      const start = append ? aprovFrom : 0;
      const end = start + PAGE_SIZE - 1;

      // Filtrando aprovações por projeto via relação com artes (arte.projeto_id = id)
      const { data, error, count } = await supabase
        .from("aprovacoes")
        .select(
          `
            id, status, comentario, criado_em,
            aprovador:aprovador_id ( id, nome ),
            arte:arte_id ( id, nome, projeto_id )
          `,
          { count: "exact" }
        )
        .eq("arte.projeto_id", id) // filtro pela relação
        .order("criado_em", { ascending: false })
        .range(start, end);

      if (error) throw error;

      // mapeia para remover projeto_id do nested arte (não precisamos dele na UI)
      const rows = (data ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        comentario: r.comentario,
        criado_em: r.criado_em,
        aprovador: r.aprovador ? { id: r.aprovador.id, nome: r.aprovador.nome } : null,
        arte: r.arte ? { id: r.arte.id, nome: r.arte.nome } : null,
      })) as AprovacaoRow[];

      setAprovacoes((prev) => (append ? [...prev, ...rows] : rows));
      setAprovTotal(count ?? 0);
      setAprovFrom(end + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao carregar aprovações");
    } finally {
      setAprovLoading(false);
    }
  }

  useEffect(() => {
    void loadProjeto();
    // também carrega as listas iniciais
    void loadArtes({ append: false });
    void loadTarefas({ append: false });
    void loadAprovacoes({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const initialForModal: ProjetoInitial | null = useMemo(() => {
    if (!projeto) return null;
    return {
      id: projeto.id,
      nome: projeto.nome,
      descricao: projeto.descricao ?? null,
      status: projeto.status,
      orcamento: projeto.orcamento ?? 0, // centavos → modal converte pra R$
      prazo: projeto.prazo ?? null,
      cliente_id: projeto.cliente?.id ?? null,
    };
  }, [projeto]);

  const onUpdate = async (values: ProjetoInput) => {
    if (!projeto) return;
    try {
      const atualizado = await updateProjeto(projeto.id, values);
      setProjeto(atualizado);
      toast.success("Projeto atualizado!");
      setOpenModal(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar");
      throw e;
    }
  };

const onDelete = async () => {
  if (!projeto) return;
  if (!confirm("Excluir este projeto?")) return;

  try {
    // pré-check de dependências
    const [{ count: artesCount, error: aErr }, { count: tarefasCount, error: tErr }] = await Promise.all([
      supabase.from("artes").select("id", { count: "exact", head: true }).eq("projeto_id", projeto.id),
      supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("projeto_id", projeto.id),
    ]);
    if (aErr || tErr) throw aErr || tErr;

    if ((artesCount ?? 0) > 0 || (tarefasCount ?? 0) > 0) {
      toast.error("Não é possível excluir: existem artes e/ou tarefas vinculadas.");
      return;
    }

    await deleteProjeto(projeto.id);
    toast.success("Projeto excluído!");
    router.push("/projetos");
  } catch (e: any) {
    // se o FK do banco bloquear, mostra msg amigável
    const msg = String(e?.message ?? e);
    if (msg.includes("foreign key") || msg.includes("violates")) {
      toast.error("Exclusão bloqueada por dependências (FK). Remova artes/tarefas primeiro.");
    } else {
      toast.error(e?.message ?? "Erro ao excluir");
    }
  }
};


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando projeto...</p>
      </div>
    );
  }

  if (error || !projeto) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <p className="text-destructive">{error ?? "Projeto não encontrado"}</p>
        <Button variant="outline" asChild>
          <Link href="/projetos">Voltar para Projetos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header: título à esquerda; Voltar/Editar/Excluir à direita */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{projeto.nome}</h1>
          {projeto.descricao && (
            <p className="text-muted-foreground max-w-2xl mt-1">{projeto.descricao}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projetos" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setOpenModal(true)}>
            Editar
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <div className="text-base font-medium">
              {projeto.status === "EM_ANDAMENTO"
                ? "Em Andamento"
                : projeto.status === "CONCLUIDO"
                ? "Finalizado"
                : "Pausado"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Orçamento
            </div>
            <div className="text-base font-medium">{formatBRLFromCents(projeto.orcamento ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Prazo
            </div>
            <div className="text-base font-medium">
              {projeto.prazo ? new Date(projeto.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Palette className="h-3 w-3" /> Artes
            </div>
            <div className="text-base font-medium">{artesTotal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pessoas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Designer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm">{projeto.designer?.nome}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm">{projeto.cliente?.nome}</div>
          </CardContent>
        </Card>
      </div>

      {/* Artes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Artes ({artesTotal})
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artes.map((a) => (
            <Card key={a.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{a.nome}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm space-y-1">
                {a.descricao && <p className="text-muted-foreground line-clamp-2">{a.descricao}</p>}
                <p><span className="text-muted-foreground">Tipo:</span> {a.tipo} • v{a.versao}</p>
                <p><span className="text-muted-foreground">Status:</span> {a.status}</p>
                <p><span className="text-muted-foreground">Autor:</span> {a.autor?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Criado:</span> {new Date(a.criado_em).toLocaleDateString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {artesFrom < artesTotal && (
          <div className="flex justify-center">
            <Button variant="outline" disabled={artesLoading} onClick={() => loadArtes({ append: true })}>
              {artesLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Carregar mais artes
            </Button>
          </div>
        )}
        {artesTotal === 0 && <p className="text-sm text-muted-foreground">Nenhuma arte cadastrada.</p>}
      </section>

      {/* Tarefas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tarefas ({tarefasTotal})
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tarefas.map((t) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm space-y-1">
                {t.descricao && <p className="text-muted-foreground line-clamp-2">{t.descricao}</p>}
                <p><span className="text-muted-foreground">Status:</span> {t.status}</p>
                <p><span className="text-muted-foreground">Prioridade:</span> {t.prioridade}</p>
                <p><span className="text-muted-foreground">Responsável:</span> {t.responsavel?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Entrega:</span> {t.prazo ? new Date(t.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {tarefasFrom < tarefasTotal && (
          <div className="flex justify-center">
            <Button variant="outline" disabled={tarefasLoading} onClick={() => loadTarefas({ append: true })}>
              {tarefasLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Carregar mais tarefas
            </Button>
          </div>
        )}
        {tarefasTotal === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>}
      </section>

      {/* Aprovações */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Aprovações ({aprovTotal})
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aprovacoes.map((ap) => (
            <Card key={ap.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">#{ap.id.slice(0, 6)} • {ap.status}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm space-y-1">
                {ap.comentario && <p className="text-muted-foreground line-clamp-2">{ap.comentario}</p>}
                <p><span className="text-muted-foreground">Arte:</span> {ap.arte?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Aprovador:</span> {ap.aprovador?.nome ?? "—"}</p>
                <p><span className="text-muted-foreground">Criado:</span> {new Date(ap.criado_em).toLocaleDateString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {aprovFrom < aprovTotal && (
          <div className="flex justify-center">
            <Button variant="outline" disabled={aprovLoading} onClick={() => loadAprovacoes({ append: true })}>
              {aprovLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Carregar mais aprovações
            </Button>
          </div>
        )}
        {aprovTotal === 0 && <p className="text-sm text-muted-foreground">Nenhuma aprovação registrada.</p>}
      </section>

      {/* Modal de edição */}
      <ProjetoModal
        open={openModal}
        onOpenChange={setOpenModal}
        initial={initialForModal}
        onSubmit={onUpdate}
      />
    </div>
  );
}
