// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // NÃO lançar erro em import/SSR. Só checar e lançar quando alguém tentar usar.
  if (!url || !anon) {
    // Cria um client "placeholder" que vai falhar com erro legível quando usado
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis do Vercel (Production e Preview) e faça um redeploy.'
    );
  }

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

// Para compatibilidade com imports antigos:
export const supabase = getSupabaseClient();
