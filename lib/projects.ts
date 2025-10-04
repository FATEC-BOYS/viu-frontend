// src/lib/projects.ts
import { supabase } from "@/lib/supabaseClient";

/* ===================== Tipos existentes ===================== */
export type ProjetoStatus = "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO";

/** Linha que a UI consome na listagem (orcamento em centavos) */
export interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  status: ProjetoStatus;
  orcamento: number | null; // centavos
  prazo: string | null; // ISO
  designer: { id: string; nome: string };
  cliente: { id: string; nome: string };
  criado_em: string; // ISO
  atualizado_em: string; // ISO
}

/** Payload que a **UI envia** para criar/editar (mais simples) */
export interface ProjetoInput {
  nome: string;
  descricao?: string | null;
  status: ProjetoStatus;
  /** valor em R$ (ex.: 123.45) */
  orcamento: number; // R$ (não centavos)
  /** ISO string ou null (ex.: 2025-09-20T00:00:00.000Z) */
  prazo: string | null;
  /** FK obrigatória (UUID do usuário cliente) */
  cliente_id: string;
}

/* ===================== Helpers ===================== */
const isUuid = (v?: string | null) =>
  !!v &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const isValidISO = (v: string) => !Number.isNaN(Date.parse(v));

/** Exibe BRL a partir de centavos (inteiro) */
export function formatBRLFromCents(cents: number | null): string {
  if (cents == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );
}

/** Converte texto (R$ 1.234,56) -> centavos (inteiro) */
export function parseBRLToCents(input: string): number | null {
  const onlyDigits = input.replace(/[^\d]/g, "");
  if (!onlyDigits) return null;
  const cents = parseInt(onlyDigits, 10);
  if (Number.isNaN(cents)) return null;
  return cents;
}

/* ===================== Validação leve (sem Zod) ===================== */
function validateProjetoInput(payload: ProjetoInput): string[] {
  const errs: string[] = [];

  const nome = (payload.nome ?? "").trim();
  if (!nome) errs.push("Informe o nome");
  if (nome.length > 140) errs.push("Máx. 140 caracteres no nome");

  if (payload.descricao != null) {
    const d = payload.descricao.trim();
    if (d.length > 2000) errs.push("Máx. 2000 caracteres na descrição");
  }

  if (!["EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"].includes(payload.status)) {
    errs.push("Status inválido");
  }

  if (
    typeof payload.orcamento !== "number" ||
    !Number.isFinite(payload.orcamento) ||
    payload.orcamento < 0
  ) {
    errs.push("Orçamento deve ser um número ≥ 0");
  }

  if (payload.prazo != null && !isValidISO(payload.prazo)) {
    errs.push("Prazo inválido (use ISO-8601)");
  }

  if (!isUuid(payload.cliente_id)) {
    errs.push("Selecione o cliente");
  }

  return errs;
}

function validateProjetoPatch(patch: Partial<ProjetoInput>): string[] {
  const errs: string[] = [];

  if (patch.nome !== undefined) {
    const n = patch.nome.trim();
    if (!n) errs.push("Informe o nome");
    if (n.length > 140) errs.push("Máx. 140 caracteres no nome");
  }

  if (patch.descricao !== undefined && patch.descricao != null) {
    const d = patch.descricao.trim();
    if (d.length > 2000) errs.push("Máx. 2000 caracteres na descrição");
  }

  if (patch.status !== undefined && !["EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"].includes(patch.status)) {
    errs.push("Status inválido");
  }

  if (patch.orcamento !== undefined) {
    if (
      typeof patch.orcamento !== "number" ||
      !Number.isFinite(patch.orcamento) ||
      patch.orcamento < 0
    ) {
      errs.push("Orçamento deve ser um número ≥ 0");
    }
  }

  if (patch.prazo !== undefined && patch.prazo != null && !isValidISO(patch.prazo)) {
    errs.push("Prazo inválido (use ISO-8601)");
  }

  if (patch.cliente_id !== undefined && !isUuid(patch.cliente_id)) {
    errs.push("Selecione o cliente");
  }

  return errs;
}

