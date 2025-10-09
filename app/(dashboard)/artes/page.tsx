'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

import { listArtesOverview, type ArteOverview, type ArteStatus } from "@/lib/artes";
import { ArteQuickLookSheet } from "@/components/artes/ArteQuickLookSheet";
import { getArtePreviewUrls, getArteDownloadUrl } from "@/lib/storage";
import ArteWizard from "@/components/artes/ArteWizard";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import {
  Upload, Search, Calendar, User, FileImage, Loader2, Eye, Download,
  MessageSquare, CheckCircle2, Clock, XCircle, AlertCircle, Layers3, Filter, SlidersHorizontal
} from "lucide-react";

/* ===================== Fallback para o Suspense ===================== */
function ArtesPageFallback() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center h-[40vh] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando artes...
      </div>
    </div>
  );
}

/* ===================== Helpers URL ===================== */
function useURLHelpers() {
  const router = useRouter();
  const params = useSearchParams();

  const getParam = (key: string, fallback = "") => params.get(key) ?? fallback;

  const setParam = (key: string, value?: string) => {
    const p = new URLSearchParams(params.toString());
    if (!value || value === "todos" || value === "") p.delete(key);
    else p.set(key, value);
    p.delete("page");
    router.push(`?${p.toString()}`);
  };

  const setParams = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "todos" || v === "") p.delete(k);
      else p.set(k, v);
    });
    p.delete("page");
    router.push(`?${p.toString()}`);
  };

  return { getParam, setParam, setParams, params };
}

/* ===================== UI Auxiliares ===================== */
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    EM_ANALISE: { label: "Em Análise", variant: "outline" as const, icon: Clock },
    APROVADO:   { label: "Aprovado",   variant: "default" as const, icon: CheckCircle2 },
    REJEITADO:  { label: "Rejeitado",  variant: "destructive" as const, icon: XCircle },
    PENDENTE:   { label: "Pendente",   variant: "secondary" as const, icon: AlertCircle },
  };
  const config =
    statusConfig[status as keyof typeof statusConfig] ?? {
      label: status,
      variant: "outline" as const,
      icon: AlertCircle,
    };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function TipoPill({ tipo, onClick }: { tipo: string; onClick?: () => void }) {
  return (
    <button
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-muted/40 hover:bg-muted transition"
      onClick={onClick}
    >
      {tipo}
    </button>
  );
}

