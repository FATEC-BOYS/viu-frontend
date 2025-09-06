// lib/supabaseClient.ts
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

// Garante criar o client só quando realmente for usado
async function ensureClient(): Promise<SupabaseClient> {
  if (_client) return _client;

  // importa só quando precisar (evita custo no build)
  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No build/prerender (SSR) essas envs podem não existir.
  // Se estiver no servidor, devolvemos um "stub" que lança APENAS se alguém tentar usar.
  if (!url || !anon) {
    if (typeof window === 'undefined') {
      // Stub que explode somente ao ser usado indevidamente no SSR
      return new Proxy({} as SupabaseClient, {
        get() {
          throw new Error(
            'Supabase foi acessado durante SSR/prerender sem envs. ' +
              'Isso não deveria acontecer (use efeitos no cliente).'
          );
        },
      });
    }
    // No browser as envs PRECISAM existir
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas.'
    );
  }

  _client = createClient(url, anon);
  return _client;
}

// Exporta um proxy que inicializa o client só quando uma propriedade é acessada.
// Mantém compatibilidade com: `import { supabase } from "@/lib/supabaseClient"`
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Devolve uma função/propriedade já bindada ao client real
    return (...args: unknown[]) => {
      // Chamadas encadeadas como supabase.from(...).select(...) precisam do objeto real:
      // então, se for acesso a propriedade, retornamos a propriedade do client;
      // se for chamada (função), bindamos corretamente.
      // Para simplificar e funcionar bem com os usos comuns:
      return (async () => {
        const c = await ensureClient();
        // @ts-expect-error - acesso dinâmico
        const value = c[prop];
        return typeof value === 'function' ? value.apply(c, args) : value;
      })();
    };
  },
}) as SupabaseClient;

// Opcional: helper explícito para quem quiser pegar o client no runtime
export async function getSupabaseClient(): Promise<SupabaseClient> {
  return ensureClient();
}
