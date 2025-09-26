// app/l/[token]/_actions.ts
"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";

/** Tipagem básica do usuário cliente */
export type GuestUser = {
  id: string;
  nome: string;
  email: string;
  tipo: "CLIENTE";
};

export async function createGuestUser(
  input: { nome: string; email: string }
): Promise<GuestUser | null> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nome: input.nome,
      email: input.email,
      tipo: "CLIENTE",
    })
    .select()
    .single<GuestUser>();

  if (error) return null;
  return data;
}

export async function saveFeedback(input: {
  token: string;
  arteId: string;
  conteudo: string;
  tipo: "TEXTO";
  posicao_x: number;
  posicao_y: number;
  posicao_x_abs: number;
  posicao_y_abs: number;
  authorId: string;
}) {
  const supabase = getSupabaseServer();

  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, somente_leitura, expira_em")
    .eq("token", input.token)
    .single();

  if (!link || link.somente_leitura) return null;
  if (link.expira_em && new Date(link.expira_em) < new Date()) return null;

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      conteudo: String(input.conteudo ?? "").slice(0, 2000),
      tipo: "TEXTO",
      arquivo: null,
      posicao_x: input.posicao_x,
      posicao_y: input.posicao_y,
      posicao_x_abs: input.posicao_x_abs,
      posicao_y_abs: input.posicao_y_abs,
      arte_id: input.arteId,
      autor_id: input.authorId, // sempre real
      status: "ABERTO",
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function saveAudioFeedback(formData: FormData) {
  const supabase = getSupabaseServer();

  const token = String(formData.get("token") ?? "");
  const arteId = String(formData.get("arteId") ?? "");
  const authorId = String(formData.get("authorId") ?? ""); // 👈 obrigatório agora
  const file = formData.get("file") as File | null;

  if (!token || !arteId || !file || !authorId) return null;

  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, somente_leitura, expira_em")
    .eq("token", token)
    .single();

  if (!link || link.somente_leitura) return null;
  if (link.expira_em && new Date(link.expira_em) < new Date()) return null;

  const filename = `${randomUUID()}.webm`;
  const { data: up, error: upErr } = await supabase.storage
    .from("uploads")
    .upload(`audios/${filename}`, file, {
      contentType: file.type || "audio/webm",
      upsert: false,
    });

  if (upErr || !up?.path) return null;

  const { data: pub } = supabase.storage.from("uploads").getPublicUrl(up.path);
  const url = pub?.publicUrl ?? null;

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      conteudo: "Áudio",
      tipo: "AUDIO",
      arquivo: url,
      posicao_x: null,
      posicao_y: null,
      posicao_x_abs: null,
      posicao_y_abs: null,
      arte_id: arteId,
      autor_id: authorId, // sempre real
      status: "ABERTO",
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function updateFeedbackStatus(input: {
  id: string;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
}) {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("feedbacks")
    .update({ status: input.status })
    .eq("id", input.id);
  return !error;
}
