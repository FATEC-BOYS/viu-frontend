// app/(dashboard)/projetos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import {
  getProjeto,
  getProjetoAlertas,
  getProjetoResumo,
  getProximosPassos,
  getTarefasKanban,
  getAprovacaoPainel,
  lembrarAprovadores as lembrarAprovadoresApi,
  listArtes,
  listAtividade,
  type Projeto,
  type ProximoPasso as LibProximoPasso,
  type ProximoPassoKind,
  type TarefasKanban,
  type AprovacaoPainel as LibAprovacaoPainel,
} from "@/lib/projects";

import ProjetoHeader from "@/components/projetos/ProjetoHeader";
import ProjetoTabs, { type ProjetoTabKey } from "@/components/projetos/ProjetoTabs";
import ProjetoAlertBanner from "@/components/projetos/ProjetoAlertBanner";
import GerenciarAcessosDrawer from "@/components/projetos/pessoas/GerenciarAcessosDrawer";

import ResumoCards from "@/components/projetos/overview/ResumoCards";
import ProximosPassos from "@/components/projetos/overview/ProximosPassos";
import MicroKanban from "@/components/projetos/overview/MicroKanban";
import CTAContextual from "@/components/projetos/overview/CTAContextual";
import OverviewSkeleton from "@/components/projetos/overview/OverviewSkeleton";

import ArtesToolbar from "@/components/projetos/artes/ArtesToolbar";
import ArtesDenseList from "@/components/projetos/artes/ArtesDenseList";
import ArteQuickPeekDrawer from "@/components/projetos/artes/ArteQuickPeekDrawer";
import ArtesSkeleton from "@/components/projetos/artes/ArtesSkeleton";
import type {
  ArteFilters as UIArteFilters,
  ArteStatus,
} from "@/components/projetos/artes/ArtesToolbar";
import type { ArteListItem as UIArteListItem } from "@/components/projetos/artes/ArtesDenseList";

import AprovacaoPanel from "@/components/projetos/aprovacao/AprovacaoPanel";
import AprovacaoSkeleton from "@/components/projetos/aprovacao/AprovacaoSkeleton";
import type {
  AprovacaoPainel as UIPainel,
  AprovacaoArteRow,
} from "@/components/projetos/aprovacao/AprovacaoPanel";

import AtividadeFeed from "@/components/projetos/activity/AtividadeFeed";
import type { AtividadeItem as UIAtividadeItem } from "@/components/projetos/activity/AtividadeItemRow";
import AtividadeSkeleton from "@/components/projetos/activity/AtividadeSkeleton";

import FaturaTab from "@/components/projetos/billing/FaturaTab";

type EstadoCTA = "CRIAR_ARTE" | "PEDIR_APROVACAO" | "CONCLUIR";

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

