// lib/artes.ts
import { supabase } from "./supabaseClient";

/** ---------- TYPES ---------- */
export type ArteStatus =
  | "EM_ANALISE"
  | "APROVADO"
  | "REJEITADO"
  | "PENDENTE"
  | "RASCUNHO";

export type ArteOverview = {
  id: string;
  nome: string;
  descricao?: string | null;
  status: ArteStatus;
  versao: number;
  tipo: string;
  tamanho: number;
  projeto_id: string;
  autor_id: string;
  arquivo: string;
  criado_em: string;
  atualizado_em: string;

  // joins (virão apenas quando RLS permitir)
  projeto?: {
    id: string;
    nome: string;
    cliente?: { id: string; nome: string } | null;
  } | null;
  autor?: { id: string; nome: string } | null;

  // campos "achatados" para a página
  projeto_nome?: string | null;
  cliente_nome?: string | null;
  autor_nome?: string | null;

  // métricas rápidas para a lista
  feedbacks_count?: number;         // total de feedbacks vinculados
  tem_aprovacao_aprovada?: boolean; // existe alguma aprovação "APROVADO"
};

export type ArteDetail = {
  id: string;
  nome: string;
  descricao?: string | null;
  arquivo: string; // path no storage
  tipo: string;
  tamanho: number;
  versao: number;
  status: ArteStatus;
  projeto_id: string;
  autor_id: string;
  criado_em: string;
  atualizado_em: string;
  largura_px?: number | null;
  altura_px?: number | null;

  projeto?: {
    id: string;
    nome: string;
    cliente?: { id: string; nome: string } | null;
  } | null;
  autor?: { id: string; nome: string; avatar?: string | null } | null;

  feedbacks?: Array<any>;
  tarefas?: Array<any>;
  aprovacoes?: Array<any>;
};

export type VersaoGroup = {
  versao: number;
  arquivos: Array<{
    id: string;
    kind: "PREVIEW" | "FONTE" | "ANEXO";
    arquivo: string;
    mime?: string | null;
    tamanho?: number | null;
    criado_em?: string | null;
  }>;
  criado_em?: string | null;
};

type ListArtesParams = {
  q?: string;
  status?: ArteStatus | "todos";
  tipo?: string | "todos";
  projeto?: string; // nome do projeto
  cliente?: string;
  autor?: string;
  orderBy?: "criado_em" | "nome" | "projeto" | "versao" | "tamanho";
  page?: number;
  pageSize?: number;
};

