// lib/syncWithBackend.ts
import type { User } from '@supabase/supabase-js';

const BACKEND_URL = 'https://viu-backend-production.up.railway.app';

export interface SyncResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    nome: string;
    avatar?: string;
    provider?: string;
    supabaseId: string;
  };
  error?: string;
}

/**
 * Sincroniza o usuário do Supabase com o backend (Prisma)
 * @param user - Usuário do Supabase
 * @returns Promise com o resultado da sincronização
 */
export async function syncUserWithBackend(user: User): Promise<SyncResponse> {
  try {
    const meta = (user.user_metadata ?? {}) as Record<string, any>;

    const nome: string =
      meta.name ??
      meta.full_name ??
      meta.fullName ??
      meta.fullname ??
      meta.user_name ??
      (user.email ? user.email.split('@')[0] : 'Usuário');

    const avatar: string | undefined =
      meta.avatar_url ?? meta.picture ?? undefined;

    const provider: string = user.app_metadata?.provider ?? 'email';

    const response = await fetch(`${BACKEND_URL}/auth/supabase/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseId: user.id,
        email: user.email,
        nome,
        avatar,
        provider,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Salvar ID do Prisma para usar em outras APIs
      if (typeof window !== 'undefined' && data.data?.id) {
        localStorage.setItem('prismaUserId', data.data.id);
      }
      console.log('✅ Usuário sincronizado com backend!', data.data);
    } else {
      console.warn('⚠️ Falha na sincronização com backend:', data.error);
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao sincronizar com backend:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