type ArteFilters = UIArteFilters;
type ArteListItem = UIArteListItem;
type AprovacaoPainel = UIPainel;

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [alertas, setAlertas] = useState<{
    prazosSemana: number; aprovacaoTravada: number; semAprovador: boolean;
  } | null>(null);

  const [tab, setTab] = useState<ProjetoTabKey>("overview");
  const [acessosAberto, setAcessosAberto] = useState(false);

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

  const statusPill = useMemo(() => {
    if (!projeto) return null;
    switch (projeto.status) {
      case "EM_ANDAMENTO": return { label: "Em andamento", tone: "default" as const };
      case "PAUSADO": return { label: "Pausado", tone: "warning" as const };
      case "CONCLUIDO": return { label: "Fechado", tone: "success" as const };
      case "RASCUNHO": return { label: "Rascunho — aguardando aceite", tone: "warning" as const };
      case "CANCELADO": return { label: "Cancelado", tone: "warning" as const };
      default: return { label: projeto.status, tone: "default" as const };
    }
  }, [projeto]);

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
      pessoas: raw?.pessoas ?? { owner: "", designers: 0, clientes: 0, aprovadores: 0, observadores: 0 },
      estado: (raw?.estado ?? "CRIAR_ARTE") as EstadoCTA,
    };
  }


  async function loadOverview() {
    setOvLoading(true);
    try {
      const [r, p, k] = await Promise.all([
        getProjetoResumo(id),
        getProximosPassos(id),
        getTarefasKanban(id),
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
      // getTarefasKanban já devolve as colunas no formato { top, total }
      setKanban(k);
    } finally { setOvLoading(false); }
  }

  const [artLoading, setArtLoading] = useState(false);
  const [artRows, setArtRows] = useState<ArteListItem[]>([]);
  const [artTotal, setArtTotal] = useState(0);
  const [artFrom, setArtFrom] = useState(0);
  const [filters, setFilters] = useState<ArteFilters>({} as ArteFilters);
  const [peekId, setPeekId] = useState<string | null>(null);
  const ART_PAGE = 12;

  function buildArtesQuery(from: number) {
    const q = new URLSearchParams({ from: String(from), limit: String(ART_PAGE) });
    const anyF = filters as any;
    if (typeof anyF.q === "string" && anyF.q) q.set("q", anyF.q);
    const statusArr: string[] = Array.isArray(anyF.status) ? anyF.status : Array.isArray(anyF.statuses) ? anyF.statuses : [];
    statusArr.forEach(s => q.append("status", s));
    const tipoArr: string[] = Array.isArray(anyF.tipo) ? anyF.tipo : Array.isArray(anyF.tipos) ? anyF.tipos : [];
    tipoArr.forEach(t => q.append("tipo", t));
    const autorArr: string[] = Array.isArray(anyF.autor) ? anyF.autor : Array.isArray(anyF.autores) ? anyF.autores : Array.isArray(anyF.autorId) ? anyF.autorId : [];
    autorArr.forEach(a => q.append("autor", a));
    const tagArr: string[] = Array.isArray(anyF.tag) ? anyF.tag : Array.isArray(anyF.tags) ? anyF.tags : [];
    tagArr.forEach(t => q.append("tag", t));
    return q;
  }

  function adaptArteRows(raw: any[]): ArteListItem[] {
    return (raw ?? []).map(r => {
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
        autor,
      };
    }) as ArteListItem[];
  }

  async function loadArtes(append = false) {
    setArtLoading(true);
    try {
      const from = append ? artFrom : 0;
      const q = buildArtesQuery(from);
      const { rows, count } = await listArtes(id, {
        limit: ART_PAGE,
        offset: from,
        status: q.get("status") ?? undefined,
        tipo: q.get("tipo") ?? undefined,
      });
      const items = adaptArteRows(rows);
      setArtRows(prev => (append ? [...prev, ...items] : items));
      setArtTotal(count);
      setArtFrom(from + ART_PAGE);
    } finally { setArtLoading(false); }
  }

  const [apLoading, setApLoading] = useState(false);
  const [painel, setPainel] = useState<AprovacaoPainel | null>(null);

  /**
   * getAprovacaoPainel devolve uma linha por aprovação; a UI espera uma linha
   * por arte, com os aprovadores agrupados dentro dela.
   */
  function adaptPainel(raw: LibAprovacaoPainel): AprovacaoPainel {
    const porArte = new Map<string, AprovacaoArteRow>();

    for (const e of raw.estados ?? []) {
      if (!porArte.has(e.arte_id)) {
        porArte.set(e.arte_id, {
          aprovacaoId: e.aprovacao_id,
          arteId: e.arte_id,
          arteNome: e.arte_nome ?? "Arte",
          versaoAtual: Number(e.versao ?? 1),
          status: "EM_ANALISE",
          criadoEm: e.criado_em,
          aprovadores: [],
        });
      }
      porArte.get(e.arte_id)!.aprovadores.push({
        id: e.aprovacao_id,
        nome: e.aprovador_nome ?? "—",
        status: e.status,
      });
    }

    const items = [...porArte.values()].map((it) => {
      const rejeitou = it.aprovadores.some((a) => a.status === "REJEITADO");
      const todosAprovaram =
        it.aprovadores.length > 0 && it.aprovadores.every((a) => a.status === "APROVADO");
      return {
        ...it,
        status: rejeitou ? "REJEITADO" : todosAprovaram ? "APROVADO" : "EM_ANALISE",
      } as AprovacaoArteRow;
    });

    return {
      regra: {
        modo: raw.regra?.todosAprovadores ? "TODOS" : "QUALQUER_UM",
        exigirDesigner: raw.regra?.exigirAprovacaoDesigner ?? false,
        slaDias: raw.regra?.prazoDias ?? null,
      },
      items,
    };
  }

  async function loadApproval() {
    setApLoading(true);
    try {
      setPainel(adaptPainel(await getAprovacaoPainel(id)));
    } finally { setApLoading(false); }
  }

  async function lembrarAprovadores(aprovacaoId: string) {
    await lembrarAprovadoresApi(aprovacaoId);
  }

  const [actLoading, setActLoading] = useState(false);
  const [actRows, setActRows] = useState<UIAtividadeItem[]>([]);
  const [actTotal, setActTotal] = useState(0);
  const [actFrom, setActFrom] = useState(0);
  const ACT_PAGE = 15;

  async function loadActivity(append = false) {
    setActLoading(true);
    try {
      const from = append ? actFrom : 0;
      const { rows, count } = await listAtividade(id, { limit: ACT_PAGE, offset: from });
      const items: UIAtividadeItem[] = rows.map((r) => ({
        id: r.ref_id,
        tipo: r.tipo as UIAtividadeItem["tipo"],
        criado_em: r.criado_em,
        autor: {
          id: r.autor_id ?? "",
          nome: r.autor_nome ?? "—",
          avatar: r.autor_avatar,
        },
        ref: { kind: "arte", id: r.ref_id },
        meta: { arteNome: r.titulo, versao: r.versao ?? undefined },
      }));
      setActRows(prev => (append ? [...prev, ...items] : items));
      setActTotal(count);
      setActFrom(from + ACT_PAGE);
    } finally { setActLoading(false); }
  }

  useEffect(() => {
    if (tab === "overview" && !resumo) loadOverview();
    if (tab === "artes" && artRows.length === 0) loadArtes(false);
    if (tab === "approval" && !painel) loadApproval();
    if (tab === "activity" && actRows.length === 0) loadActivity(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

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

  return (
    <div className="p-6 space-y-4">
      <GerenciarAcessosDrawer
        open={acessosAberto}
        onOpenChange={setAcessosAberto}
        projetoId={projeto.id}
      />

      <ProjetoHeader
        projeto={projeto}
        statusPill={statusPill ?? undefined}
        onEditar={() => router.push(`/projetos/${projeto.id}?edit=1`)}
        onPessoas={() => setAcessosAberto(true)}
        onDuplicar={() => console.log("duplicar", projeto.id)}
        onExportar={() => console.log("exportar", projeto.id)}
        onArquivar={() => console.log("arquivar", projeto.id)}
      />

      {alertas && (
        <ProjetoAlertBanner
          prazosSemana={alertas.prazosSemana}
          aprovacaoTravada={alertas.aprovacaoTravada}
          semAprovador={alertas.semAprovador}
          onResolver={() => setTab("approval")}
        />
      )}

      <ProjetoTabs current={tab} onChange={setTab} />

      <div className="pt-2 space-y-6">
        {tab === "overview" && (
          ovLoading || !resumo || !kanban ? (
            <OverviewSkeleton />
          ) : (
            <>
              <ResumoCards resumo={resumo} />
              <div className="grid gap-4 md:grid-cols-2">
                <ProximosPassos
                  passos={passos}
                  onAction={passo => {
                    if (passo.tipo === "APROVADOR") setTab("approval");
                    if (passo.tipo === "PRAZO") console.log("definir prazo");
                    if (passo.tipo === "TAREFA") console.log("abrir tarefa");
                    if (passo.tipo === "APROVACAO") setTab("approval");
                  }}
                />
                <MicroKanban
                  kanban={kanban}
                  onNovo={() => console.log("nova tarefa")}
                  onAbrir={tid => console.log("abrir tarefa", tid)}
                />
              </div>
              <div className="flex justify-end">
                <CTAContextual
                  estado={resumo.estado ?? "CRIAR_ARTE"}
                  onClick={() => {
                    if (resumo.estado === "CONCLUIR") console.log("Concluir projeto");
                    else if (resumo.estado === "PEDIR_APROVACAO") setTab("approval");
                    else setTab("artes");
                  }}
                />
              </div>
            </>
          )
        )}

        {tab === "artes" && (
          <>
            <ArtesToolbar
              filters={filters}
              onChange={f => {
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
                  onPeek={arteId => setPeekId(arteId)}
                />
                <ArteQuickPeekDrawer
                  open={!!peekId}
                  onOpenChange={v => !v && setPeekId(null)}
                  arteId={peekId ?? ""}
                />
              </>
            )}
          </>
        )}

        {tab === "tasks" && (
          ovLoading && !kanban ? (
            <OverviewSkeleton />
          ) : (
            <MicroKanban
              kanban={kanban ?? {
                pendente: { top: [], total: 0 },
                em_andamento: { top: [], total: 0 },
                concluida: { top: [], total: 0 },
              }}
              onNovo={() => console.log("nova tarefa")}
              onAbrir={tid => console.log("abrir tarefa", tid)}
            />
          )
        )}

        {tab === "approval" && (
          apLoading || !painel ? (
            <AprovacaoSkeleton />
          ) : (
            <AprovacaoPanel
              painel={painel}
              onLembrar={lembrarAprovadores}
            />
          )
        )}

        {tab === "activity" && (
          actLoading && actRows.length === 0 ? (
            <AtividadeSkeleton />
          ) : (
            <AtividadeFeed
              rows={actRows}
              total={actTotal}
              loading={actLoading}
              onLoadMore={() => loadActivity(true)}
              onOpen={ref => console.log("abrir no contexto", ref)}
            />
          )
        )}

        {tab === "billing" && <FaturaTab projetoId={id} />}
      </div>
    </div>
  );
}
