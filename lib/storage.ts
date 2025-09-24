import { supabase } from "@/lib/supabaseClient";

const THUMB_BUCKET = "thumbnails";
const ARTE_BUCKET = "artes";

/** tenta thumbnail; se não, cai no original */
export async function getArtePreviewUrls(
  arquivoPath: string,
  expiresInSeconds = 60 // padrão: 1 min
) {
  // tenta thumb (usa o mesmo path do arte, mas em outro bucket)
  const thumb = await supabase.storage
    .from(THUMB_BUCKET)
    .createSignedUrl(arquivoPath, expiresInSeconds);
  if (!thumb.error && thumb.data?.signedUrl) {
    return { previewUrl: thumb.data.signedUrl, downloadUrl: thumb.data.signedUrl };
  }

  // fallback: original
  const orig = await supabase.storage
    .from(ARTE_BUCKET)
    .createSignedUrl(arquivoPath, expiresInSeconds);
  if (!orig.error && orig.data?.signedUrl) {
    return { previewUrl: orig.data.signedUrl, downloadUrl: orig.data.signedUrl };
  }

  return { previewUrl: null, downloadUrl: null };
}

export async function getArteDownloadUrl(
  arquivoPath: string,
  expiresInSeconds = 60 // padrão: 1 min
) {
  const { data, error } = await supabase.storage
    .from(ARTE_BUCKET)
    .createSignedUrl(arquivoPath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
