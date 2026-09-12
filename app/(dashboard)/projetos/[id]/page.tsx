// app/(dashboard)/projetos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import {
  getProjeto,
  getProjetoResumo,
  getProximosPassos,
  getTarefasKanban,
  getAprovacaoPainel,
  lembrarAprovadores as lembrarAprovadoresApi,
  listArtes,
  listAtividade,
  updateProjeto,
  createProjeto,
  type Projeto,
  type ProximoPasso as LibProximoPasso,
  type TarefasKanban,
  type AprovacaoPainel as LibAprovacaoPainel,
} from "@/lib/projects";

import ProjetoHeader from "@/components/projetos/ProjetoHeader";
import ProjetoTabs, { type ProjetoTabKey } from "@/components/projetos/ProjetoTabs";
import GerenciarAcessosDrawer from "@/components/projetos/pessoas/GerenciarAcessosDrawer";

import EstadoDoProjeto from "@/components/projetos/overview/EstadoDoProjeto";
import NumerosDoProjeto from "@/components/projetos/overview/NumerosDoProjeto";
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
import SolicitarAprovacaoDialog from "@/components/projetos/aprovacao/SolicitarAprovacaoDialog";
import AprovacaoSkeleton from "@/components/projetos/aprovacao/AprovacaoSkeleton";
import type {
  AprovacaoPainel as UIPainel,
  AprovacaoArteRow,
} from "@/components/projetos/aprovacao/AprovacaoPanel";

import AtividadeFeed from "@/components/projetos/activity/AtividadeFeed";
import type { AtividadeItem as UIAtividadeItem } from "@/components/projetos/activity/AtividadeItemRow";
import AtividadeSkeleton from "@/components/projetos/activity/AtividadeSkeleton";

import FaturaTab from "@/components/projetos/billing/FaturaTab";
import NovaVersaoDialog from "@/components/artes/NovaVersaoDialog";
import { getArteDetail, type ArteDetail } from "@/lib/artes";
import ProjetoModal, { type ProjetoInitial } from "@/components/projetos/ProjetoModal";
import { toast } from "sonner";

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

