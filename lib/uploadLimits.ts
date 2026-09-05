import { api } from '@/lib/api'

/**
 * Limites de upload, lidos do backend.
 *
 * O número não é copiado para cá de propósito. Antes o ArteWizard validava
 * contra 100 MB escritos na mão, enquanto o servidor cortava em 25 MB: o
 * arquivo passava na validação do navegador, subia inteiro e morria do outro
 * lado com uma mensagem genérica. Quem manda é o servidor, então é dele que o
 * número vem.
 *
 * Isto é conveniência para avisar cedo — a validação que vale continua no
 * backend.
 */

export type CategoriaUpload = 'image' | 'video' | 'audio' | 'document'

export type LimitesUpload = {
  maxBytes: number
  porCategoria: Record<CategoriaUpload, number>
  tiposPermitidos: Record<string, string[]>
}

let cache: Promise<LimitesUpload | null> | null = null

/**
 * Devolve `null` quando o backend não responde.
 *
 * Falhar aqui não pode impedir o upload: quem valida de verdade é o servidor, e
 * bloquear o envio porque uma rota informativa caiu seria trocar um erro tardio
 * por um bloqueio total.
 */
export function getLimitesUpload(): Promise<LimitesUpload | null> {
  if (!cache) {
    cache = api
      .get<{ data: LimitesUpload }>('/upload/limites')
      .then((r) => r.data)
      .catch(() => null)
  }
  return cache
}

/** Só para os testes: descarta o cache entre casos. */
export function _limparCacheLimites() {
  cache = null
}

export function categoriaDoMime(mime: string): CategoriaUpload {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

export function formatarMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}

/**
 * Mensagem de erro quando o arquivo passa do limite, ou `null` quando passa.
 *
 * Sem limites carregados devolve `null` — deixa seguir e o servidor decide.
 */
export async function validarTamanho(file: File): Promise<string | null> {
  const limites = await getLimitesUpload()
  if (!limites) return null

  const categoria = categoriaDoMime(file.type || '')
  const max = limites.porCategoria[categoria] ?? limites.maxBytes
  if (file.size <= max) return null

  return `Arquivo de ${formatarMB(file.size)} excede o limite de ${formatarMB(max)} para este tipo.`
}
