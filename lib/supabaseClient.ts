'use client'
// Supabase removido — use lib/api.ts para todas as operações
export const supabase = new Proxy({} as any, {
  get(_t, prop) {
    if (prop === 'then') return undefined
    throw new Error(
      `Supabase foi removido. Use a API REST do backend (lib/api.ts). Propriedade acessada: ${String(prop)}`
    )
  },
})
