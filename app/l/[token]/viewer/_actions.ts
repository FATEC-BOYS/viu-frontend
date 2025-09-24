// app/l/[token]/_actions.ts
"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";

export async function saveFeedback(input: {
  token: string;
  arteId: string;
  conteudo: string;
  tipo: "TEXTO";
  posicao_x: number;
  posicao_y: number;
  posicao_x_abs: number;
  posicao_y_abs: number;
}) {
  const supabase = getSupabaseServer();

  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, somente_leitura, expira_em")
    .eq("token", input.token)
    .single();

  if (!link || link.somente_leitura) return null;
  if (link.expira_em && new Date(link.expira_em) < new Date()) return null;

  const relX = Math.max(0, Math.min(1, Number(input.posicao_x)));
  const relY = Math.max(0, Math.min(1, Number(input.posicao_y)));
  const absX = Math.max(0, Math.round(Number(input.posicao_x_abs)));
  const absY = Math.max(0, Math.round(Number(input.posicao_y_abs)));

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      conteudo: String(input.conteudo ?? "").slice(0, 2000),
      tipo: "TEXTO",
      arquivo: null,
      posicao_x: relX,
      posicao_y: relY,
      posicao_x_abs: absX,
      posicao_y_abs: absY,
      arte_id: input.arteId,
      autor_id: "00000000-0000-0000-0000-000000000000",
      status: "ABERTO",
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

/**
 * Server Actions NÃO suportam passar Blob/ArrayBuffer direto como argumento.
 * Use FormData com um File.
 */
export async function saveAudioFeedback(formData: FormData) {
  const supabase = getSupabaseServer();

  const token = String(formData.get("token") ?? "");
  const arteId = String(formData.get("arteId") ?? "");
  const file = formData.get("file") as File | null;

  if (!token || !arteId || !file) return null;

  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, somente_leitura, expira_em")
    .eq("token", token)
    .single();

  if (!link || link.somente_leitura) return null;
  if (link.expira_em && new Date(link.expira_em) < new Date()) return null;

  // upload
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
      autor_id: "00000000-0000-0000-0000-000000000000",
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
