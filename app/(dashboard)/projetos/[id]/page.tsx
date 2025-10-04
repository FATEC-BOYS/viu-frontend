// app/(dashboard)/projetos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Lib base
import {
  getProjeto,
  getProjetoAlertas,
  type Projeto,
  type ProximoPasso as LibProximoPasso,
  type ProximoPassoKind,
  type TarefasKanban,   // ← tipo da LIB (MicroKanban usa esse)
  type TarefaCard,      // ← cards das colunas (LIB)
} from "@/lib/projects";

// Shell
import ProjetoHeader from "@/components/projetos/ProjetoHeader";
import ProjetoTabs, { type ProjetoTabKey } from "@/components/projetos/ProjetoTabs";
import ProjetoAlertBanner from "@/components/projetos/ProjetoAlertBanner";

// ====== VISÃO GERAL ======
import ResumoCards from "@/components/projetos/overview/ResumoCards";
import ProximosPassos from "@/components/projetos/overview/ProximosPassos";
import MicroKanban from "@/components/projetos/overview/MicroKanban";
import CTAContextual from "@/components/projetos/overview/CTAContextual";
import OverviewSkeleton from "@/components/projetos/overview/OverviewSkeleton";

// ====== ARTES ======
import ArtesToolbar from "@/components/projetos/artes/ArtesToolbar";
import ArtesDenseList from "@/components/projetos/artes/ArtesDenseList";
import ArteQuickPeekDrawer from "@/components/projetos/artes/ArteQuickPeekDrawer";
import ArtesSkeleton from "@/components/projetos/artes/ArtesSkeleton";
import type {
  ArteFilters as UIArteFilters,
  ArteStatus,
} from "@/components/projetos/artes/ArtesToolbar";
import type { ArteListItem as UIArteListItem } from "@/components/projetos/artes/ArtesDenseList";

// ====== APROVAÇÃO ======
import AprovacaoPanel from "@/components/projetos/aprovacao/AprovacaoPanel";
import AprovacaoSkeleton from "@/components/projetos/aprovacao/AprovacaoSkeleton";
import type { AprovacaoPainel as UIPainel } from "@/components/projetos/aprovacao/AprovacaoPanel";

// ====== ATIVIDADE ======
import AtividadeFeed from "@/components/projetos/activity/AtividadeFeed";
import AtividadeSkeleton from "@/components/projetos/activity/AtividadeSkeleton";

/* =====================================================================================
 * Fetch helper defensivo
 * ===================================================================================== */
