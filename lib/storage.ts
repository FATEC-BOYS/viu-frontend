// lib/storage.ts
import { supabase } from "@/lib/supabaseClient";

export const BUCKET_ORIGINAIS = "artes";     // privado
export const BUCKET_PREVIEWS  = "previews";  // público
export const BUCKET_AUDIOS    = "audios";    // privado (no seu projeto está privado)

export async function publicPreviewUrl(previewPath: string | null) {
  if (!previewPath) return null;
  const key = previewPath.replace(/^previews\//, "");
  const { data } = supabase.storage.from(BUCKET_PREVIEWS).getPublicUrl(key);
  return data.publicUrl ?? null;
}

export async function signedOriginalUrl(originalPath: string, expires = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET_ORIGINAIS)
    .createSignedUrl(originalPath, expires);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function signedAudioUrl(audioPath: string, expires = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET_AUDIOS)
    .createSignedUrl(audioPath, expires);
  if (error) return null;
  return data?.signedUrl ?? null;
}
