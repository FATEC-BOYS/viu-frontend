// lib/feedbacks.ts
import { supabase } from "@/lib/supabaseClient";

export async function resolveLinkToken(token: string) {
  const { data, error } = await supabase.rpc("resolve_link_token", { p_token: token });
  if (error) throw error;
  return (data?.[0] ?? null) as {
    arte_id: string; arte_nome: string; arquivo: string; tipo: string; versao: number;
    projeto_id: string; projeto_nome: string; cliente_id: string; cliente_nome: string;
    expira_em: string | null; somente_leitura: boolean;
  } | null;
}

export async function insertFeedbackViaToken(params: {
  token: string;
  conteudo: string;
  tipo?: "TEXTO" | "AUDIO";
  arquivo?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  pos_x_abs?: number | null;
  pos_y_abs?: number | null;
  versao?: number | null;
}) {
  const { data, error } = await supabase.rpc("insert_feedback_via_token", {
    p_token: params.token,
    p_conteudo: params.conteudo,
    p_tipo: params.tipo ?? "TEXTO",
    p_arquivo: params.arquivo ?? null,
    p_pos_x: params.pos_x ?? null,
    p_pos_y: params.pos_y ?? null,
    p_pos_x_abs: params.pos_x_abs ?? null,
    p_pos_y_abs: params.pos_y_abs ?? null,
    p_versao: params.versao ?? null,
  });
  if (error) throw error;
  return data as string; // id do feedback
}

export async function listFeedbacksByArte(arteId: string) {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("id, conteudo, tipo, arquivo, status, criado_em, autor:usuarios(id,nome), posicao_x, posicao_y")
    .eq("arte_id", arteId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listRespostas(feedbackId: string) {
  const { data, error } = await supabase
    .from("feedback_respostas")
    .select("id, conteudo, tipo, arquivo, criado_em, autor:usuarios(id,nome)")
    .eq("feedback_id", feedbackId)
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addResposta(feedbackId: string, conteudo: string, autorUsuarioId: string) {
  const { error } = await supabase
    .from("feedback_respostas")
    .insert({ feedback_id: feedbackId, conteudo, autor_id: autorUsuarioId, tipo: "TEXTO" });
  if (error) throw error;
}
