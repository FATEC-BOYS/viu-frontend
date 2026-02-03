// app/(auth)/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { syncUserWithBackend } from '@/lib/syncWithBackend';

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
  const ranRef = useRef(false); // evita rodar 2x em StrictMode

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

        // 2) OAuth (PKCE): só troca o code se ainda não houver sessão
        if (code) {
          const { data: pre } = await supabase.auth.getSession();
          if (!pre?.session) {
            const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exErr) {
              console.error('exchangeCodeForSession error:', exErr);
              const msg = encodeURIComponent('Falha ao concluir login. Por favor, tente novamente na mesma aba.');
              router.replace(`/login?error=oauth_exchange_failed&message=${msg}`);
              return;
            }
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

        // 4) Normaliza metadados
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

        const avatar: string | null =
          meta.avatar_url ?? meta.picture ?? null; // sua coluna na tabela chama "avatar"

        // (Opcional) Atualiza user_metadata se mudou
        const mustUpdateMetadata =
          meta.tipo !== tipo ||
          meta.name !== nome ||
          (avatar && meta.avatar_url !== avatar);

        if (mustUpdateMetadata) {
          const { error: upMetaErr } = await supabase.auth.updateUser({
            data: {
              ...meta,
              tipo,
              name: nome,
              ...(avatar ? { avatar_url: avatar } : {}),
            },
          });
          if (upMetaErr) console.warn('updateUser metadata warning:', upMetaErr.message);
        }

        // 5) Upsert em `usuarios` (idempotente)
        {
          const { error: upsertErr } = await supabase
            .from('usuarios')
            .upsert(
              {
                id: user.id,                 // == auth.uid()
                email: user.email!,
                nome,
                tipo,
                avatar: avatar ?? null,      // coluna correta
                ativo: true,
              },
              { onConflict: 'id' }
            );

          if (upsertErr) {
            // Não bloqueia o fluxo; apenas loga
            console.warn('usuarios upsert warning:', upsertErr.message);
          }
        }

        // 6) Garante vínculo em `usuario_auth` (auth_user_id -> usuario_id)
        {
          const { error: linkErr } = await supabase
            .from('usuario_auth')
            .upsert(
              { auth_user_id: user.id, usuario_id: user.id },
              { onConflict: 'auth_user_id' }
            );
          if (linkErr) {
            console.warn('usuario_auth upsert warning:', linkErr.message);
          }
        }

        // 7) Sincroniza com backend (Prisma)
        await syncUserWithBackend(user);

        // 8) Destino final
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
