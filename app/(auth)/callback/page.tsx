// app/(auth)/callback/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Tipo = 'DESIGNER' | 'CLIENTE';

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const token_hash = search.get('token_hash');
        const typeParam = search.get('type');
        const nextParam = search.get('next');
        const tipoFromQuery = (search.get('tipo') as Tipo | null) ?? null;

        if (token_hash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: typeParam as any,
          });
          if (error) return router.replace('/login?error=confirmation_failed');
        }

        // ✅ aqui validamos a sessão corretamente
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return router.replace('/login?error=no_session');
        const user = session.user;

        const tipo: Tipo =
          tipoFromQuery ?? (user.user_metadata?.tipo as Tipo | undefined) ?? 'DESIGNER';
        const nome =
          (user.user_metadata?.name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Usuário';

        // (bootstrap igual ao que já fizemos: usuarios, usuario_auth, user_providers)
        // ... seu código atual aqui ...

        const next = nextParam || (tipo === 'CLIENTE' ? '/links' : '/dashboard');
        router.replace(next);
      } catch (e) {
        console.error(e);
        router.replace('/login?error=callback_unexpected');
      }
    })();
  }, [router, search]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Conectando sua conta…</p>
    </div>
  );
}
