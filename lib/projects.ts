// src/lib/projects.ts
import { z } from "zod";
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
  prazo: string | null;     // ISO
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
  orcamento: number;         // R$ (não centavos)
  /** ISO string ou null (ex.: 2025-09-20T00:00:00.000Z) */
  prazo: string | null;
  /** FK obrigatória */
  cliente_id: string;
}

/* ===================== Helpers ===================== */
const isUuid = (v?: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);

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

/* ===================== (Opcional) Validação leve com zod ===================== */
const ProjetoInputSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(140, "Máx. 140 caracteres"),
  descricao: z.string().trim().max(2000, "Máx. 2000 caracteres").optional().nullable(),
  status: z.enum(["EM_ANDAMENTO", "CONCLUIDO", "PAUSADO"]),
  // orcamento em R$ vindo da UI (>= 0). Aceitamos 0 e inteiros/decimais.
  orcamento: z.number().min(0),
  // ISO string ou null (UI já converte date→ISO ou passa null)
  prazo: z.string().datetime().nullable(),
  // FK obrigatória (uuid)
  cliente_id: z.string().uuid("Selecione o cliente"),
});

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
  // validação leve
  const parsed = ProjetoInputSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e: { message: any; }) => e.message).join(" | "));
  }

  // auth → designer_id
  const { data: auth } = await supabase.auth.getUser();
  const designerId = auth?.user?.id;
  if (!designerId) throw new Error("Usuário não autenticado");

  // valida cliente_id (nunca enviar "")
  if (!isUuid(payload.cliente_id)) throw new Error("Selecione o cliente");

  // normalizações
  const descricao = payload.descricao && payload.descricao.trim().length > 0 ? payload.descricao.trim() : null;
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
  const toUpdate: Record<string, any> = {};

  if (patch.nome !== undefined) toUpdate.nome = patch.nome.trim();
  if (patch.descricao !== undefined) {
    toUpdate.descricao = patch.descricao && patch.descricao.trim().length > 0 ? patch.descricao.trim() : null;
  }
  if (patch.status !== undefined) toUpdate.status = patch.status;
  if (patch.prazo !== undefined) toUpdate.prazo = patch.prazo ?? null;
  if (patch.cliente_id !== undefined) {
    if (!isUuid(patch.cliente_id)) throw new Error("Selecione o cliente");
    toUpdate.cliente_id = patch.cliente_id;
  }
  if (patch.orcamento !== undefined) {
    toUpdate.orcamento = Number.isFinite(patch.orcamento)
      ? Math.round((patch.orcamento as number) * 100)
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
