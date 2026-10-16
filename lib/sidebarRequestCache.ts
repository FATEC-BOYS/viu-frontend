// Share successful/in-flight sidebar reads between desktop and mobile mounts.
// A short TTL avoids another nine requests every time the drawer opens.
const cache = new Map<string, { expires: number; promise: Promise<unknown> }>()
export function limparCacheSidebar() { cache.clear() }
export function consultarSidebar<T>(usuario: string, recurso: string, buscar: () => Promise<T>): Promise<T> {
  const key = `${usuario}:${recurso}`
  const existing = cache.get(key)
  if (existing && existing.expires > Date.now()) return existing.promise as Promise<T>
  if (cache.size > 100) cache.clear()
  const entry = { expires: Date.now() + 30000, promise: Promise.resolve().then(buscar) as Promise<unknown> }
  cache.set(key, entry)
  entry.promise.catch(() => { if (cache.get(key) === entry) cache.delete(key) })
  return entry.promise as Promise<T>
}