async function j<T>(url: string, init: RequestInit | undefined, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return fallback;
    const data = await r.json();
    return (data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/* =====================================================================================
 * Tipos de UI (compatíveis com os componentes)
 * ===================================================================================== */

// CTA do botão principal (tipo local — o componente não exporta type)
type EstadoCTA = "CRIAR_ARTE" | "PEDIR_APROVACAO" | "CONCLUIR";

// Resumo para ResumoCards (shape do componente)
type ProjetoResumoUI = {
  artesAprovadas: number;
  artesPendentes: number;
  artesRejeitadas: number;
  artesTotal: number;
  prazoProjeto?: string | null;
  proximaRevisao?: string | null;
  orcamentoCentavos?: number | null;
  sparkline?: Array<{ date: string; value: number }>;
  pessoas?: {
    owner?: string;
    designers: number;
    clientes: number;
    aprovadores: number;
    observadores?: number;
  };
  estado?: EstadoCTA;
};

// Arte filters e rows — usar tipos da toolbar/list
type ArteFilters = UIArteFilters;
type ArteListItem = UIArteListItem;

// Aprovação — o componente espera raiz com `regra` e `items`
type AprovacaoPainel = UIPainel;

/* =====================================================================================
 * Página
 * ===================================================================================== */
export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Boot
  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [alertas, setAlertas] = useState<{
    prazosSemana: number; aprovacaoTravada: number; semAprovador: boolean;
  } | null>(null);

  // Aba atual
  const [tab, setTab] = useState<ProjetoTabKey>("overview");

  // ====== boot ======
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, a] = await Promise.all([getProjeto(id), getProjetoAlertas(id)]);
        if (!mounted) return;
        setProjeto(p);
        setAlertas(a);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Pill de status pro header
  const statusPill = useMemo(() => {
    if (!projeto) return null;
    switch (projeto.status) {
      case "EM_ANDAMENTO": return { label: "Em andamento", tone: "default" as const };
      case "PAUSADO": return { label: "Pausado", tone: "warning" as const };
      case "CONCLUIDO": return { label: "Fechado", tone: "success" as const };
      default: return { label: projeto.status, tone: "default" as const };
    }
  }, [projeto]);

  /* =====================================================================================
   * VISÃO GERAL — estados e loaders
   * ===================================================================================== */
  const [ovLoading, setOvLoading] = useState(false);
  const [resumo, setResumo] = useState<ProjetoResumoUI | null>(null);
  const [passos, setPassos] = useState<LibProximoPasso[]>([]);
  const [kanban, setKanban] = useState<TarefasKanban | null>(null);

  const ALLOWED_KINDS: ReadonlyArray<ProximoPassoKind> =
    ["APROVADOR", "PRAZO", "TAREFA", "APROVACAO", "GENERIC"];
  function coerceKind(input: any): ProximoPassoKind {
    const k = String(input ?? "").toUpperCase() as ProximoPassoKind;
    return (ALLOWED_KINDS as readonly string[]).includes(k) ? k : "GENERIC";
  }

  // Adapter: overview → ProjetoResumoUI
  function adaptResumo(raw: any): ProjetoResumoUI {
    return {
      artesAprovadas: Number(raw?.artesAprovadas ?? raw?.aprovadas ?? raw?.aprovadas_count ?? 0),
      artesPendentes: Number(raw?.artesPendentes ?? raw?.pendentes ?? 0),
      artesRejeitadas: Number(raw?.artesRejeitadas ?? raw?.rejeitadas ?? 0),
      artesTotal: Number(raw?.artesTotal ?? raw?.total ?? 0),
      prazoProjeto: raw?.prazoProjeto ?? raw?.prazo ?? null,
      proximaRevisao: raw?.proximaRevisao ?? null,
      orcamentoCentavos: raw?.orcamentoCentavos ?? raw?.orcamento ?? null,
      sparkline: Array.isArray(raw?.sparkline) ? raw.sparkline : [],
      pessoas: raw?.pessoas ?? {
        owner: "", designers: 0, clientes: 0, aprovadores: 0, observadores: 0,
      },
      estado: (raw?.estado ?? "CRIAR_ARTE") as EstadoCTA,
    };
  }

  // Adapter: tarefa do backend -> TarefaCard (LIB)
  function adaptTarefaCard(r: any): TarefaCard {
    return {
      id: String(r.id),
      titulo: String(r.titulo ?? r.title ?? "Tarefa"),
      prazo: r.prazo ?? null,
      prioridade: (r.prioridade ?? "MEDIA") as "ALTA" | "MEDIA" | "BAIXA",
      status: (r.status ?? "PENDENTE") as "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA",
      responsavel_nome:
        r.responsavel?.nome ??
        r.responsavel_nome ??
        (r.responsavel_id ? "—" : null),
    };
  }

  // Adapter: back-end genérico → TarefasKanban (da lib)
  function adaptKanban(raw: any): TarefasKanban {
    const toCol = (arr: any[]) => {
      const rows = Array.isArray(arr) ? arr : [];
      return { top: rows.slice(0, 3).map(adaptTarefaCard), total: rows.length };
    };
    const pendenteSrc = raw?.pendente ?? raw?.PENDENTE ?? [];
    const emAndamentoSrc = raw?.em_andamento ?? raw?.EM_ANDAMENTO ?? [];
    const concluidaSrc = raw?.concluida ?? raw?.CONCLUIDA ?? [];
    return {
      pendente: toCol(pendenteSrc),
      em_andamento: toCol(emAndamentoSrc),
      concluida: toCol(concluidaSrc),
    };
  }

  async function loadOverview() {
    setOvLoading(true);
    try {
      const [r, p, k] = await Promise.all([
        j<any>(`/api/projetos/${id}/overview`, undefined, {
          aprovadas: 0, total: 0, pessoas: { owner: "", designers: 0, clientes: 0, aprovadores: 0 },
          estado: "CRIAR_ARTE" as EstadoCTA,
        }),
        j<any[]>(`/api/projetos/${id}/proximos-passos`, undefined, []),
        j<any>(`/api/projetos/${id}/kanban`, undefined, { pendente: [], em_andamento: [], concluida: [] }),
      ]);

      const passosLib: LibProximoPasso[] = (p ?? []).map((it: any, idx: number) => ({
        id: String(it.id ?? idx),
        kind: coerceKind(it.kind ?? it.tipo ?? "GENERIC"),
        label: String(it.label ?? "Tarefa"),
        tipo: it.tipo ?? "TAREFA",
        done: !!it.done,
      }));

      setResumo(adaptResumo(r));
      setPassos(passosLib);
      setKanban(adaptKanban(k));
    } finally { setOvLoading(false); }
  }

  /* =====================================================================================
   * ARTES — estados e loader
   * ===================================================================================== */
  const [artLoading, setArtLoading] = useState(false);
  const [artRows, setArtRows] = useState<ArteListItem[]>([]);
  const [artTotal, setArtTotal] = useState(0);
  const [artFrom, setArtFrom] = useState(0);

  // ⚠️ Mantemos genérico pra não conflitar com a tipagem da Toolbar
  const [filters, setFilters] = useState<ArteFilters>({} as ArteFilters);
  const [peekId, setPeekId] = useState<string | null>(null);
  const ART_PAGE = 12;

  // helper pra serializar filtros — aceita várias chaves
  function buildArtesQuery(from: number) {
    const q = new URLSearchParams({ from: String(from), limit: String(ART_PAGE) });

    const anyF = filters as any;

    if (typeof anyF.q === "string" && anyF.q) q.set("q", anyF.q);

    const statusArr: string[] =
      Array.isArray(anyF.status) ? anyF.status :
      Array.isArray(anyF.statuses) ? anyF.statuses : [];
    statusArr.forEach((s) => q.append("status", s));

    const tipoArr: string[] =
      Array.isArray(anyF.tipo) ? anyF.tipo :
      Array.isArray(anyF.tipos) ? anyF.tipos : [];
    tipoArr.forEach((t) => q.append("tipo", t));

    const autorArr: string[] =
      Array.isArray(anyF.autor) ? anyF.autor :
      Array.isArray(anyF.autores) ? anyF.autores :
      Array.isArray(anyF.autorId) ? anyF.autorId : [];
    autorArr.forEach((a) => q.append("autor", a));

    const tagArr: string[] =
      Array.isArray(anyF.tag) ? anyF.tag :
      Array.isArray(anyF.tags) ? anyF.tags : [];
    tagArr.forEach((t) => q.append("tag", t));

    return q;
  }

  // Adapter: garantir campos exigidos pela DenseList
  function adaptArteRows(raw: any[]): ArteListItem[] {
    return (raw ?? []).map((r) => {
      const autor =
        r.autor && (r.autor.id || r.autor.nome)
          ? { id: String(r.autor.id ?? r.autor_id ?? ""), nome: String(r.autor.nome ?? r.autor_nome ?? "—") }
          : r.autor_nome
            ? { id: "", nome: String(r.autor_nome) }
            : null;

      return {
        id: String(r.id),
        nome: String(r.nome ?? "Sem nome"),
        thumb: r.thumb ?? r.preview ?? null,
        versao: Number(r.versao ?? 1),
        status: String(r.status ?? "EM_ANALISE"),
        tipo: String(r.tipo ?? "DESCONHECIDO"),
        criado_em: String(r.criado_em ?? new Date().toISOString()),
        autor, // ← { id, nome } | null
      };
    }) as ArteListItem[];
  }

  async function loadArtes(append = false) {
    setArtLoading(true);
    try {
      const from = append ? artFrom : 0;
      const q = buildArtesQuery(from);
      const data = await j<{ items: any[]; total: number }>(
        `/api/projetos/${id}/artes?${q.toString()}`,
        undefined,
        { items: [], total: 0 }
      );
      const items = adaptArteRows(data.items);
      setArtRows((prev) => (append ? [...prev, ...items] : items));
      setArtTotal(data.total);
      setArtFrom(from + ART_PAGE);
    } finally { setArtLoading(false); }
  }

  /* =====================================================================================
   * APROVAÇÃO — estados e loader
   * ===================================================================================== */
  const [apLoading, setApLoading] = useState(false);
  const [painel, setPainel] = useState<AprovacaoPainel | null>(null);

  function adaptPainel(raw: any): AprovacaoPainel {
    if (!raw) return { regra: { tipo: "TODOS", exigirDesigner: false, slaDias: null }, items: [] } as unknown as AprovacaoPainel;
    const items = raw.items ?? raw.itens ?? [];
    const regra = raw.regra ?? { tipo: "TODOS", exigirDesigner: false, slaDias: null };
    const normItems = items.map((i: any) => ({
      arteId: String(i.arteId ?? i.arte_id ?? i.id),
      nome: String(i.nome ?? "Arte"),
      versao: Number(i.versao ?? 1),
      estado: (i.estado ?? "EM_ANALISE") as "ENVIADA" | "EM_ANALISE" | "APROVADA" | "REJEITADA",
      aprovadores: (i.aprovadores ?? []).map((ap: any) => ({
        id: String(ap.id),
        nome: String(ap.nome ?? ap.email ?? "—"),
        status: (ap.status ?? "PENDENTE") as "OK" | "PENDENTE" | "REJEITADO",
        deadline: ap.deadline ?? null,
      })),
      regra: i.regra ?? { tipo: "TODOS", exigirDesigner: false, slaDias: null },
    }));
    return { regra, items: normItems } as AprovacaoPainel;
  }

  async function loadApproval() {
    setApLoading(true);
    try {
      const data = await j<any>(`/api/projetos/${id}/aprovacao/painel`, undefined, {
        regra: { tipo: "TODOS", exigirDesigner: false, slaDias: null }, items: []
      });
      setPainel(adaptPainel(data));
    } finally { setApLoading(false); }
  }

  async function lembrarAprovadores(aprovacaoId: string) {
    await fetch(`/api/aprovacoes/${aprovacaoId}/remind`, { method: "POST" });
  }
  async function overrideOwner(arteId: string) {
    await fetch(`/api/artes/${arteId}/override`, { method: "POST" });
    await loadApproval();
  }

  /* =====================================================================================
   * ATIVIDADE — estados e loader
   * ===================================================================================== */
  const [actLoading, setActLoading] = useState(false);
  const [actRows, setActRows] = useState<any[]>([]);
  const [actTotal, setActTotal] = useState(0);
  const [actFrom, setActFrom] = useState(0);
  const ACT_PAGE = 15;

  async function loadActivity(append = false) {
    setActLoading(true);
    try {
      const from = append ? actFrom : 0;
      const data = await j<{ items: any[]; total: number }>(
        `/api/projetos/${id}/atividade?from=${from}&limit=${ACT_PAGE}`,
        undefined,
        { items: [], total: 0 }
      );
      setActRows((prev) => (append ? [...prev, ...data.items] : data.items));
      setActTotal(data.total);
      setActFrom(from + ACT_PAGE);
    } finally { setActLoading(false); }
  }

  // Lazy-load por aba
  useEffect(() => {
    if (tab === "overview" && !resumo) loadOverview();
    if (tab === "artes" && artRows.length === 0) loadArtes(false);
    if (tab === "approval" && !painel) loadApproval();
    if (tab === "activity" && actRows.length === 0) loadActivity(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  // ====== estados base ======
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        Carregando projeto…
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <div className="text-destructive">Projeto não encontrado.</div>
        <Link href="/projetos" className="underline text-sm">Voltar para Projetos</Link>
      </div>
    );
  }

  /* =====================================================================================
   * Render
   * ===================================================================================== */
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <ProjetoHeader
        projeto={projeto}
        statusPill={statusPill ?? undefined}
        onEditar={() => router.push(`/projetos/${projeto.id}?edit=1`)}
        onDuplicar={() => console.log("duplicar", projeto.id)}
        onExportar={() => console.log("exportar", projeto.id)}
        onArquivar={() => console.log("arquivar", projeto.id)}
      />

      {/* Alertas contextuais */}
      {alertas && (
        <ProjetoAlertBanner
          prazosSemana={alertas.prazosSemana}
          aprovacaoTravada={alertas.aprovacaoTravada}
          semAprovador={alertas.semAprovador}
          onResolver={() => setTab("approval")}
        />
      )}

      {/* Tabs sticky */}
      <ProjetoTabs current={tab} onChange={setTab} />

      {/* Conteúdo por aba */}
      <div className="pt-2 space-y-6">
        {/* ===== VISÃO GERAL ===== */}
        {tab === "overview" && (
          ovLoading || !resumo || !kanban ? (
            <OverviewSkeleton />
          ) : (
            <>
              <ResumoCards resumo={resumo} />
              <div className="grid gap-4 md:grid-cols-2">
                <ProximosPassos
                  passos={passos}
                  onAction={(passo) => {
                    if (passo.tipo === "APROVADOR") setTab("approval");
                    if (passo.tipo === "PRAZO") console.log("definir prazo");
                    if (passo.tipo === "TAREFA") console.log("abrir tarefa");
                    if (passo.tipo === "APROVACAO") setTab("approval");
                  }}
                />
                <MicroKanban
                  kanban={kanban}
                  onNovo={() => console.log("nova tarefa")}
                  onAbrir={(tid) => console.log("abrir tarefa", tid)}
                />
              </div>
              <div className="flex justify-end">
                <CTAContextual
                  estado={resumo.estado ?? "CRIAR_ARTE"}
                  onClick={() => {
                    if (resumo.estado === "CONCLUIR") {
                      console.log("Concluir projeto");
                    } else if (resumo.estado === "PEDIR_APROVACAO") {
                      setTab("approval");
                    } else {
                      setTab("artes");
                    }
                  }}
                />
              </div>
            </>
          )
        )}

        {/* ===== ARTES ===== */}
        {tab === "artes" && (
          <>
            <ArtesToolbar
              filters={filters}
              onChange={(f) => {
                setFilters(f);
                setArtFrom(0);
                loadArtes(false);
              }}
            />
            {artLoading && artRows.length === 0 ? (
              <ArtesSkeleton />
            ) : (
              <>
                <ArtesDenseList
                  rows={artRows}
                  total={artTotal}
                  loading={artLoading}
                  onLoadMore={() => loadArtes(true)}
                  onPeek={(arteId) => setPeekId(arteId)}
                />
                <ArteQuickPeekDrawer
                  open={!!peekId}
                  onOpenChange={(v) => !v && setPeekId(null)}
                  arteId={peekId ?? ""}
                />
              </>
            )}
          </>
        )}

        {/* ===== TAREFAS ===== */}
        {tab === "tasks" && (
          <>
            {ovLoading && !kanban ? (
              <OverviewSkeleton />
            ) : (
              <MicroKanban
                kanban={
                  kanban ?? {
                    pendente: { top: [], total: 0 },
                    em_andamento: { top: [], total: 0 },
                    concluida: { top: [], total: 0 },
                  }
                }
                onNovo={() => console.log("nova tarefa")}
                onAbrir={(tid) => console.log("abrir tarefa", tid)}
              />
            )}
          </>
        )}

        {/* ===== APROVAÇÃO ===== */}
        {tab === "approval" && (
          apLoading || !painel ? (
            <AprovacaoSkeleton />
          ) : (
            <AprovacaoPanel
              painel={painel}
              onLembrar={lembrarAprovadores}
              onOverride={overrideOwner}
            />
          )
        )}

        {/* ===== ATIVIDADE ===== */}
        {tab === "activity" && (
          actLoading && actRows.length === 0 ? (
            <AtividadeSkeleton />
          ) : (
            <AtividadeFeed
              rows={actRows}
              total={actTotal}
              loading={actLoading}
              onLoadMore={() => loadActivity(true)}
              onOpen={(ref) => {
                console.log("abrir no contexto", ref);
              }}
            />
          )
        )}
      </div>
    </div>
  );
}
