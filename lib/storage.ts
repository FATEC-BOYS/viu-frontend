import { supabase } from "@/lib/supabaseClient";

/** Tenta thumbnail; se não, cai no original */
export async function getArtePreviewUrls(arquivoPath: string) {
  const THUMB_BUCKET = "thumbnails";
  const ARTE_BUCKET = "artes";
  const norm = arquivoPath.replace(/^artes\//, "");

  const thumb = await supabase.storage.from(THUMB_BUCKET).createSignedUrl(norm, 3600);
  if (!thumb.error && thumb.data?.signedUrl) {
    return { previewUrl: thumb.data.signedUrl, downloadUrl: thumb.data.signedUrl };
  }

  const orig = await supabase.storage.from(ARTE_BUCKET).createSignedUrl(norm, 3600);
  if (!orig.error && orig.data?.signedUrl) {
    return { previewUrl: orig.data.signedUrl, downloadUrl: orig.data.signedUrl };
  }

  return { previewUrl: null as string | null, downloadUrl: null as string | null };
}

export async function getArteDownloadUrl(arquivoPath: string) {
  const norm = arquivoPath.replace(/^artes\//, "");
  const { data, error } = await supabase.storage.from("artes").createSignedUrl(norm, 3600);
  if (error) throw error;
  return data.signedUrl;
}
