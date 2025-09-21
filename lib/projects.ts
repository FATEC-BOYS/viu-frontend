// src/lib/projects.ts
import { supabase } from "@/lib/supabaseClient";

/* ===================== Tipos ===================== */
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
  /** FK obrigatória */
  cliente_id: string;
}

/* ===================== Helpers ===================== */
const isUuid = (v?: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);
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

  if (typeof payload.orcamento !== "number" || !Number.isFinite(payload.orcamento) || payload.orcamento < 0) {
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
    if (typeof patch.orcamento !== "number" || !Number.isFinite(patch.orcamento) || patch.orcamento < 0) {
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

/* ===================== Data Access (Supabase) ===================== */
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
    // nome + descricao (simples)
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
  // validação leve (sem Zod)
  const errs = validateProjetoInput(payload);
  if (errs.length) throw new Error(errs.join(" | "));

  // auth → designer_id
  const { data: auth } = await supabase.auth.getUser();
  const designerId = auth?.user?.id;
  if (!designerId) throw new Error("Usuário não autenticado");

  // valida cliente_id (nunca enviar "")
  if (!isUuid(payload.cliente_id)) throw new Error("Selecione o cliente");

  // normalizações
  const descricao =
    payload.descricao && payload.descricao.trim().length > 0 ? payload.descricao.trim() : null;
  const prazo = payload.prazo ?? null;

  // R$ → centavos
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

/* Combos */
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
