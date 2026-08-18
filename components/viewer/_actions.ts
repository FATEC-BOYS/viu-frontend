"use server";

// TODO: Estas server actions foram migradas do Supabase para chamadas REST ao viu-backend.
// Para autenticação em server actions, o token JWT precisa ser enviado via cookie (não localStorage).
// Enquanto a autenticação via cookie não estiver implementada, use os endpoints do backend
// diretamente no cliente com o token de localStorage via `api` utility.
//
// Endpoints equivalentes no viu-backend:
//   POST /artes                         → createArteWithPreview
//   POST /artes/:id/versoes             → addArteVersion
//   POST /artes/:id/arquivos            → addArteAttachment
//   POST /feedbacks                     → saveFeedback / saveAudioFeedback
//   PATCH /feedbacks/:id                → updateFeedbackStatus
//   POST /usuarios (tipo: CLIENTE)      → createGuestUser

import { randomUUID } from "crypto";
import mime from "mime";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "";

/** util: extrai mime/extensão com fallback */
function guessMimeAndExt(file: File) {
  const ct = file.type || mime.getType(file.name) || "application/octet-stream";
  const ext = mime.getExtension(ct) || file.name.split(".").pop() || "bin";
  return { contentType: ct, ext: ext.toLowerCase() };
}

/** Cria arte + v1 + arquivos via backend REST */
export async function createArteWithPreview(input: {
  file: File;
  nome: string;
  tipo: string;
  projeto_id: string;
  autor_id: string;
}) {
  // TODO: implementar cookie-based auth para server actions
  // Por enquanto, este fluxo deve ser feito no cliente via api.post('/artes', formData)
  const { contentType } = guessMimeAndExt(input.file);
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("nome", input.nome);
  formData.append("tipo", input.tipo || contentType);
  formData.append("projetoId", input.projeto_id);

  const res = await fetch(`${BASE_URL}/artes`, {
    method: "POST",
    body: formData,
    // TODO: Authorization: `Bearer ${cookieToken}`
  });
  if (!res.ok) throw new Error(`Erro ao criar arte: ${res.statusText}`);
  return res.json();
}

/** Nova versão de uma arte existente */
export async function addArteVersion(input: {
  arte_id: string;
  file: File;
  autor_id: string;
}) {
  // TODO: implementar cookie-based auth para server actions
  const formData = new FormData();
  formData.append("file", input.file);

  const res = await fetch(`${BASE_URL}/artes/${input.arte_id}/versoes`, {
    method: "POST",
    body: formData,
    // TODO: Authorization: `Bearer ${cookieToken}`
  });
  if (!res.ok) throw new Error(`Erro ao adicionar versão: ${res.statusText}`);
  return res.json();
}

/** Adiciona anexos à versão atual da arte */
export async function addArteAttachment(input: {
  arte_id: string;
  files: File[];
}) {
  // TODO: implementar cookie-based auth para server actions
  const formData = new FormData();
  for (const file of input.files) {
    formData.append("files", file);
  }

  const res = await fetch(`${BASE_URL}/artes/${input.arte_id}/arquivos`, {
    method: "POST",
    body: formData,
    // TODO: Authorization: `Bearer ${cookieToken}`
  });
  if (!res.ok) throw new Error(`Erro ao adicionar anexo: ${res.statusText}`);
  return res.json();
}

/** Cria (ou reaproveita) um convidado por e-mail */
export async function createGuestUser(input: { nome: string; email: string }) {
  // TODO: implementar cookie-based auth para server actions
  const res = await fetch(`${BASE_URL}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: input.nome,
      email: input.email,
      tipo: "CLIENTE",
      // TODO: senha temporária gerada pelo backend ou recebida como parâmetro
      senha: `Viu@${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    }),
  });
  if (res.status === 409) {
    // usuário já existe — tentar buscar pelo email
    return null; // TODO: GET /usuarios?email=...
  }
  if (!res.ok) throw new Error(`Erro ao criar convidado: ${res.statusText}`);
  const data = await res.json();
  return data?.data ?? data;
}

/** Salva feedback público via token do link compartilhado */
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
  const res = await fetch(`${BASE_URL}/feedbacks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: input.token,
      arteId: input.arteId,
      conteudo: String(input.conteudo ?? "").slice(0, 2000),
      tipo: "TEXTO",
      posicaoX: input.posicao_x,
      posicaoY: input.posicao_y,
      posicaoXAbs: input.posicao_x_abs,
      posicaoYAbs: input.posicao_y_abs,
      autorId: input.authorId,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data ?? data;
}

/** Upload de áudio de feedback via token */
export async function saveAudioFeedback(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const arteId = String(formData.get("arteId") ?? "");
  const authorId = String(formData.get("authorId") ?? "");
  const file = formData.get("file") as File | null;

  if (!token || !arteId || !authorId || !file) return null;

  const body = new FormData();
  body.append("token", token);
  body.append("arteId", arteId);
  body.append("autorId", authorId);
  body.append("file", file);

  // TODO: o backend precisa expor POST /feedbacks/audio para receber upload de áudio
  const res = await fetch(`${BASE_URL}/feedbacks/audio`, {
    method: "POST",
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data ?? data;
}

/** Resolve ou reabre a thread de um feedback */
export async function updateFeedbackStatus(input: {
  id: string;
  status: "ABERTO" | "RESOLVIDO";
}) {
  // Não existe coluna de status: o backend expõe /resolver e /reabrir, que
  // escrevem em resolvidoEm.
  const acao = input.status === "RESOLVIDO" ? "resolver" : "reabrir";
  // TODO: implementar cookie-based auth para server actions
  const res = await fetch(`${BASE_URL}/feedbacks/${input.id}/${acao}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
    // TODO: Authorization: `Bearer ${cookieToken}`
  });
  return res.ok;
}
