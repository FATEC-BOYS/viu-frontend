// app/(auth)/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Tipo = 'DESIGNER' | 'CLIENTE';

function safeNext(path: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  return path;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const token_hash = search.get('token_hash'); // magic link / OTP
        const typeParam  = search.get('type');       // 'magiclink' | 'email' | ...
        const code       = search.get('code');       // OAuth PKCE
        const nextParam  = safeNext(search.get('next'));
        const tipoFromQuery = (search.get('tipo') as Tipo | null) ?? null;

        // 1) Magic Link / OTP
        if (token_hash && typeParam) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash,
            type: typeParam.toLowerCase() as any,
          });
          if (otpErr) {
            console.error('verifyOtp error:', otpErr);
            router.replace('/login?error=confirmation_failed');
            return;
          }
        }

        // 2) OAuth: troca code pela sessão
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (exErr) {
            console.error('exchangeCodeForSession error:', exErr);
            router.replace('/login?error=oauth_exchange_failed');
            return;
          }
        }

        // 3) Garante sessão válida
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !session?.user) {
          console.error('getSession error or no user:', sessErr);
          router.replace('/login?error=no_session');
          return;
        }

        const user = session.user;

        // 4) Normaliza metadados e upsert em "usuarios"
        //    (idempotente; só atualiza se faltar algo)
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const tipo: Tipo =
          tipoFromQuery ?? (meta.tipo as Tipo | undefined) ?? 'DESIGNER';

        // nome preferindo chaves comuns do Supabase/OAuth
        const nome: string =
          meta.name ??
          meta.full_name ??
          meta.fullName ??
          meta.fullname ??
          user.user_metadata?.user_name ??
          (user.email ? user.email.split('@')[0] : 'Usuário');

        // avatar vinda do OAuth (google usa "picture")
        const avatar_url: string | null =
          meta.avatar_url ?? meta.picture ?? null;

        // se mudou/veio `tipo` pela query, persiste no metadata
        const mustUpdateMetadata =
          meta.tipo !== tipo || meta.name !== nome || (avatar_url && meta.avatar_url !== avatar_url);

        if (mustUpdateMetadata) {
          await supabase.auth.updateUser({
            data: {
              ...meta,
              tipo,
              name: nome,
              ...(avatar_url ? { avatar_url } : {}),
            },
          });
        }

        // upsert na sua tabela "usuarios"
        await supabase.from('usuarios').upsert(
          {
            id: user.id,
            email: user.email,
            nome,
            tipo,
            avatar_url: avatar_url ?? null,
          },
          { onConflict: 'id' }
        );

        // 5) Decide destino
        const fallback = tipo === 'CLIENTE' ? '/links' : '/dashboard';
        router.replace(nextParam || fallback);
      } catch (e) {
        console.error('Auth callback unexpected error:', e);
        router.replace('/login?error=callback_unexpected');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, search]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Conectando sua conta…</p>
    </div>
  );
}