/* ===================== Card (com Overview) ===================== */
function ArteCard({
  arte,
  onFilter,
  onQuickLook,
}: {
  arte: ArteOverview;
  onFilter: (key: string, value: string) => void;
  onQuickLook: (id: string, tab?: "resumo" | "feedbacks" | "tarefas" | "aprovacoes") => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("pt-BR");
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "—";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  useEffect(() => {
    let alive = true;
    getArtePreviewUrls(arte.arquivo).then(({ previewUrl }) => {
      if (alive) setPreviewUrl(previewUrl);
    });
    return () => { alive = false; };
  }, [arte.arquivo]);

  async function handleDownload() {
    try {
      const url = await getArteDownloadUrl(arte.arquivo);
      if (url) window.open(url, "_blank");
    } catch {
      // noop
    }
  }

  return (
    <Card className="group overflow-hidden border hover:shadow-lg transition">
      {/* Thumb com overlay de status */}
      <div className="relative aspect-video bg-muted/50">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={arte.nome}
            width={1280}
            height={720}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <FileImage className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={arte.status} />
        </div>
        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition">
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" onClick={() => onQuickLook(arte.id, "resumo")}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{arte.nome}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">
              v{arte.versao} • {formatFileSize(arte.tamanho)}
            </p>
          </div>
          {arte.tem_aprovacao_aprovada && (
            <Badge className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Aprovada
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="text-muted-foreground">Projeto: </span>
            <button
              className="underline underline-offset-2 hover:opacity-80"
              onClick={() => arte.projeto_nome && onFilter("projeto", arte.projeto_nome)}
            >
              {arte.projeto_nome}
            </button>
          </div>
          <span className="text-muted-foreground">{formatDate(arte.criado_em)}</span>
        </div>

        <div className="flex items-center justify-between text-xs mt-2">
          <div className="truncate">
            <span className="text-muted-foreground">Cliente: </span>
            <button
              className="underline underline-offset-2 hover:opacity-80"
              onClick={() => arte.cliente_nome && onFilter("cliente", arte.cliente_nome)}
            >
              {arte.cliente_nome}
            </button>
          </div>
          <div className="truncate">
            <span className="text-muted-foreground">Autor: </span>
            <button
              className="underline underline-offset-2 hover:opacity-80"
              onClick={() => arte.autor_nome && onFilter("autor", arte.autor_nome)}
            >
              {arte.autor_nome}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <TipoPill tipo={arte.tipo} onClick={() => onFilter("tipo", arte.tipo)} />
          <div className="flex items-center gap-3 text-xs">
            {(arte.feedbacks_count ?? 0) > 0 && (
              <button
                className="flex items-center gap-1 text-muted-foreground hover:underline"
                onClick={() => onQuickLook(arte.id, "feedbacks")}
              >
                <MessageSquare className="h-3 w-3" />
                {arte.feedbacks_count}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===================== Página (Inner) ===================== */
function ArtesPageInner() {
  const { getParam, setParam, setParams } = useURLHelpers();
  const router = useRouter();

  // Quick Look
  const [openQL, setOpenQL] = useState(false);
  const [arteQL, setArteQL] = useState<string | null>(null);
  const [defaultTab, setDefaultTab] =
    useState<"resumo" | "feedbacks" | "tarefas" | "aprovacoes">("resumo");
  const openQuickLook = (id: string, tab?: "resumo" | "feedbacks" | "tarefas" | "aprovacoes") => {
    setArteQL(id);
    if (tab) setDefaultTab(tab);
    setOpenQL(true);
  };

  // Filtros URL
  const searchTerm   = getParam("q", "");
  const statusFilter = getParam("status", "todos");
  const tipoFilter   = getParam("tipo", "todos");
  const projetoFilter= getParam("projeto", "todos"); // nome do projeto
  const clienteFilter= getParam("cliente", "todos");
  const autorFilter  = getParam("autor", "todos");
  const sortBy       = getParam("orderBy", "criado_em") as "criado_em" | "nome" | "projeto" | "versao" | "tamanho";
  const page         = Math.max(1, Number(getParam("page", "1")) || 1);
  const pageSize     = Math.min(96, Math.max(6, Number(getParam("pageSize", "24")) || 24));

  // Dados lista
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ArteOverview[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    listArtesOverview({
      q: searchTerm,
      status: statusFilter as ArteStatus | "todos",
      tipo: tipoFilter,
      projeto: projetoFilter,
      cliente: clienteFilter,
      autor: autorFilter,
      orderBy: sortBy,
      page,
      pageSize,
    })
      .then(({ data, count }) => {
        setRows(data);
        setCount(count);
      })
      .catch(() => setError("Não foi possível carregar as artes."))
      .finally(() => setLoading(false));
  }, [searchTerm, statusFilter, tipoFilter, projetoFilter, clienteFilter, autorFilter, sortBy, page, pageSize]);

  // Facetas dinâmicas (baseadas no resultado atual)
  const projetos = useMemo(
    () => Array.from(new Set(rows.map(a => a.projeto_nome).filter((p): p is string => !!p))).map((nome, i) => ({ id: String(i), nome })),
    [rows]
  );
  const tipos    = useMemo(() => Array.from(new Set(rows.map(a => a.tipo))), [rows]);
  const clientes = useMemo(
    () => Array.from(new Set(rows.map(a => a.cliente_nome).filter((c): c is string => !!c))),
    [rows]
  );
  const autores  = useMemo(
    () => Array.from(new Set(rows.map(a => a.autor_nome).filter((a): a is string => !!a))),
    [rows]
  );

  const estatisticas = useMemo(() => ({
    total: rows.length,
    emAnalise: rows.filter(a => a.status === "EM_ANALISE").length,
    aprovadas: rows.filter(a => a.status === "APROVADO").length,
    rejeitadas: rows.filter(a => a.status === "REJEITADO").length,
    pendentes: rows.filter(a => a.status === "PENDENTE").length,
  }), [rows]);

  // ========= Wizard =========
  const [openWizard, setOpenWizard] = useState(false);
  const [wizardProjectId, setWizardProjectId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectsForChooser, setProjectsForChooser] = useState<{ id: string; nome: string }[]>([]);
  const [choosingProject, setChoosingProject] = useState(false);

  async function handleOpenNewArte() {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;
    setCurrentUserId(uid);

    let resolvedProjectId: string | null = null;
    if (projetoFilter && projetoFilter !== "todos") {
      const { data: p } = await supabase.from("projetos").select("id").ilike("nome", projetoFilter).limit(1).maybeSingle();
      if (p?.id) resolvedProjectId = p.id;
    }

    if (!resolvedProjectId) {
      setChoosingProject(true);
      const { data: list } = await supabase.from("projetos").select("id, nome").order("criado_em", { ascending: false });
      setProjectsForChooser(list || []);
    } else {
      setWizardProjectId(resolvedProjectId);
    }

    setOpenWizard(true);
  }

  function chooseProjectAndContinue(id: string) {
    setWizardProjectId(id);
    setChoosingProject(false);
  }

  /* ===================== Loading / Error ===================== */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Carregando artes...</p>
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

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  /* ===================== UI — “tcholinha” ===================== */
  return (
    <div className="space-y-6 p-6">
      {/* Header compacto */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Artes ✦</h1>
          <Badge variant="secondary" className="h-6">{count} itens</Badge>
          <div className="hidden md:flex items-center gap-1 text-xs">
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {estatisticas.emAnalise}</Badge>
            <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> {estatisticas.aprovadas}</Badge>
            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {estatisticas.rejeitadas}</Badge>
            <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> {estatisticas.pendentes}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenNewArte}>
            <Upload className="h-4 w-4 mr-2" />
            Nova Arte
          </Button>
        </div>
      </div>

      {/* Filtros “chips” + controles */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por arte, projeto, cliente ou autor…"
              defaultValue={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = setTimeout(() => setParam("q", value), 350);
              }}
              className="pl-10"
            />
          </div>

          <Select value={sortBy} onValueChange={(v) => setParam("orderBy", v)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="criado_em">Mais Recente</SelectItem>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="projeto">Projeto</SelectItem>
              <SelectItem value="versao">Versão</SelectItem>
              <SelectItem value="tamanho">Tamanho</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(pageSize)} onValueChange={(v) => setParams({ pageSize: v, page: "1" })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Itens/página" />
            </SelectTrigger>
            <SelectContent>
              {[12, 24, 48, 96].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}/página</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => {
            setParams({ status: "todos", tipo: "todos", projeto: "todos", cliente: "todos", autor: "todos", q: "" });
          }}>
            <Filter className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        {/* Linha de chips (status) */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {[
            { key: "todos", label: "Todos" },
            { key: "EM_ANALISE", label: "Em Análise" },
            { key: "APROVADO", label: "Aprovado" },
            { key: "REJEITADO", label: "Rejeitado" },
            { key: "PENDENTE", label: "Pendente" },
          ].map(s => (
            <Button
              key={s.key}
              size="sm"
              variant={statusFilter === s.key ? "default" : "outline"}
              onClick={() => setParam("status", s.key)}
              className="rounded-full"
            >
              {s.label}
            </Button>
          ))}
        </div>

        {/* Linha de chips (tipos — horizontal scroll) */}
        {tipos.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <Button
              size="sm"
              variant={tipoFilter === "todos" ? "default" : "outline"}
              onClick={() => setParam("tipo", "todos")}
              className="rounded-full"
            >
              <Layers3 className="h-4 w-4 mr-1" /> Todos tipos
            </Button>
            {tipos.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tipoFilter === t ? "default" : "outline"}
                onClick={() => setParam("tipo", t)}
                className="rounded-full"
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        {/* Facetas compactas (projeto/cliente/autor) */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projetoFilter} onValueChange={(v) => setParam("projeto", v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Projetos</SelectItem>
              {projetos.map((p) => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={clienteFilter} onValueChange={(v) => setParam("cliente", v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Clientes</SelectItem>
              {clientes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={autorFilter} onValueChange={(v) => setParam("autor", v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Autores</SelectItem>
              {autores.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Paginação compacta (topo) */}
      {count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>Mostrando página {page} de {totalPages} • {count} itens</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setParam("page", String(page + 1))}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Grid de Artes */}
      {rows.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((arte) => (
            <ArteCard
              key={arte.id}
              arte={arte}
              onFilter={(k, v) => setParam(k, v)}
              onQuickLook={openQuickLook}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma arte encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "todos" || tipoFilter !== "todos" ||
               projetoFilter !== "todos" || clienteFilter !== "todos" || autorFilter !== "todos"
                ? "Tente ajustar os filtros."
                : "Comece criando sua primeira arte."}
            </p>
            {!searchTerm && statusFilter === "todos" && tipoFilter === "todos" &&
              projetoFilter === "todos" && clienteFilter === "todos" && autorFilter === "todos" && (
              <Button onClick={handleOpenNewArte}>
                <Upload className="h-4 w-4 mr-2" />
                Nova Arte
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Quick Look */}
      <ArteQuickLookSheet
        open={openQL}
        onOpenChange={setOpenQL}
        arteId={arteQL}
        defaultTab={defaultTab}
      />

      {/* Modal — Nova Arte */}
      <Dialog
        open={openWizard}
        onOpenChange={(o) => {
          setOpenWizard(o);
          if (!o) {
            setWizardProjectId(null);
            setChoosingProject(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar nova arte</DialogTitle>
          </DialogHeader>

          {!currentUserId ? (
            <div className="text-sm text-muted-foreground">
              Você precisa estar logado para criar uma arte.
            </div>
          ) : choosingProject && !wizardProjectId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione um projeto para associar a arte:
              </p>
              <Select onValueChange={chooseProjectAndContinue}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projectsForChooser.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : wizardProjectId && currentUserId ? (
            <ArteWizard
              projetoId={wizardProjectId}
              userId={currentUserId}
              onFinished={() => {
                setOpenWizard(false);
                setWizardProjectId(null);
                router.refresh();
              }}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Preparando wizard...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== Export default ===================== */
export default function ArtesPage() {
  return (
    <Suspense fallback={<ArtesPageFallback />}>
      <ArtesPageInner />
    </Suspense>
  );
}
