"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Upload,
  Search,
  Calendar,
  User,
  FileImage,
  Loader2,
  Eye,
  Download,
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
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
    EM_ANALISE: {
      label: "Em Análise",
      variant: "outline" as const,
      icon: Clock,
    },
    APROVADO: { label: "Aprovado", variant: "default" as const, icon: CheckCircle2 },
    REJEITADO: {
      label: "Rejeitado",
      variant: "destructive" as const,
      icon: XCircle,
    },
    PENDENTE: { label: "Pendente", variant: "secondary" as const, icon: AlertCircle },
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

function TipoBadge({ tipo }: { tipo: string }) {
  const tipoConfig = {
    LOGO: { label: "Logo", color: "bg-purple-100 text-purple-800" },
    BANNER: { label: "Banner", color: "bg-blue-100 text-blue-800" },
    FLYER: { label: "Flyer", color: "bg-green-100 text-green-800" },
    CARTAO: { label: "Cartão", color: "bg-orange-100 text-orange-800" },
    LAYOUT: { label: "Layout", color: "bg-pink-100 text-pink-800" },
    ICONE: { label: "Ícone", color: "bg-cyan-100 text-cyan-800" },
    INTERFACE: { label: "Interface", color: "bg-indigo-100 text-indigo-800" },
    ANIMACAO: { label: "Animação", color: "bg-red-100 text-red-800" },
    ILUSTRACAO: { label: "Ilustração", color: "bg-yellow-100 text-yellow-800" },
    FOTOGRAFIA: { label: "Fotografia", color: "bg-gray-100 text-gray-800" },
    INFOGRAFICO: { label: "Infográfico", color: "bg-teal-100 text-teal-800" },
    APRESENTACAO: { label: "Apresentação", color: "bg-lime-100 text-lime-800" },
    MATERIAL_IMPRESSO: { label: "Impresso", color: "bg-amber-100 text-amber-800" },
    SOCIAL_MEDIA: { label: "Social Media", color: "bg-rose-100 text-rose-800" },
    BRANDING: { label: "Branding", color: "bg-violet-100 text-violet-800" },
    PACKAGING: { label: "Packaging", color: "bg-fuchsia-100 text-fuchsia-800" },
    UI_KIT: { label: "UI Kit", color: "bg-sky-100 text-sky-800" },
    PRODUTO: { label: "Produto", color: "bg-emerald-100 text-emerald-800" },
    "3D": { label: "3D", color: "bg-stone-100 text-stone-800" },
    VETOR: { label: "Vetor", color: "bg-zinc-100 text-zinc-800" },
  };
  const config =
    tipoConfig[tipo as keyof typeof tipoConfig] ??
    ({ label: tipo, color: "bg-gray-100 text-gray-800" } as const);
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {config.label}
    </span>
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
  onQuickLook: (
    id: string,
    tab?: "resumo" | "feedbacks" | "tarefas" | "aprovacoes",
  ) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR");

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
    return () => {
      alive = false;
    };
  }, [arte.arquivo]);

  async function handleDownload() {
    try {
      const url = await getArteDownloadUrl(arte.arquivo);
      window.open(url, "_blank");
    } catch {
      // TODO: toast de erro
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{arte.nome}</CardTitle>
              <span className="text-sm text-muted-foreground">v{arte.versao}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              <button
                className="underline hover:opacity-80"
                onClick={() => arte.projeto_nome && onFilter("projeto", arte.projeto_nome)}
              >
                {arte.projeto_nome}
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Cliente:{" "}
              <button
                className="underline hover:opacity-80"
                onClick={() => arte.cliente_nome && onFilter("cliente", arte.cliente_nome)}
              >
                {arte.cliente_nome}
              </button>
            </p>
          </div>
          <StatusBadge status={arte.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preview real (fallback se não houver) */}
        <div className="aspect-video rounded-md border overflow-hidden bg-gray-50 grid place-items-center">
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
            <div className="text-center">
              <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Sem preview</p>
            </div>
          )}
        </div>

        {/* Tipo e tamanho */}
        <div className="flex items-center justify-between">
          <button onClick={() => onFilter("tipo", arte.tipo)}>
            <TipoBadge tipo={arte.tipo} />
          </button>
          <span className="text-xs text-muted-foreground">
            {formatFileSize(arte.tamanho)}
          </span>
        </div>

        {/* Informações do arquivo */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              Autor
            </div>
            <p className="font-medium">
              <button
                className="underline hover:opacity-80"
                onClick={() => arte.autor_nome && onFilter("autor", arte.autor_nome)}
              >
                {arte.autor_nome}
              </button>
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Criado
            </div>
            <p className="font-medium">{formatDate(arte.criado_em)}</p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm">
            {(arte.feedbacks_count ?? 0) > 0 && (
              <button
                className="flex items-center gap-1 text-muted-foreground hover:underline"
                onClick={() => onQuickLook(arte.id, "feedbacks")}
              >
                <MessageSquare className="h-3 w-3" />
                {arte.feedbacks_count}
              </button>
            )}
            {arte.tem_aprovacao_aprovada && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Aprovação
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onQuickLook(arte.id, "resumo")}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
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
  const openQuickLook = (
    id: string,
    tab?: "resumo" | "feedbacks" | "tarefas" | "aprovacoes",
  ) => {
    setArteQL(id);
    if (tab) setDefaultTab(tab);
    setOpenQL(true);
  };

  // Filtros URL
  const searchTerm = getParam("q", "");
  const statusFilter = getParam("status", "todos");
  const tipoFilter = getParam("tipo", "todos");
  const projetoFilter = getParam("projeto", "todos"); // nome do projeto
  const clienteFilter = getParam("cliente", "todos");
  const autorFilter = getParam("autor", "todos");
  const sortBy = getParam("orderBy", "criado_em") as
    | "criado_em"
    | "nome"
    | "projeto"
    | "versao"
    | "tamanho";
  const page = Math.max(1, Number(getParam("page", "1")) || 1);
  const pageSize = Math.min(
    96,
    Math.max(6, Number(getParam("pageSize", "24")) || 24),
  );

  // Dados lista
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ArteOverview[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    },
    [],
  );

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
  }, [
    searchTerm,
    statusFilter,
    tipoFilter,
    projetoFilter,
    clienteFilter,
    autorFilter,
    sortBy,
    page,
    pageSize,
  ]);

  // Facetas dinâmicas (com base no resultado atual)
  const projetos = Array.from(new Set(rows.map((a) => a.projeto_nome).filter((p): p is string => !!p))).map(
    (nome, idx) => ({ id: String(idx), nome }),
  );
  const tipos = Array.from(new Set(rows.map((a) => a.tipo)));
  const clientes = Array.from(new Set(rows.map((a) => a.cliente_nome).filter((c): c is string => !!c)));
  const autores = Array.from(new Set(rows.map((a) => a.autor_nome).filter((a): a is string => !!a)));

  const estatisticas = {
    total: rows.length,
    emAnalise: rows.filter((a) => a.status === "EM_ANALISE").length,
    aprovadas: rows.filter((a) => a.status === "APROVADO").length,
    rejeitadas: rows.filter((a) => a.status === "REJEITADO").length,
    pendentes: rows.filter((a) => a.status === "PENDENTE").length,
  };

  // ========= Integrar Wizard =========
  const [openWizard, setOpenWizard] = useState(false);
  const [wizardProjectId, setWizardProjectId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [projectsForChooser, setProjectsForChooser] = useState<
    { id: string; nome: string }[]
  >([]);
  const [choosingProject, setChoosingProject] = useState(false);

  // abre modal e resolve user/projeto
  async function handleOpenNewArte() {
    // 1) pega userId primeiro
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.error(userErr);
    const uid = userData?.user?.id ?? null;
    setCurrentUserId(uid);

    // 2) resolve projeto pelo filtro (nome → id) ou pede para escolher
    let resolvedProjectId: string | null = null;
    if (projetoFilter && projetoFilter !== "todos") {
      const { data: p } = await supabase
        .from("projetos")
        .select("id")
        .ilike("nome", projetoFilter)
        .limit(1)
        .maybeSingle();
      if (p?.id) resolvedProjectId = p.id;
    }

    if (!resolvedProjectId) {
      setChoosingProject(true);
      const { data: list } = await supabase
        .from("projetos")
        .select("id, nome")
        .order("criado_em", { ascending: false });
      setProjectsForChooser(list || []);
    } else {
      setWizardProjectId(resolvedProjectId);
    }

    // 3) abre o modal
    setOpenWizard(true);
  }

  function chooseProjectAndContinue(id: string) {
    setWizardProjectId(id);
    setChoosingProject(false);
  }

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artes</h1>
          <p className="text-muted-foreground">Gerencie todas as artes dos seus projetos</p>
        </div>
        <Button onClick={handleOpenNewArte}>
          <Upload className="h-4 w-4 mr-2" />
          Nova Arte
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total de Artes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.emAnalise}</div>
            <p className="text-sm text-muted-foreground">Em Análise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{estatisticas.aprovadas}</div>
            <p className="text-sm text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{estatisticas.rejeitadas}</div>
            <p className="text-sm text-muted-foreground">Rejeitadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{estatisticas.pendentes}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por arte, projeto ou cliente..."
            defaultValue={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
              searchTimeoutRef.current = setTimeout(() => setParam("q", value), 350);
            }}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
            <SelectItem value="APROVADO">Aprovado</SelectItem>
            <SelectItem value="REJEITADO">Rejeitado</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={(v) => setParam("tipo", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Array.from(new Set(tipos)).map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projetoFilter} onValueChange={(v) => setParam("projeto", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Projetos</SelectItem>
            {projetos.map((projeto) => (
              <SelectItem key={projeto.id} value={projeto.nome}>
                {projeto.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={(v) => setParam("cliente", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Clientes</SelectItem>
            {Array.from(new Set(clientes)).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={autorFilter} onValueChange={(v) => setParam("autor", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Autores</SelectItem>
            {Array.from(new Set(autores)).map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setParam("orderBy", v)}>
          <SelectTrigger className="w-[150px]">
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
      </div>

      {/* Paginação */}
      {count > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages} • {count} itens
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Próxima
            </Button>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setParams({ pageSize: v, page: "1" })}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Itens/página" />
              </SelectTrigger>
              <SelectContent>
                {[12, 24, 48, 96].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {searchTerm ||
              statusFilter !== "todos" ||
              tipoFilter !== "todos" ||
              projetoFilter !== "todos" ||
              clienteFilter !== "todos" ||
              autorFilter !== "todos"
                ? "Tente ajustar os filtros de busca."
                : "Comece criando sua primeira arte."}
            </p>
            {!searchTerm &&
              statusFilter === "todos" &&
              tipoFilter === "todos" &&
              projetoFilter === "todos" &&
              clienteFilter === "todos" &&
              autorFilter === "todos" && (
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
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
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
