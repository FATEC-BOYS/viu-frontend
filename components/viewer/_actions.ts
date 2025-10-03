"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";
import { randomUUID } from "crypto";
import mime from "mime";
import {
  BUCKET_ORIGINAIS,
  BUCKET_PREVIEWS,
} from "@/lib/storage";

/** carrega sharp dinamicamente (evita erro em runtime/bundle) */
async function getSharp() {
  const mod = await import("sharp");
  // @ts-ignore
  return mod.default ?? mod;
}

/** util: extrai mime/ extensão com fallback */
function guessMimeAndExt(file: File) {
  const ct = file.type || mime.getType(file.name) || "application/octet-stream";
  const ext = mime.getExtension(ct) || file.name.split(".").pop() || "bin";
  return { contentType: ct, ext: ext.toLowerCase() };
}

/** util: metadados de imagem (largura/altura) com sharp; retorna null se não for imagem */
async function probeImage(buffer: Buffer): Promise<{ w: number; h: number } | null> {
  try {
    const sharp = await getSharp();
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) return { w: meta.width, h: meta.height };
    return null;
  } catch {
    return null;
  }
}

/** gera preview 1280px (jpg) — retorna buffer e contentType */
async function makePreview(buffer: Buffer) {
  const sharp = await getSharp();
  const out = await sharp(buffer)
    .resize({ width: 1280, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { buf: out, contentType: "image/jpeg", ext: "jpg" as const };
}

/** Cria arte + v1 + arquivos (FONTE/PREVIEW) */
export async function createArteWithPreview(input: {
  file: File;               // original
  nome: string;
  tipo: string;             // ex: "image/png" ou categoria (LOGO, BANNER...)
  projeto_id: string;
  autor_id: string;
}) {
  const supa = getSupabaseServer();
  const id = randomUUID();

  // 1) prepara buffers e metadados
  const arr = await input.file.arrayBuffer();
  const buf = Buffer.from(arr);
  const { contentType, ext } = guessMimeAndExt(input.file);
  const imageMeta = await probeImage(buf);

  // 2) paths
  const base = `${id}/v1`;
  const originalPath = `${base}/original.${ext}`;             // no bucket 'artes'
  const previewPath  = `${id}/v1/preview_1280.jpg`;           // no bucket 'previews'

  // 3) upload do original (privado)
  const upOrig = await supa.storage.from(BUCKET_ORIGINAIS).upload(originalPath, buf, {
    contentType,
    upsert: false,
  });
  if (upOrig.error) throw upOrig.error;

  // 4) gera e sobe preview (se for imagem)
  let didPreview = false;
  const maybeImg = contentType.startsWith("image/");
  if (maybeImg) {
    const pv = await makePreview(buf);
    const upPrev = await supa.storage.from(BUCKET_PREVIEWS).upload(previewPath, pv.buf, {
      contentType: pv.contentType,
      upsert: true,
    });
    if (!upPrev.error) {
      didPreview = true;
    }
  }

  // 5) insere arte + versao + arte_arquivos
  try {
    // arte
    const { data: arte, error: insArteErr } = await supa
      .from("artes")
      .insert({
        id,
        nome: input.nome,
        descricao: null,
        arquivo: originalPath,           // path
        tipo: input.tipo || contentType, // seu campo 'tipo' na tabela
        tamanho: buf.length,
        versao: 1,
        status: "EM_ANALISE",
        projeto_id: input.projeto_id,
        autor_id: input.autor_id,
        largura_px: imageMeta?.w ?? null,
        altura_px: imageMeta?.h ?? null,
        versao_atual: 1,
        status_atual: "EM_ANALISE",
        preview_path: didPreview ? previewPath : null,
      })
      .select("*")
      .single();
    if (insArteErr) throw insArteErr;

    // versao v1
    const { data: versao, error: insVersErr } = await supa
      .from("arte_versoes")
      .insert({
        arte_id: id,
        versao: 1,
        status: "EM_ANALISE",
        arquivo: originalPath,
      })
      .select("*")
      .single();
    if (insVersErr) throw insVersErr;

    // arquivos (FONTE + PREVIEW)
    const rows = [
      {
        arte_id: id,
        versao: 1,
        kind: "FONTE",
        arquivo: originalPath,
        mime: contentType,
        tamanho: buf.length,
        largura_px: imageMeta?.w ?? null,
        altura_px: imageMeta?.h ?? null,
        arte_versao_id: versao.id,
      },
    ];
    if (didPreview) {
      rows.push({
        arte_id: id,
        versao: 1,
        kind: "PREVIEW",
        arquivo: previewPath, // no bucket 'previews'
        mime: "image/jpeg",
        tamanho: null,
        largura_px: null,
        altura_px: null,
        arte_versao_id: versao.id,
      } as any);
    }

    const { error: insFilesErr } = await supa.from("arte_arquivos").insert(rows as any[]);
    if (insFilesErr) throw insFilesErr;

    return { arte, versao, files: rows };
  } catch (err) {
    // rollback best-effort
    await supa.storage.from(BUCKET_ORIGINAIS).remove([originalPath]).catch(() => {});
    if (didPreview) await supa.storage.from(BUCKET_PREVIEWS).remove([previewPath]).catch(() => {});
    throw err;
  }
}

/** Nova versão de uma arte existente: sobe novo original e gera preview, incrementa versao */
export async function addArteVersion(input: {
  arte_id: string;
  file: File;
  autor_id: string;
}) {
  const supa = getSupabaseServer();

  // pega arte atual p/ saber versao
  const { data: current, error: getErr } = await supa
    .from("artes")
    .select("id, versao, status_atual")
    .eq("id", input.arte_id)
    .maybeSingle();
  if (getErr || !current) throw getErr || new Error("Arte não encontrada");

  const nextVersion = (current.versao ?? 1) + 1;

  const arr = await input.file.arrayBuffer();
  const buf = Buffer.from(arr);
  const { contentType, ext } = guessMimeAndExt(input.file);
  const imageMeta = await probeImage(buf);

  const base = `${input.arte_id}/v${nextVersion}`;
  const originalPath = `${base}/original.${ext}`;
  const previewPath  = `${input.arte_id}/v${nextVersion}/preview_1280.jpg`;

  // upload original
  const upOrig = await supa.storage.from(BUCKET_ORIGINAIS).upload(originalPath, buf, {
    contentType,
    upsert: false,
  });
  if (upOrig.error) throw upOrig.error;

  // preview se for imagem
  let didPreview = false;
  if (contentType.startsWith("image/")) {
    const pv = await makePreview(buf);
    const upPrev = await supa.storage.from(BUCKET_PREVIEWS).upload(previewPath, pv.buf, {
      contentType: pv.contentType,
      upsert: true,
    });
    if (!upPrev.error) didPreview = true;
  }

  try {
    // nova versao
    const { data: versao, error: versErr } = await supa
      .from("arte_versoes")
      .insert({
        arte_id: input.arte_id,
        versao: nextVersion,
        status: "EM_ANALISE",
        arquivo: originalPath,
      })
      .select("*")
      .single();
    if (versErr) throw versErr;

    // arte_arquivos
    const rows = [
      {
        arte_id: input.arte_id,
        versao: nextVersion,
        kind: "FONTE",
        arquivo: originalPath,
        mime: contentType,
        tamanho: buf.length,
        largura_px: imageMeta?.w ?? null,
        altura_px: imageMeta?.h ?? null,
        arte_versao_id: versao.id,
      },
    ];
    if (didPreview) {
      rows.push({
        arte_id: input.arte_id,
        versao: nextVersion,
        kind: "PREVIEW",
        arquivo: previewPath,
        mime: "image/jpeg",
        tamanho: null,
        largura_px: null,
        altura_px: null,
        arte_versao_id: versao.id,
      } as any);
    }
    const { error: filesErr } = await supa.from("arte_arquivos").insert(rows as any[]);
    if (filesErr) throw filesErr;

    // atualiza arte
    const { error: upErr } = await supa
      .from("artes")
      .update({
        versao: nextVersion,
        versao_atual: nextVersion,
        arquivo: originalPath,
        preview_path: didPreview ? previewPath : null,
        status: "EM_ANALISE",
        status_atual: "EM_ANALISE",
        tamanho: buf.length,
        largura_px: imageMeta?.w ?? null,
        altura_px: imageMeta?.h ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", input.arte_id);
    if (upErr) throw upErr;

    return { versao, files: rows, nextVersion };
  } catch (err) {
    await supa.storage.from(BUCKET_ORIGINAIS).remove([originalPath]).catch(() => {});
    if (didPreview) await supa.storage.from(BUCKET_PREVIEWS).remove([previewPath]).catch(() => {});
    throw err;
  }
}

/** Adiciona anexos (kind = 'ANEXO') à versão atual da arte */
export async function addArteAttachment(input: {
  arte_id: string;
  files: File[];
}) {
  const supa = getSupabaseServer();

  const { data: art } = await supa
    .from("artes")
    .select("id, versao")
    .eq("id", input.arte_id)
    .maybeSingle();
  if (!art) throw new Error("Arte não encontrada");
  const versao = art.versao ?? 1;

  // pega arte_versao atual
  const { data: v } = await supa
    .from("arte_versoes")
    .select("id")
    .eq("arte_id", input.arte_id)
    .eq("versao", versao)
    .maybeSingle();
  const arte_versao_id = v?.id ?? null;

  const rows: any[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const file of input.files) {
      const arr = await file.arrayBuffer();
      const buf = Buffer.from(arr);
      const { contentType, ext } = guessMimeAndExt(file);

      const path = `${input.arte_id}/v${versao}/anexos/${randomUUID()}.${ext}`;
      const up = await supa.storage.from(BUCKET_ORIGINAIS).upload(path, buf, {
        contentType,
        upsert: false,
      });
      if (up.error) throw up.error;
      uploadedPaths.push(path);

      rows.push({
        arte_id: input.arte_id,
        versao,
        kind: "ANEXO",
        arquivo: path,
        mime: contentType,
        tamanho: buf.length,
        largura_px: null,
        altura_px: null,
        arte_versao_id,
      });
    }

    const { error: insErr } = await supa.from("arte_arquivos").insert(rows);
    if (insErr) throw insErr;

    return { anexos: rows };
  } catch (err) {
    // rollback storage
    if (uploadedPaths.length) {
      await supa.storage.from(BUCKET_ORIGINAIS).remove(uploadedPaths).catch(() => {});
    }
    throw err;
  }
}

// --- FEEDBACK GUEST & SAVE --------------------------------------------------

/** Cria (ou reaproveita) um convidado por e-mail e retorna { id } */
export async function createGuestUser(input: { nome: string; email: string }) {
  const supabase = getSupabaseServer();

  // tenta reaproveitar pelo e-mail para não estourar UNIQUE
  const { data: existing } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("email", input.email)
    .maybeSingle();

  if (existing?.id) return existing; // { id }

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      nome: input.nome,
      email: input.email,
      tipo: "CLIENTE", // convidado/cliente
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar guest:", error.message);
    return null;
  }

  return data; // { id: string }
}

/** Salva feedback público via token do link compartilhado */
export async function saveFeedback(input: {
  token: string;
  arteId: string;
  conteudo: string;
  tipo: "TEXTO"; // (áudio é outra action)
  posicao_x: number;
  posicao_y: number;
  posicao_x_abs: number;
  posicao_y_abs: number;
  authorId: string;
}) {
  const supabase = getSupabaseServer();

  // valida link: existe, não expirou, é de ARTE, bate o arteId, pode comentar
  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, tipo, arte_id, expira_em, somente_leitura, can_comment")
    .eq("token", input.token)
    .maybeSingle();

  const expired = link?.expira_em && new Date(link.expira_em) < new Date();

  if (
    !link ||
    expired ||
    link.tipo !== "ARTE" ||
    link.arte_id !== input.arteId ||
    link.somente_leitura ||
    link.can_comment === false
  ) {
    return null;
  }

  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      arte_id: input.arteId,
      conteudo: String(input.conteudo ?? "").slice(0, 2000),
      tipo: "TEXTO",
      arquivo: null,
      posicao_x: input.posicao_x,
      posicao_y: input.posicao_y,
      posicao_x_abs: input.posicao_x_abs,
      posicao_y_abs: input.posicao_y_abs,
      autor_id: input.authorId, // id real do convidado/usuário
      status: "ABERTO",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Erro ao salvar feedback:", error.message);
    return null;
  }

  return data;
}

const AUDIO_BUCKET = "audios"; // ajuste se o bucket tiver outro nome

/** Upload de áudio de feedback (guest link). Salva path no DB e retorna o row com URL assinada p/ tocar imediatamente. */
export async function saveAudioFeedback(formData: FormData) {
  const supabase = getSupabaseServer();

  const token    = String(formData.get("token") ?? "");
  const arteId   = String(formData.get("arteId") ?? "");
  const authorId = String(formData.get("authorId") ?? "");
  const file     = formData.get("file") as File | null;

  if (!token || !arteId || !authorId || !file) return null;

  // valida link
  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, tipo, arte_id, expira_em, somente_leitura, can_comment")
    .eq("token", token)
    .maybeSingle();

  const expired = link?.expira_em && new Date(link.expira_em) < new Date();
  if (
    !link ||
    expired ||
    link.tipo !== "ARTE" ||
    link.arte_id !== arteId ||
    link.somente_leitura ||
    link.can_comment === false
  ) {
    return null;
  }

  // upload p/ bucket privado de áudios
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = "webm";
  const name = `${randomUUID()}.${ext}`;
  const path = `feedbacks/${arteId}/${name}`;

  const up = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, buf, { contentType: file.type || "audio/webm", upsert: false });

  if (up.error) return null;

  // guarda somente o path no DB (bucket é privado)
  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      arte_id: arteId,
      autor_id: authorId,
      tipo: "AUDIO",
      conteudo: "Áudio",
      arquivo: path,           // ⚠️ path, não URL
      posicao_x: null,
      posicao_y: null,
      posicao_x_abs: null,
      posicao_y_abs: null,
      status: "ABERTO",
    })
    .select("*")
    .single();

  if (error || !data) return null;

  // gera URL assinada só para retorno (player no cliente)
  const signed = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1h

  // devolve o row com arquivo já consumível no <audio>
  return { ...data, arquivo: signed.data?.signedUrl ?? null };
}

/** Atualiza o status de um feedback */
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