/** Só estas abas existem; qualquer outro valor de ?tab= cai na Visão Geral. */
const ABAS_VALIDAS: ProjetoTabKey[] = [
  "overview",
  "artes",
  "tasks",
  "approval",
  "activity",
  "billing",
];

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  // `?tab=` decide a aba inicial: os CTAs "Solicitar aprovação" do dashboard
  // apontam para ?tab=approval, e sem ler isto eles caíam na Visão Geral —
  // mandavam para a página certa, na aba errada.
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ProjetoTabKey>(() => {
    const pedida = searchParams.get("tab") as ProjetoTabKey | null;
    return pedida && ABAS_VALIDAS.includes(pedida) ? pedida : "overview";
  });
  const [acessosAberto, setAcessosAberto] = useState(false);
  /**
   * "Editar" no cabeçalho empurrava `?edit=1` e ninguém lia o parâmetro — o
   * botão trocava a URL e não abria nada. O mesmo modal atende "Definir
   * prazo" nos próximos passos, que também era um `console.log`.
   */
  const [editando, setEditando] = useState(false);

  /**
   * `?edit=1` continua funcionando para quem chega de fora com esse link.
   * Lido depois da montagem: decidir no primeiro render divergiria da
   * hidratação, porque o servidor não vê a URL do navegador.
   */
  useEffect(() => {
    if (searchParams.get("edit") === "1") setEditando(true);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getProjeto(id);
        if (!mounted) return;
        setProjeto(p);
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

      /**
       * O `kind` chega pronto de `getProximosPassos` e é o que diz o que
       * fazer. Antes ele passava por um `coerceKind` que só aceitava cinco
       * valores — `DEFINIR_PRAZO_PROJETO` e `ENVIAR_APROVACAO` viravam
       * `GENERIC` — e um `tipo: it.tipo ?? "TAREFA"` carimbava tudo como
       * tarefa. O botão "Resolver" então decidia o destino a partir de um
       * campo que já tinha perdido a informação, e mandava todo mundo para a
       * aba Tarefas.
       */
      const passosLib: LibProximoPasso[] = (p ?? []).map((it: any, idx: number) => ({
        id: String(it.id ?? idx),
        kind: it.kind,
        label: String(it.label ?? "Próximo passo"),
        meta: it.meta,
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
  /** Arte cujo diálogo de nova versão está aberto. */
  const [arteVersao, setArteVersao] = useState<ArteDetail | null>(null);
  /** Arte para a qual se está pedindo aprovação a partir da lista. */
  const [arteAprovacao, setArteAprovacao] = useState<string | null>(null);
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
        preview_url: r.preview_url ?? null,
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
          previewUrl: e.arte_preview_url ?? null,
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

    return { items };
  }

  async function loadApproval() {
    setApLoading(true);
    try {
      setPainel(adaptPainel(await getAprovacaoPainel(id)));
    } finally { setApLoading(false); }
  }

  /**
   * Era `console.log("Concluir projeto")`. O CTA aparece justamente quando
   * tudo já foi aprovado — o momento em que a pessoa quer fechar — e não
   * fazia nada.
   */
  /** O modal edita a partir do formato do formulário, não do da API. */
  function paraEdicao(p: Projeto): ProjetoInitial {
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      status: p.status,
      orcamento: p.orcamento ?? 0,
      prazo: p.prazo ?? null,
      cliente_id: p.cliente?.id ?? null,
      equipe_id: p.equipe?.id ?? null,
    };
  }

  /**
   * Os três itens do menu "⋮" eram `console.log`. Duplicar e as transições de
   * status existem na API; "Exportar" não tem formato nem endpoint definidos
   * e saiu do menu.
   */
  async function mudarStatus(status: Projeto["status"], recado: string) {
    if (!projeto) return;
    try {
      const atualizado = await updateProjeto(projeto.id, { status });
      setProjeto(atualizado);
      toast.success(recado);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível mudar o status do projeto.");
    }
  }

  async function duplicarProjeto() {
    if (!projeto) return;
    if (!projeto.cliente?.id) {
      toast.error("Este projeto não tem cliente, e um projeto novo precisa de um.");
      return;
    }
    try {
      /**
       * Nasce em andamento, como qualquer projeto criado pelo formulário.
       * RASCUNHO existe no banco, mas é o estado de quem está esperando o
       * cliente aceitar o convite — não é um rascunho que a designer escolhe,
       * e `validateProjetoInput` recusa esse valor de propósito.
       *
       * A cópia não leva o prazo: data de entrega é do trabalho anterior, e
       * herdá-la calada faria a tela nascer com um compromisso que ninguém
       * assumiu.
       */
      const copia = await createProjeto({
        nome: `${projeto.nome} (cópia)`,
        descricao: projeto.descricao ?? null,
        status: "EM_ANDAMENTO",
        orcamento: projeto.orcamento ?? 0,
        prazo: null,
        cliente_id: projeto.cliente.id,
        equipe_id: projeto.equipe?.id ?? null,
        skipBriefingEval: true,
      });
      toast.success("Projeto duplicado.");
      router.push(`/projetos/${copia.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível duplicar o projeto.");
    }
  }

  async function concluirProjeto() {
    if (!projeto) return;
    if (!confirm(`Concluir "${projeto.nome}"? Ele sai da lista de projetos em andamento.`)) return;
    try {
      const atualizado = await updateProjeto(projeto.id, { status: "CONCLUIDO" });
      setProjeto(atualizado);
      toast.success("Projeto concluído.");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível concluir o projeto.");
    }
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
    // O kanban sai de `loadOverview`, e a aba Tarefas é só ele: quem entrava
    // direto em `?tab=tasks` via três colunas vazias para sempre, porque nada
    // tinha buscado as tarefas.
    if ((tab === "overview" || tab === "tasks") && !resumo) loadOverview();
    // A aba de aprovação também depende das artes: é delas que sai a lista do
    // dialog de solicitar. Sem isso o botão nasce desabilitado para quem entra
    // direto nela.
    if ((tab === "artes" || tab === "approval") && artRows.length === 0) loadArtes(false);
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
        onEditar={() => setEditando(true)}
        onPessoas={() => setAcessosAberto(true)}
        onDuplicar={duplicarProjeto}
        onPausar={() => mudarStatus("PAUSADO", "Projeto pausado.")}
        onRetomar={() => mudarStatus("EM_ANDAMENTO", "Projeto retomado.")}
        onCancelar={() => {
          if (!confirm(`Cancelar "${projeto.nome}"? Cancelado é definitivo — não dá para retomar depois.`)) return;
          mudarStatus("CANCELADO", "Projeto cancelado.");
        }}
      />


      <ProjetoTabs current={tab} onChange={setTab} />

      <div className="pt-2 space-y-6">
        {tab === "overview" && (
          ovLoading || !resumo || !kanban ? (
            <OverviewSkeleton />
          ) : (
            <>
              {/*
                * A ordem responde três perguntas, nesta sequência: em que pé
                * está, o que eu faço agora, e o que os números dizem. Antes a
                * tela abria pelos números e escondia a ação no rodapé.
                */}
              <EstadoDoProjeto
                resumo={resumo}
                estado={resumo.estado ?? "CRIAR_ARTE"}
                onAction={() => {
                  if (resumo.estado === "CONCLUIR") concluirProjeto();
                  else if (resumo.estado === "PEDIR_APROVACAO") setTab("approval");
                  else setTab("artes");
                }}
              />

              {/* O kanban tem três colunas dentro: em metade da largura os
                  cartões ficam espremidos. */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_3fr]">
                <ProximosPassos
                  passos={passos}
                  onAction={passo => {
                    switch (passo.kind) {
                      // O prazo se define no mesmo modal do "Editar".
                      case "DEFINIR_PRAZO_PROJETO":
                      case "PRAZO":
                        setEditando(true);
                        break;
                      case "ENVIAR_APROVACAO":
                      case "LEMBRAR_APROVADORES":
                      case "CONVIDAR_APROVADOR":
                      case "APROVADOR":
                      case "APROVACAO":
                        setTab("approval");
                        break;
                      case "ATRIBUIR_TAREFA":
                      case "TAREFA":
                        setTab("tasks");
                        break;
                      default:
                        setTab("artes");
                    }
                  }}
                />
                <MicroKanban kanban={kanban} onAbrir={() => setTab("tasks")} />
              </div>

              <NumerosDoProjeto
                resumo={resumo}
                onDefinirPrazo={() => setEditando(true)}
                onEditarOrcamento={() => setEditando(true)}
              />
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
                  /*
                   * Os dois ícones existiam na lista e não eram ligados a
                   * nada — a página simplesmente não passava as funções, e o
                   * componente escondia o botão. Agora "nova versão" busca o
                   * detalhe (o diálogo precisa dele) e "solicitar aprovação"
                   * abre já com a arte escolhida.
                   */
                  onNovaVersao={async arteId => {
                    const detalhe = await getArteDetail(arteId);
                    if (!detalhe) { toast.error("Não foi possível abrir esta arte."); return; }
                    setArteVersao(detalhe);
                  }}
                  onPedirAprovacao={arteId => setArteAprovacao(arteId)}
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
              /* Mandava para a tela global de Tarefas — que agora redireciona,
                 e que mesmo antes tirava a pessoa do projeto que ela estava
                 lendo. O outro MicroKanban desta mesma tela já fazia certo. */
              onAbrir={() => setTab("tasks")}
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
              acoes={
                <SolicitarAprovacaoDialog
                  artes={artRows.map((a) => ({
                    id: a.id,
                    nome: a.nome,
                    versaoAtual: a.versao,
                  }))}
                  onSolicitado={loadApproval}
                />
              }
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
              /**
               * Antes isto era um `console.log`: o botão existia em toda linha
               * do feed e não levava a lugar nenhum. Cada tipo tem um destino
               * dentro do próprio projeto — a arte abre a gaveta de preview,
               * tarefa e aprovação trocam de aba.
               */
              onOpen={ref => {
                if (ref.kind === "arte") { setTab("artes"); setPeekId(ref.id); return; }
                if (ref.kind === "tarefa") { setTab("tasks"); return; }
                if (ref.kind === "aprovacao") { setTab("approval"); return; }
                if (ref.kind === "convite") router.push("/convites");
              }}
            />
          )
        )}

        {tab === "billing" && <FaturaTab projetoId={id} designerId={projeto?.designer?.id ?? null} />}
      </div>

      {arteVersao && (
        <NovaVersaoDialog
          open
          onOpenChange={v => !v && setArteVersao(null)}
          arte={arteVersao}
          onCreated={() => { setArteVersao(null); loadArtes(); }}
        />
      )}

      <SolicitarAprovacaoDialog
        artes={artRows.map(a => ({ id: a.id, nome: a.nome, versaoAtual: a.versao }))}
        arteInicial={arteAprovacao ?? undefined}
        aberto={!!arteAprovacao}
        onAbertoChange={v => !v && setArteAprovacao(null)}
        onSolicitado={() => { setArteAprovacao(null); loadApproval(); loadArtes(); }}
      />

      <ProjetoModal
        open={editando}
        onOpenChange={setEditando}
        initial={paraEdicao(projeto)}
        onSubmit={async (valores) => {
          const atualizado = await updateProjeto(projeto.id, valores);
          setProjeto(atualizado);
          setEditando(false);
          toast.success("Projeto atualizado.");
          // O resumo carrega prazo e orçamento: sem recarregar, a faixa de
          // números continuaria mostrando o valor antigo.
          loadOverview();
        }}
      />
    </div>
  );
}