/** ---------- LISTAGEM (overview) ---------- */
export async function listArtesOverview({
  q: searchTerm,
  status,
  tipo,
  projeto: projetoFilter,
  cliente: clienteFilter,
  autor: autorFilter,
  orderBy = "criado_em",
  page = 1,
  pageSize = 24,
}: ListArtesParams = {}): Promise<{ data: ArteOverview[]; count: number }> {
  // 1) SELECT base respeitando RLS: use !inner nos relacionamentos
  //    Assim, só vem arte/projeto/cliente/autor que você PODE ler.
 let q = supabase
  .from("artes")
  .select(
    `
    id, nome, descricao, status, versao, tipo, tamanho,
    projeto_id, autor_id, arquivo, criado_em, atualizado_em,

    projeto:projetos!artes_projeto_id_fkey!inner (
      id, nome,
      cliente:usuarios!projetos_cliente_id_fkey!inner ( id, nome )
    ),

    autor:usuarios!artes_autor_id_fkey!inner ( id, nome )
  `,
    { count: "exact" }
  );

  // 2) Filtros suportados no backend
  if (searchTerm && searchTerm.trim()) {
    q = q.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`);
  }
  if (status && status !== "todos") q = q.eq("status", status);
  if (tipo && tipo !== "todos") q = q.eq("tipo", tipo);

  // 3) Ordenação suportada no backend
  //    Obs.: "projeto" não é suportado aqui (campo de join); se vier, caímos no default.
  const allowedOrder = new Set(["criado_em", "nome", "versao", "tamanho"]);
  if (allowedOrder.has(orderBy)) {
    q = q.order(orderBy as any, { ascending: false });
  } else {
    q = q.order("criado_em", { ascending: false });
  }

  // 4) Paginação
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  q = q.range(from, to);

  // 5) Execução
const { data, error, count } = await q;
if (error) {
  console.error("listArtesOverview select error", {
    message: (error as any)?.message,
    details: (error as any)?.details,
    hint: (error as any)?.hint,
    code: (error as any)?.code,
  });
  return { data: [], count: 0 }; // <- evita 500
}

  const artes = (data ?? []) as any[];
  const ids = artes.map((a) => a.id) as string[];

  // 6) Agregados em lote (feedbacks_count e aprovados)
  let feedbacksByArte = new Map<string, number>();
  let aprovadosSet = new Set<string>();

  if (ids.length) {
    const { data: fbRows, error: fbErr } = await supabase
      .from("feedbacks")
      .select("id, arte_id")
      .in("arte_id", ids);
    if (!fbErr && fbRows) {
      for (const r of fbRows as any[]) {
        feedbacksByArte.set(r.arte_id, (feedbacksByArte.get(r.arte_id) ?? 0) + 1);
      }
    }

    const { data: apRows, error: apErr } = await supabase
      .from("aprovacoes")
      .select("arte_id, status")
      .in("arte_id", ids)
      .eq("status", "APROVADO");
    if (!apErr && apRows) {
      for (const r of apRows as any[]) aprovadosSet.add(r.arte_id);
    }
  }

  // 7) Achatar campos + anexar métricas
  let items: ArteOverview[] = artes.map((a) => ({
    ...a,
    projeto_nome: a?.projeto?.nome ?? null,
    cliente_nome: a?.projeto?.cliente?.nome ?? null,
    autor_nome: a?.autor?.nome ?? null,
    feedbacks_count: feedbacksByArte.get(a.id) ?? 0,
    tem_aprovacao_aprovada: aprovadosSet.has(a.id),
  }));

  // 8) Filtros por NOME (projeto/cliente/autor) — client-side (pós-fetch)
  if (projetoFilter && projetoFilter !== "todos") {
    const pf = projetoFilter.toLowerCase();
    items = items.filter((a) => (a.projeto_nome || "").toLowerCase() === pf);
  }
  if (clienteFilter && clienteFilter !== "todos") {
    const cf = clienteFilter.toLowerCase();
    items = items.filter((a) => (a.cliente_nome || "").toLowerCase() === cf);
  }
  if (autorFilter && autorFilter !== "todos") {
    const af = autorFilter.toLowerCase();
    items = items.filter((a) => (a.autor_nome || "").toLowerCase() === af);
  }

  // 9) Count efetivo (após filtros de nome)
  const effectiveCount = items.length;

  return { data: items, count: effectiveCount ?? count ?? 0 };
}

/** ---------- DETALHE ---------- */
export async function getArteDetail(arteId: string): Promise<ArteDetail | null> {
  const { data, error } = await supabase
    .from("artes")
    .select("*")
    .eq("id", arteId)
    .single();

  if (error) {
    console.error("getArteDetail", error);
    return null;
  }
  return data as unknown as ArteDetail;
}

/** ---------- UPDATE METADADOS (sem tocar em arquivo/tamanho) ---------- */
export async function updateArteMetadata(
  arteId: string,
  payload: {
    nome?: string;
    descricao?: string | null;
    tipo?: string;
    status?: ArteStatus;
    projetoId?: string | null;
  }
) {
  const update: Record<string, any> = { atualizado_em: new Date().toISOString() };
  if (payload.nome !== undefined) update.nome = payload.nome;
  if (payload.descricao !== undefined) update.descricao = payload.descricao;
  if (payload.tipo !== undefined) update.tipo = payload.tipo;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.projetoId !== undefined) update.projeto_id = payload.projetoId;

  const { error } = await supabase.from("artes").update(update).eq("id", arteId);
  if (error) throw error;
}

/** ---------- EXCLUSÃO ---------- */
export async function deleteArteById(arteId: string, p0?: { storageMode: string }) {
  const { data: arte } = await supabase
    .from("artes")
    .select("arquivo")
    .eq("id", arteId)
    .single();

  // Dependentes (ajuste se tiver CASCADE ou policies)
  await supabase.from("arte_arquivos").delete().eq("arte_id", arteId);
  await supabase.from("feedbacks").delete().eq("arte_id", arteId);
  await supabase.from("aprovacoes").delete().eq("arte_id", arteId);
  await supabase.from("tarefas").update({ arte_id: null }).eq("arte_id", arteId);

  const { error } = await supabase.from("artes").delete().eq("id", arteId);
  if (error) throw error;

  // opcional: remover do storage
  if (arte?.arquivo) {
    try {
      const bucket = "artes";
      await supabase.storage.from(bucket).remove([arte.arquivo]);
    } catch {
      /* ignore */
    }
  }
}

/** ---------- NOVA VERSÃO (upload + incrementa versao) ---------- */
export async function createNovaVersao(params: {
  arteId: string;
  file: File;
  mime?: string;
  largura_px?: number | null;
  altura_px?: number | null;
  novoNomeOpcional?: string;
}) {
  const { data: arte, error: e1 } = await supabase
    .from("artes")
    .select("versao, nome")
    .eq("id", params.arteId)
    .single();
  if (e1) throw e1;

  const newVersao = (arte?.versao ?? 1) + 1;
  const bucket = "artes";
  const filename = params.file.name;
  const path = `${params.arteId}/${newVersao}/${filename}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, params.file, {
    contentType: params.mime ?? params.file.type,
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error: e2 } = await supabase.from("arte_arquivos").insert({
    arte_id: params.arteId,
    versao: newVersao,
    kind: "FONTE",
    arquivo: path,
    mime: params.mime ?? params.file.type,
    tamanho: params.file.size,
    largura_px: params.largura_px ?? null,
    altura_px: params.altura_px ?? null,
  });
  if (e2) throw e2;

  const upd: Record<string, any> = {
    arquivo: path,
    tipo: params.mime ?? params.file.type,
    tamanho: params.file.size,
    versao: newVersao,
    atualizado_em: new Date().toISOString(),
  };
  if (params.novoNomeOpcional) upd.nome = params.novoNomeOpcional;

  const { error: e3 } = await supabase.from("artes").update(upd).eq("id", params.arteId);
  if (e3) throw e3;

  return { versao: newVersao, path };
}

/** ---------- HISTÓRICO DE VERSÕES ---------- */
export async function listVersoes(arteId: string): Promise<VersaoGroup[]> {
  const { data, error } = await supabase
    .from("arte_arquivos")
    .select("id, versao, kind, arquivo, mime, tamanho, criado_em")
    .eq("arte_id", arteId)
    .order("versao", { ascending: false })
    .order("criado_em", { ascending: true });

  if (error) throw error;

  const groups = new Map<number, VersaoGroup>();
  (data ?? []).forEach((row: any) => {
    if (!groups.has(row.versao)) {
      groups.set(row.versao, {
        versao: row.versao,
        arquivos: [],
        criado_em: row.criado_em ?? null,
      });
    }
    const g = groups.get(row.versao)!;
    g.arquivos.push({
      id: row.id,
      kind: row.kind,
      arquivo: row.arquivo,
      mime: row.mime,
      tamanho: row.tamanho,
      criado_em: row.criado_em,
    });
    if (!g.criado_em && row.criado_em) g.criado_em = row.criado_em;
  });

  return Array.from(groups.values()).sort((a, b) => b.versao - a.versao);
}
