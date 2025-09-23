import { supabase } from "@/lib/supabaseClient";

/** === Tipos (overview da view) === */
export type ArteOverview = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  tamanho: number;
  versao: number;
  criado_em: string;
  atualizado_em: string;
  arquivo: string; // vem da view arte_overview (a.arquivo as arquivo)
  projeto_id: string;
  projeto_nome: string;
  cliente_id: string;
  cliente_nome: string;
  autor_id: string;
  autor_nome: string;
  feedbacks_count: number;
  tarefas_count: number;
  aprovacoes_count: number;
  tem_aprovacao_aprovada: boolean;
};

/** === Tipos (detalhe usado no Quick Look) === */
export type ArteDetail = {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo: string;
  tipo: string;
  tamanho: number;
  versao: number;
  status: string;
  criado_em: string;
  atualizado_em: string;
  projeto: { id: string; nome: string; cliente: { id: string; nome: string } };
  autor: { id: string; nome: string };
  feedbacks: Array<{
    id: string;
    conteudo: string;
    tipo: string;
    criado_em: string;
    autor: { id: string; nome: string };
  }>;
  tarefas: Array<{
    id: string;
    titulo: string;
    status: string;
    prazo: string | null;
    responsavel: { id: string; nome: string };
  }>;
  aprovacoes: Array<{
    id: string;
    status: string;
    comentario: string | null;
    criado_em: string;
    aprovador: { id: string; nome: string };
  }>;
};

/** === Lista (VIEW arte_overview) com filtros e paginação === */
export async function listArtesOverview(params: {
  q?: string;
  status?: string;
  tipo?: string;
  projeto?: string;
  cliente?: string;
  autor?: string;
  orderBy?: "criado_em" | "nome" | "projeto" | "versao" | "tamanho";
  ascending?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 24;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("arte_overview").select("*", { count: "exact" });

  if (params.status && params.status !== "todos") query = query.eq("status", params.status);
  if (params.tipo && params.tipo !== "todos") query = query.eq("tipo", params.tipo);
  if (params.projeto && params.projeto !== "todos") query = query.ilike("projeto_nome", params.projeto);
  if (params.cliente && params.cliente !== "todos") query = query.ilike("cliente_nome", params.cliente);
  if (params.autor && params.autor !== "todos") query = query.ilike("autor_nome", params.autor);

  if (params.q) {
    const q = `%${params.q}%`;
    query = query.or(`nome.ilike.${q},projeto_nome.ilike.${q},cliente_nome.ilike.${q}`);
  }

  const orderMap: Record<string, string> = {
    criado_em: "criado_em",
    nome: "nome",
    projeto: "projeto_nome",
    versao: "versao",
    tamanho: "tamanho",
  };
  const orderCol = orderMap[params.orderBy || "criado_em"];
  query = query.order(orderCol, { ascending: !!params.ascending });

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  return { data: (data as ArteOverview[]) || [], count: count || 0, page, pageSize };
}

/** === Detalhe (carregado no Quick Look) === */
export async function getArteDetail(id: string): Promise<ArteDetail> {
  const { data, error } = await supabase
    .from("artes")
    .select(`
      id, nome, descricao, arquivo, tipo, tamanho, versao, status, criado_em, atualizado_em,
      projeto:projeto_id (
        id, nome,
        cliente:cliente_id ( id, nome )
      ),
      autor:autor_id ( id, nome ),
      feedbacks (
        id, conteudo, tipo, criado_em,
        autor:autor_id ( id, nome )
      ),
      tarefas (
        id, titulo, status, prazo,
        responsavel:responsavel_id ( id, nome )
      ),
      aprovacoes (
        id, status, comentario, criado_em,
        aprovador:aprovador_id ( id, nome )
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as ArteDetail;
}