/* ===================== Data Access (Supabase) — existentes ===================== */
export async function listProjetos(params?: {
  search?: string;
  status?: ProjetoStatus | "todos";
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  offset?: number;
}) {
  const {
    search,
    status,
    orderBy = "criado_em",
    ascending = false,
    limit = 50,
    offset = 0,
  } = params || {};

  let query = supabase
    .from("projetos")
    .select(
      `
      id, nome, descricao, status, orcamento, prazo, criado_em, atualizado_em,
      designer:designer_id ( id, nome ),
      cliente:cliente_id ( id, nome )
    `,
      { count: "exact" }
    );

  if (status && status !== "todos") query = query.eq("status", status);
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`nome.ilike.${s},descricao.ilike.${s}`);
  }

  const { data, error, count } = await query
    .order(orderBy, { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { rows: (data ?? []) as unknown as Projeto[], count: count ?? 0 };
}

export async function getProjeto(id: string) {
  const { data, error } = await supabase
    .from("projetos")
    .select(
      `
      id, nome, descricao, status, orcamento, prazo, criado_em, atualizado_em,
      designer:designer_id ( id, nome ),
      cliente:cliente_id ( id, nome )
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as Projeto;
}

/** Cria um projeto a partir do payload da UI (R$ → centavos, obtém designer_id do auth) */
export async function createProjeto(payload: ProjetoInput) {
  const errs = validateProjetoInput(payload);
  if (errs.length) throw new Error(errs.join(" | "));

  const { data: auth } = await supabase.auth.getUser();
  const designerId = auth?.user?.id;
  if (!designerId) throw new Error("Usuário não autenticado");

  if (!isUuid(payload.cliente_id)) throw new Error("Selecione o cliente");

  const descricao =
    payload.descricao && payload.descricao.trim().length > 0 ? payload.descricao.trim() : null;
  const prazo = payload.prazo ?? null;
  const orcamentoCentavos = Number.isFinite(payload.orcamento)
    ? Math.round(payload.orcamento * 100)
    : null;

  const { data, error } = await supabase
    .from("projetos")
    .insert({
      nome: payload.nome.trim(),
      descricao,
      status: payload.status,
      orcamento: orcamentoCentavos,
      prazo,
      designer_id: designerId,
      cliente_id: payload.cliente_id,
    })
    .select(
      `
      id, nome, descricao, status, orcamento, prazo, criado_em, atualizado_em,
      designer:designer_id ( id, nome ),
      cliente:cliente_id ( id, nome )
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as Projeto;
}

/** Atualiza um projeto a partir do payload da UI (R$ → centavos quando vier) */
export async function updateProjeto(id: string, patch: Partial<ProjetoInput>) {
  type ProjetoDBUpdate = {
    nome?: string;
    descricao?: string | null;
    status?: ProjetoStatus;
    orcamento?: number | null;
    prazo?: string | null;
    cliente_id?: string;
  };
  const toUpdate: ProjetoDBUpdate = {};

  const errs = validateProjetoPatch(patch);
  if (errs.length) throw new Error(errs.join(" | "));

  if (patch.nome !== undefined) toUpdate.nome = patch.nome.trim();
  if (patch.descricao !== undefined) {
    toUpdate.descricao =
      patch.descricao && patch.descricao.trim().length > 0 ? patch.descricao.trim() : null;
  }
  if (patch.status !== undefined) toUpdate.status = patch.status;
  if (patch.prazo !== undefined) toUpdate.prazo = patch.prazo ?? null;
  if (patch.cliente_id !== undefined) {
    toUpdate.cliente_id = patch.cliente_id;
  }
  if (patch.orcamento !== undefined) {
    toUpdate.orcamento =
      typeof patch.orcamento === "number" && Number.isFinite(patch.orcamento)
        ? Math.round(patch.orcamento * 100)
        : null;
  }

  const { data, error } = await supabase
    .from("projetos")
    .update(toUpdate)
    .eq("id", id)
    .select(
      `
      id, nome, descricao, status, orcamento, prazo, criado_em, atualizado_em,
      designer:designer_id ( id, nome ),
      cliente:cliente_id ( id, nome )
    `
    )
    .single();

  if (error) throw error;
  return data as unknown as Projeto;
}

export async function deleteProjeto(id: string) {
  const { error } = await supabase.from("projetos").delete().eq("id", id);
  if (error) throw error;
  return true;
}

/* Combos legados (mantidos para compat) */
export async function listDesigners() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome")
    .eq("tipo", "DESIGNER")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listClientes() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome")
    .eq("tipo", "CLIENTE")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ===================== NOVO: Cabeçalho / Alertas ===================== */
export async function getProjetoCabecalho(id: string): Promise<Projeto> {
  return getProjeto(id);
}

/* ===================== NOVO: Visão Geral ===================== */
export interface ProjetoResumo {
  artesAprovadas: number;
  artesPendentes: number;
  artesRejeitadas: number;
  artesTotal: number;
  prazoProjeto: string | null;
  proximaRevisao: string | null;
  orcamentoCentavos: number | null;
  pessoas: { designers: number; clientes: number; aprovadores: number; observadores: number };
  sparkline: Array<{ dia: string; qtd: number }>;
}

export async function getProjetoResumo(id: string): Promise<ProjetoResumo> {
  // contagens de artes
  const { data: r } = await supabase
    .from("v_resumo_artes")
    .select("*")
    .eq("projeto_id", id)
    .maybeSingle();

  // prazo & orçamento
  const { data: p } = await supabase
    .from("projetos")
    .select("prazo, orcamento")
    .eq("id", id)
    .single();

  // próxima revisão (menor prazo de tarefa aberta)
  const { data: prox } = await supabase
    .from("tarefas")
    .select("prazo")
    .eq("projeto_id", id)
    .neq("status", "CONCLUIDA")
    .not("prazo", "is", null)
    .order("prazo", { ascending: true })
    .limit(1);

  // participantes contagem
  const { data: part } = await supabase
    .from("v_participantes_contagem")
    .select("*")
    .eq("projeto_id", id)
    .maybeSingle();

  // sparkline últimos 30 dias
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { data: spark } = await supabase
    .from("v_artes_aprovadas_por_dia")
    .select("dia, qtd")
    .eq("projeto_id", id)
    .gte("dia", since.toISOString().slice(0, 10))
    .order("dia", { ascending: true });

  return {
    artesAprovadas: r?.artes_aprovadas ?? 0,
    artesPendentes: r?.artes_pendentes ?? 0,
    artesRejeitadas: r?.artes_rejeitadas ?? 0,
    artesTotal: r?.artes_total ?? 0,
    prazoProjeto: p?.prazo ?? null,
    proximaRevisao: prox?.[0]?.prazo ?? null,
    orcamentoCentavos: p?.orcamento ?? null,
    pessoas: {
      designers: part?.designers_qtd ?? 1, // ao menos o owner
      clientes: part?.clientes_qtd ?? 1, // ao menos o cliente principal
      aprovadores: part?.aprovadores_qtd ?? 0,
      observadores: part?.observadores_qtd ?? 0,
    },
    sparkline: (spark ?? []).map((d: any) => ({
      dia: typeof d.dia === "string" ? d.dia : new Date(d.dia).toISOString().slice(0, 10),
      qtd: d.qtd as number,
    })),
  };
}

/* ===================== NOVO: Próximos Passos ===================== */
/** union inclui aliases simples da UI e os verbosos do backend */
export type ProximoPassoKind =
  | "GENERIC"
  | "APROVADOR"
  | "PRAZO"
  | "TAREFA"
  | "APROVACAO"
  | "ENVIAR_APROVACAO"
  | "DEFINIR_PRAZO_PROJETO"
  | "ATRIBUIR_TAREFA"
  | "CONVIDAR_APROVADOR"
  | "LEMBRAR_APROVADORES";

export interface ProximoPasso {
  tipo?: string; // opcional — a UI usa adapters; mantém p/ compat
  kind: ProximoPassoKind;
  label: string;
  meta?: Record<string, any>;
  done?: boolean;
}

export async function getProximosPassos(id: string): Promise<ProximoPasso[]> {
  const passos: ProximoPasso[] = [];

  const [
    { data: proj },
    { data: tarefasAbertas },
    { data: aprovadores },
    { data: artesPendentes },
    { data: aprovsPendentes },
  ] = await Promise.all([
    supabase.from("projetos").select("id,prazo").eq("id", id).single(),
    supabase
      .from("tarefas")
      .select("id,titulo,responsavel_id")
      .eq("projeto_id", id)
      .neq("status", "CONCLUIDA")
      .limit(5),
    supabase
      .from("projeto_participantes")
      .select("usuario_id")
      .eq("projeto_id", id)
      .eq("papel", "APROVADOR"),
    supabase
      .from("artes")
      .select("id,nome,status")
      .eq("projeto_id", id)
      .in("status", ["EM_ANALISE", "PENDENTE"])
      .limit(5),
    supabase
      .from("aprovacoes")
      .select("id,status,criado_em,arte_id")
      .eq("status", "PENDENTE")
      .order("criado_em", { ascending: true }),
  ]);

  if (!proj?.prazo) {
    passos.push({ kind: "DEFINIR_PRAZO_PROJETO", label: "Definir prazo do projeto" });
  }

  const primeiraSemResponsavel = (tarefasAbertas ?? []).find((t: any) => !t.responsavel_id);
  if (primeiraSemResponsavel) {
    passos.push({
      kind: "ATRIBUIR_TAREFA",
      label: `Atribuir responsável para “${primeiraSemResponsavel.titulo}”`,
      meta: { tarefaId: primeiraSemResponsavel.id },
    });
  }

  if ((aprovadores ?? []).length === 0) {
    passos.push({ kind: "CONVIDAR_APROVADOR", label: "Convidar aprovador (nenhum marcado)" });
  }

  if ((artesPendentes ?? []).length > 0) {
    const a = artesPendentes![0];
    passos.push({
      kind: "ENVIAR_APROVACAO",
      label: `Enviar para aprovação: “${a.nome}”`,
      meta: { arteId: a.id },
    });
  }

  // Se houver aprovação pendente antiga (SLA simples: > 3 dias)
  const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
  const antiga = (aprovsPendentes ?? []).find(
    (ap: any) => Date.now() - new Date(ap.criado_em).getTime() > tresDiasMs && ap.arte_id
  );
  if (antiga) {
    passos.push({
      kind: "LEMBRAR_APROVADORES",
      label: "Lembrar aprovadores (pendência antiga)",
      meta: { aprovacaoId: antiga.id },
    });
  }

  return passos;
}

/* ===================== NOVO: Artes (lista densa + Quick Peek) ===================== */
export interface ArteListItem {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  versao: number;
  status: string;
  criado_em: string;
  autor_nome: string | null;
  versoes_qtd: number;
  tags?: string[];
}

export interface ArteFilters {
  tipo?: string | null;
  status?: string | null;
  autorId?: string | null;
  tag?: string | null;
  limit?: number;
  offset?: number;
}

export async function listArtes(
  projetoId: string,
  filters?: ArteFilters
): Promise<{ rows: ArteListItem[]; count: number }> {
  const { tipo, status, autorId, tag, limit = 12, offset = 0 } = filters || {};

  let query = supabase
    .from("artes")
    .select(
      `
      id, nome, descricao, tipo, versao, status, criado_em,
      autor:autor_id ( nome ),
      versoes_qtd:arte_versoes(count),
      tags:arte_tags(tag)
    `,
      { count: "exact" }
    )
    .eq("projeto_id", projetoId)
    .order("criado_em", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  if (status) query = query.eq("status", status);
  if (autorId) query = query.eq("autor_id", autorId);
  if (tag) query = query.contains("tags", [{ tag } as any]); // se a view não suportar, trocar por RPC

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const rows: ArteListItem[] = (data ?? []).map((a: any) => ({
    id: a.id,
    nome: a.nome,
    descricao: a.descricao ?? null,
    tipo: a.tipo,
    versao: a.versao,
    status: a.status,
    criado_em: a.criado_em,
    autor_nome: a.autor?.nome ?? null,
    versoes_qtd: Array.isArray(a.versoes_qtd) ? a.versoes_qtd[0]?.count ?? 1 : 1,
    tags: Array.isArray(a.tags) ? a.tags.map((t: any) => t.tag) : [],
  }));

  return { rows, count: count ?? rows.length };
}

export interface ArteQuickPeek {
  arte: {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: string;
    versao: number;
    status: string;
    criado_em: string;
  };
  versoes: Array<{ id: string; versao: number; status: string; criado_em: string }>;
  feedbacks: Array<{ id: string; conteudo: string; autor_id: string; criado_em: string }>;
}

export async function getArteQuickPeek(arteId: string): Promise<ArteQuickPeek> {
  const [{ data: a, error: e1 }, { data: vs, error: e2 }, { data: fbs, error: e3 }] =
    await Promise.all([
      supabase
        .from("artes")
        .select("id,nome,descricao,tipo,versao,status,criado_em")
        .eq("id", arteId)
        .single(),
      supabase
        .from("arte_versoes")
        .select("id,versao,status,criado_em")
        .eq("arte_id", arteId)
        .order("versao", { ascending: false }),
      supabase
        .from("feedbacks")
        .select("id,conteudo,autor_id,criado_em")
        .eq("arte_id", arteId)
        .order("criado_em", { ascending: false })
        .limit(20),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  return {
    arte: a as any,
    versoes: (vs ?? []) as any,
    feedbacks: (fbs ?? []) as any,
  };
}

/* ===================== NOVO: Tarefas (micro-kanban) ===================== */
export type TarefaStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export interface TarefaCard {
  id: string;
  titulo: string;
  status: TarefaStatus;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  prazo: string | null;
  responsavel_nome: string | null;
}
export interface TarefasKanban {
  pendente: { top: TarefaCard[]; total: number };
  em_andamento: { top: TarefaCard[]; total: number };
  concluida: { top: TarefaCard[]; total: number };
}

async function fetchKanbanCol(projetoId: string, status: TarefaStatus) {
  const [{ data: top, error: e1 }, { count, error: e2 }] = await Promise.all([
    supabase
      .from("tarefas")
      .select(
        `
        id, titulo, status, prioridade, prazo,
        responsavel:responsavel_id ( nome )
      `
      )
      .eq("projeto_id", projetoId)
      .eq("status", status)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .limit(3),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("projeto_id", projetoId)
      .eq("status", status),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const mapped: TarefaCard[] = (top ?? []).map((t: any) => ({
    id: t.id,
    titulo: t.titulo,
    status: t.status,
    prioridade: t.prioridade,
    prazo: t.prazo ?? null,
    responsavel_nome: t.responsavel?.nome ?? null,
  }));
  return { top: mapped, total: count ?? mapped.length };
}

export async function getTarefasKanban(projetoId: string): Promise<TarefasKanban> {
  const [p, e, c] = await Promise.all([
    fetchKanbanCol(projetoId, "PENDENTE"),
    fetchKanbanCol(projetoId, "EM_ANDAMENTO"),
    fetchKanbanCol(projetoId, "CONCLUIDA"),
  ]);
  return { pendente: p, em_andamento: e, concluida: c };
}

/* ===================== NOVO: Aprovação (semáforo) ===================== */
export interface AprovadorEstado {
  aprovacao_id: string;
  aprovador_nome: string | null;
  status: "PENDENTE" | "APROVADO" | "REJEITADO";
  criado_em: string;
  arte_id: string;
  arte_nome: string | null;
  versao: number;
}
export interface AprovacaoPainel {
  regra: { todosAprovadores: boolean; exigirAprovacaoDesigner: boolean; prazoDias: number | null };
  estados: AprovadorEstado[];
}

export async function getAprovacaoPainel(projetoId: string): Promise<AprovacaoPainel> {
  const { data: artes } = await supabase
    .from("artes")
    .select("id")
    .eq("projeto_id", projetoId);

  const arteIds = (artes ?? []).map((a: any) => a.id);
  if (arteIds.length === 0) {
    return {
      regra: { todosAprovadores: false, exigirAprovacaoDesigner: false, prazoDias: null },
      estados: [],
    };
  }

  // última versão por arte
  const { data: ult } = await supabase
    .from("arte_versoes")
    .select("arte_id, versao")
    .in("arte_id", arteIds);

  const latestByArte = new Map<string, number>();
  (ult ?? []).forEach((r: any) => {
    latestByArte.set(r.arte_id, Math.max(latestByArte.get(r.arte_id) ?? 0, r.versao));
  });

  const { data: aprov } = await supabase
    .from("aprovacoes")
    .select(
      `
      id, status, criado_em, arte_id, aprovador:aprovador_id ( nome ), arte:arte_id ( id, nome ), arte_versao_id
    `
    )
    .in("arte_id", arteIds);

  const { data: versoes } = await supabase
    .from("arte_versoes")
    .select("id, arte_id, versao");

  const vmap = new Map<string, { arte_id: string; versao: number }>();
  (versoes ?? []).forEach((v: any) => vmap.set(v.id, { arte_id: v.arte_id, versao: v.versao }));

  const estados: AprovadorEstado[] = (aprov ?? [])
    .map((a: any) => {
      const v = vmap.get(a.arte_versao_id);
      return {
        aprovacao_id: a.id,
        aprovador_nome: a.aprovador?.nome ?? null,
        status: a.status as any,
        criado_em: a.criado_em,
        arte_id: a.arte?.id ?? (v?.arte_id ?? ""),
        arte_nome: a.arte?.nome ?? null,
        versao: v?.versao ?? 0,
      };
    })
    .filter((e) => latestByArte.get(e.arte_id) === e.versao);

  const regra = { todosAprovadores: false, exigirAprovacaoDesigner: false, prazoDias: null };
  return { regra, estados };
}

export async function lembrarAprovadores(aprovacaoId: string): Promise<{ ok: true }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Não autenticado");

  const { data: ap } = await supabase
    .from("aprovacoes")
    .select("id, aprovador_id")
    .eq("id", aprovacaoId)
    .single();

  if (!ap) throw new Error("Aprovação não encontrada");

  const { error } = await supabase
    .from("aprovacao_lembretes")
    .insert({
      aprovacao_id: aprovacaoId,
      enviado_por: userId,
      enviado_para: ap.aprovador_id,
    });

  if (error) throw error;
  return { ok: true };
}

/* ===================== NOVO: Atividade (feed) ===================== */
export type AtividadeTipo =
  | "ARTE_CRIADA"
  | "ARTE_VERSAO"
  | "FEEDBACK"
  | "TAREFA_CRIADA"
  | "APROVACAO"
  | "CONVITE";

export interface AtividadeItem {
  tipo: AtividadeTipo;
  ref_id: string;
  titulo: string;
  autor_id: string | null;
  criado_em: string;
  texto: string | null;
}

export async function listAtividade(
  projetoId: string,
  params?: { limit?: number; offset?: number }
): Promise<{ rows: AtividadeItem[]; count: number }> {
  const limit = params?.limit ?? 20;
  const offset = params?.offset ?? 0;

  const { data, error, count } = await supabase
    .from("v_projeto_atividade")
    .select("*", { count: "exact" })
    .eq("projeto_id", projetoId)
    .order("criado_em", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { rows: [], count: 0 };
  }

  const rows: AtividadeItem[] = (data ?? []).map((r: any) => ({
    tipo: r.tipo,
    ref_id: r.ref_id,
    titulo: r.titulo,
    autor_id: r.autor_id ?? null,
    criado_em: r.criado_em,
    texto: r.texto ?? null,
  }));

  return { rows, count: count ?? rows.length };
}

/* ===================== NOVO: Equipe & Acesso ===================== */
export interface Participante {
  usuario_id: string;
  papel: "OWNER" | "DESIGNER" | "CLIENTE" | "APROVADOR" | "OBSERVADOR";
  nome: string;
  email: string;
}
export interface ConviteRow {
  email: string;
  papel: "DESIGNER" | "CLIENTE" | "APROVADOR" | "OBSERVADOR";
  status: "PENDENTE" | "ACEITO" | "EXPIRADO";
  criado_em: string;
}

export async function listParticipantes(projetoId: string): Promise<Participante[]> {
  const { data, error } = await supabase
    .from("projeto_participantes")
    .select(
      `
      usuario_id, papel,
      usuario:usuario_id ( nome, email )
    `
    )
    .eq("projeto_id", projetoId)
    .order("papel", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    usuario_id: r.usuario_id,
    papel: r.papel,
    nome: r.usuario?.nome ?? "",
    email: r.usuario?.email ?? "",
  }));
}

export async function listConvites(projetoId: string): Promise<ConviteRow[]> {
  const { data, error } = await supabase
    .from("convites")
    .select("email, papel, status, criado_em")
    .eq("projeto_id", projetoId)
    .order("criado_em", { ascending: false });

  if (error) {
    return [];
  }
  return (data ?? []) as any;
}

/* ===================== NOVO: Narrativa (linha clicável) ===================== */
export async function getNarrativaContagens(
  projetoId: string
): Promise<{
  artesTotal: number;
  artesAprovadas: number;
  artesPendentes: number;
  tarefasUrgentes: number;
  aprovacoesVencendoHoje: number;
}> {
  const [{ data: r }, { count: urg }, { data: aprovs }] = await Promise.all([
    supabase.from("v_resumo_artes").select("*").eq("projeto_id", projetoId).maybeSingle(),
    supabase
      .from("tarefas")
      .select("id", { count: "exact", head: true })
      .eq("projeto_id", projetoId)
      .neq("status", "CONCLUIDA")
      .lte("prazo", new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from("aprovacoes").select("id,criado_em,status,arte:arte_id(projeto_id)"),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const aprovacoesVencendoHoje = (aprovs ?? []).filter((a: any) => {
    if (a.arte?.projeto_id !== projetoId) return false;
    if (a.status !== "PENDENTE") return false;
    return (a.criado_em ?? "").slice(0, 10) === hoje;
  }).length;

  return {
    artesTotal: r?.artes_total ?? 0,
    artesAprovadas: r?.artes_aprovadas ?? 0,
    artesPendentes: r?.artes_pendentes ?? 0,
    tarefasUrgentes: urg ?? 0,
    aprovacoesVencendoHoje,
  };
}

export async function getProjetoAlertas(
  projetoId: string
): Promise<{ prazosSemana: number; aprovacaoTravada: number; semAprovador: boolean }> {
  const now = new Date();
  const in7 = new Date(now);
  in7.setDate(now.getDate() + 7);

  let prazosSemana = 0;
  let aprovacaoTravada = 0;
  let semAprovador = false;

  try {
    // 1) Tarefas com prazo nos próximos 7 dias (pendente / em andamento)
    const { data: tarefas, error: tErr } = await supabase
      .from("tarefas")
      .select("id, prazo, status")
      .eq("projeto_id", projetoId)
      .in("status", ["PENDENTE", "EM_ANDAMENTO"]);
    if (!tErr && Array.isArray(tarefas)) {
      prazosSemana = tarefas.filter((t: any) => {
        if (!t.prazo) return false;
        const d = new Date(t.prazo).getTime();
        return d >= now.getTime() && d <= in7.getTime();
      }).length;
    }

    // 2) Aprovações pendentes há > 5 dias (por artes do projeto)
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);

    const { data: aprovs, error: aErr } = await supabase
      .from("aprovacoes")
      .select(
        `
        id, status, criado_em,
        arte:arte_id ( id, projeto_id )
      `
      )
      .eq("status", "PENDENTE")
      .eq("arte.projeto_id", projetoId);
    if (!aErr && Array.isArray(aprovs)) {
      aprovacaoTravada = aprovs.filter((r: any) => new Date(r.criado_em) < fiveDaysAgo).length;
    }

    // 3) Existe alguém com papel APROVADOR no projeto?
    try {
      const { data: parts, error: pErr } = await supabase
        .from("projeto_participantes")
        .select("id")
        .eq("projeto_id", projetoId)
        .eq("papel", "APROVADOR")
        .limit(1);
      if (!pErr) semAprovador = (parts ?? []).length === 0;
    } catch {
      semAprovador = false;
    }
  } catch {
    // mantemos zeros/false silenciosamente
  }

  return { prazosSemana, aprovacaoTravada, semAprovador };
}
