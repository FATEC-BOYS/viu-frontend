// app/(auth)/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
  const ranRef = useRef(false); // evita duplicar no StrictMode

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const token_hash = search.get('token_hash'); // magic link / OTP
        const typeParam  = search.get('type');       // 'magiclink' | 'email' | ...
        const code       = search.get('code');       // OAuth (PKCE)
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
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const tipo: Tipo =
          tipoFromQuery ?? (meta.tipo as Tipo | undefined) ?? 'DESIGNER';

        const nome: string =
          meta.name ??
          meta.full_name ??
          meta.fullName ??
          meta.fullname ??
          meta.user_name ??
          (user.email ? user.email.split('@')[0] : 'Usuário');

        const avatar_url: string | null =
          meta.avatar_url ?? meta.picture ?? null;

        // Atualiza user_metadata se faltando/alterado
        const mustUpdateMetadata =
          meta.tipo !== tipo ||
          meta.name !== nome ||
          (avatar_url && meta.avatar_url !== avatar_url);

        if (mustUpdateMetadata) {
          const { error: upMetaErr } = await supabase.auth.updateUser({
            data: {
              ...meta,
              tipo,
              name: nome,
              ...(avatar_url ? { avatar_url } : {}),
            },
          });
          if (upMetaErr) {
            console.warn('updateUser metadata warning:', upMetaErr.message);
          }
        }

        // Upsert na tabela `usuarios` (idempotente)
        const { error: upsertErr } = await supabase
          .from('usuarios')
          .upsert(
            {
              id: user.id,
              email: user.email,
              nome,
              tipo,
              avatar_url: avatar_url ?? null,
            },
            { onConflict: 'id' }
          );

        if (upsertErr) {
          // não bloqueia o login; só loga
          console.warn('usuarios upsert warning:', upsertErr.message);
        }

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
