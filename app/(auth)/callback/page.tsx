// app/(auth)/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Tipo = 'DESIGNER' | 'CLIENTE';

function safeNext(path: string | null): string | null {
  // impede open redirect: apenas caminhos internos ("/..."), sem "//"
  if (!path) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  return path;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const search = useSearchParams();
  const ranRef = useRef(false); // evita re-rodar em StrictMode (dev)

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const token_hash = search.get('token_hash'); // magic link / OTP
        const typeParam = search.get('type');        // e.g. 'magiclink', 'email'
        const code = search.get('code');             // PKCE OAuth
        const nextParam = safeNext(search.get('next'));
        const tipoFromQuery = (search.get('tipo') as Tipo | null) ?? null;

        // 1) Fluxo Magic Link / OTP (case-insensitive do 'type')
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

        // 2) Fluxo OAuth (PKCE): troca code pela sessão
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(
            // importante: passar a URL completa
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

        // 4) Decide destino
        const user = session.user;
        const tipo: Tipo =
          tipoFromQuery ??
          ((user.user_metadata?.tipo as Tipo | undefined) ?? 'DESIGNER');

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
