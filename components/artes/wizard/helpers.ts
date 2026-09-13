export const MIME_OPTIONS: { label: string; value: string; exts: string[] }[] = [
  { label: "PDF", value: "application/pdf", exts: ["pdf"] },
  { label: "PNG", value: "image/png", exts: ["png"] },
  { label: "JPEG", value: "image/jpeg", exts: ["jpg", "jpeg"] },
  { label: "SVG", value: "image/svg+xml", exts: ["svg"] },
  { label: "GIF", value: "image/gif", exts: ["gif"] },
  { label: "MP4 (vídeo)", value: "video/mp4", exts: ["mp4"] },
  { label: "WEBM (vídeo)", value: "video/webm", exts: ["webm"] },
];

export type Step = 1 | 2 | 3;

export function getSelectedMimeMeta(mime: string | null) {
  return MIME_OPTIONS.find((m) => m.value === mime) || null;
}

export function extFromFilename(name: string) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function sanitizeFilename(name: string) {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 128);
}

/**
 * O que o seletor de arquivos deve oferecer.
 *
 * Sem `accept`, o diálogo do sistema mostra tudo que existe na máquina, e a
 * pessoa só descobre que o formato não serve depois de escolher. Filtrar na
 * origem faz a maior parte dos enganos deixar de ser possível.
 *
 * Leva extensão E mime: o navegador usa uma ou outra dependendo do sistema, e
 * arquivo vindo de rede ou de alguns celulares chega com `type` vazio.
 */
export const ACCEPT_ARTE = MIME_OPTIONS.flatMap((m) => [
  ...m.exts.map((e) => "." + e),
  m.value,
]).join(",");

/**
 * QUAL é o formato deste arquivo — em vez de perguntar antes e conferir depois.
 *
 * O wizard pedia o formato no passo 1 e recusava no passo 2 quando não batia.
 * O campo não ia para lugar nenhum: o `FormData` nunca o enviou, e o backend
 * grava `tipo` a partir do mimetype do arquivo de verdade. Ou seja, a pergunta
 * existia só para validar o arquivo contra ela mesma, e produzia um erro que
 * não precisava existir.
 *
 * A extensão entra como segunda tentativa porque `file.type` vem vazio em
 * arquivo de rede e em alguns celulares — e aí o nome é tudo que sobra.
 */
export function formatoDoArquivo(file: File) {
  if (file.type) {
    const porMime = MIME_OPTIONS.find((m) => m.value === file.type);
    if (porMime) return porMime;
  }
  const ext = extFromFilename(file.name);
  return MIME_OPTIONS.find((m) => m.exts.includes(ext)) ?? null;
}

/** Como chamar o que a pessoa escolheu, mesmo quando não é formato aceito. */
export function rotuloDoArquivo(file: File) {
  const conhecido = formatoDoArquivo(file);
  if (conhecido) return conhecido.label;
  const ext = extFromFilename(file.name);
  return ext ? ext.toUpperCase() : file.type || "formato desconhecido";
}

/** Os formatos aceitos, em uma frase — para a recusa dizer o que serve. */
export const FORMATOS_ACEITOS = MIME_OPTIONS.map((m) => m.label).join(", ");

export function randomId() {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// components/artes/wizard/helpers.ts
export function buildShareUrl(token: string | null) {
  if (!token) return "";
  const base =
    process.env.NEXT_PUBLIC_APP_URL || // ex.: https://viu-frontend.vercel.app
    (typeof window !== "undefined" ? window.location.origin : "");
  const prefix = "/l"; 
  return `${base}${prefix}/${token}`;
}


export function parseStorageError(e: any): string {
  const msg = e?.message || e?.error || e?.code || "Erro inesperado";
  if (/bucket/i.test(msg) && /not/i.test(msg)) return "Bucket não encontrado.";
  if (/already exists/i.test(msg)) return "Já existe um arquivo com esse nome.";
  if (/payload too large|413/i.test(msg)) return "Arquivo excede o limite de tamanho.";
  return msg;
}
