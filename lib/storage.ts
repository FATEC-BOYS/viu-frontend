// lib/storage.ts
import { supabase } from "@/lib/supabaseClient";

export const BUCKET_ORIGINAIS = "artes";
export const BUCKET_PREVIEWS  = "previews";
export const BUCKET_OLD_THUMBS = "thumbnails"; // fallback legado

export async function getArtePreviewUrls(pathOrUrl: string, expires = 60) {
  if (!pathOrUrl) return { previewUrl: null, downloadUrl: null };
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return { previewUrl: pathOrUrl, downloadUrl: pathOrUrl };
  }

  // normaliza chave caso venha “previews/…”
  const key = pathOrUrl.replace(/^previews\//, "").replace(/^thumbnails\//, "");

  // 1) tenta previews (novo)
  const pv = await supabase.storage.from(BUCKET_PREVIEWS).createSignedUrl(key, expires);
  if (!pv.error && pv.data?.signedUrl) {
    return { previewUrl: pv.data.signedUrl, downloadUrl: pv.data.signedUrl };
  }

  // 2) tenta thumbnails (antigo)
  const old = await supabase.storage.from(BUCKET_OLD_THUMBS).createSignedUrl(key, expires);
  if (!old.error && old.data?.signedUrl) {
    return { previewUrl: old.data.signedUrl, downloadUrl: old.data.signedUrl };
  }

  // 3) fallback: original privado
  const orig = await supabase.storage.from(BUCKET_ORIGINAIS).createSignedUrl(pathOrUrl, expires);
  return {
    previewUrl: orig.data?.signedUrl ?? null,
    downloadUrl: orig.data?.signedUrl ?? null,
  };
}

export async function getArteDownloadUrl(path: string, expires = 60) {
  const { data, error } = await supabase.storage.from(BUCKET_ORIGINAIS).createSignedUrl(path, expires);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
