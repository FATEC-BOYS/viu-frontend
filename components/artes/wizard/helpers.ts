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

export function mimeMatchesSelection(selectedMime: string, file: File) {
  const meta = getSelectedMimeMeta(selectedMime);
  const byMime = !!file.type && file.type === selectedMime;
  const byExt = meta ? meta.exts.includes(extFromFilename(file.name)) : false;
  // se file.type existir, precisa bater; se vier vazio, valida pela extensão
  if (file.type) return byMime;
  return byExt;
}

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
