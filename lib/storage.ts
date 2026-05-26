// lib/storage.ts
// O backend retorna URLs assinadas diretamente nos campos previewUrl / arquivo.
// Este módulo apenas encaminha URLs absolutas; sem dependência do Supabase.

export const BUCKET_ORIGINAIS = 'artes'
export const BUCKET_PREVIEWS  = 'previews'
export const BUCKET_OLD_THUMBS = 'thumbnails'

export async function getArtePreviewUrls(pathOrUrl: string, _expires = 60) {
  if (!pathOrUrl) return { previewUrl: null, downloadUrl: null }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return { previewUrl: pathOrUrl, downloadUrl: pathOrUrl }
  }
  return { previewUrl: null, downloadUrl: null }
}

export async function getArteDownloadUrl(pathOrUrl: string, _expires = 60) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return null
}
