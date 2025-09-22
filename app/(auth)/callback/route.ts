// app/(auth)/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type'); // 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite'
  const nextParam = url.searchParams.get('next');
  const tipoFromQuery = url.searchParams.get('tipo') as 'DESIGNER' | 'CLIENTE' | null; // usado no OAuth
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });


  // 1) Se veio por e-mail/OTP, finalize a verificação
  if (token_hash && typeParam && ['signup','magiclink','recovery','email_change','invite'].includes(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: typeParam as EmailOtpType,
    });
    if (error) {
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
    }
  } else {
    // 2) Se NÃO tem token_hash, assumimos OAuth social (a sessão já deve existir).
    //    Apenas seguimos adiante para o bootstrap com a sessão atual.
  }

  // 3) Bootstrap pós-autenticação (vale para OTP e para OAuth)
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=no_session', request.url));
  }

  // tipo pode vir da query (OAuth) OU do user_metadata (signup por e-mail). Default: DESIGNER.
  const tipo: 'DESIGNER' | 'CLIENTE' =
    (tipoFromQuery ??
      (user.user_metadata?.tipo as 'DESIGNER' | 'CLIENTE' | undefined)) ??
    'DESIGNER';

  const nomeMeta =
    (user.user_metadata?.name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.email?.split('@')[0]) ||
    'Usuário';

  // 3.1 Garante public.usuarios (se não existir)
  let usuarioId: string | null = null;

  if (user.email) {
    const { data: foundUser, error: findErr } = await supabase
      .from('usuarios')
      .select('id, email, tipo')
      .eq('email', user.email)
      .maybeSingle();

    if (findErr) {
      console.error('find usuarios err', findErr);
    }

    if (foundUser?.id) {
      usuarioId = foundUser.id;

      // Opcional: alinhar tipo sem quebrar nada
      if (tipo && foundUser.tipo !== tipo) {
        const { error: updErr } = await supabase
          .from('usuarios')
          .update({ tipo })
          .eq('id', usuarioId);
        if (updErr) console.error('update usuarios.tipo err', updErr);
      }
    }
  }

  // Se ainda não tem, cria um novo (RLS: precisa da policy de INSERT que já deixamos configurada)
  if (!usuarioId) {
    const { data: inserted, error: insErr } = await supabase
      .from('usuarios')
      .insert({
        email: user.email,
        nome: nomeMeta,
        tipo,
        ativo: true
      })
      .select('id')
      .single();
    if (insErr) {
      console.error('insert usuarios err', insErr);
      return NextResponse.redirect(new URL('/login?error=bootstrap_user', request.url));
    }
    usuarioId = inserted.id;
  }

  // 3.2 Garante o mapa auth → usuarios (usuario_auth)
  const { data: existingMap, error: mapErr } = await supabase
    .from('usuario_auth')
    .select('auth_user_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (mapErr) {
    console.error('select usuario_auth err', mapErr);
  }

  if (!existingMap) {
    const { error: insertMapErr } = await supabase
      .from('usuario_auth')
      .insert({ auth_user_id: user.id, usuario_id: usuarioId });
    if (insertMapErr) {
      console.error('insert usuario_auth err', insertMapErr);
      return NextResponse.redirect(new URL('/login?error=bootstrap_map', request.url));
    }
  }

  // 3.3 (Opcional) Registrar provider em user_providers, se vier de social
  //     Procura uma identidade que não seja 'email' (no OAuth costuma vir 'google', etc.)
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const socialIdentity = identities.find((i: any) => i?.provider && i.provider !== 'email');
  const provider = (socialIdentity?.provider as string | undefined);
  const providerUserId =
    (socialIdentity?.identity_data as any)?.sub ||
    (socialIdentity as any)?.id ||
    (socialIdentity as any)?.user_id ||
    undefined;

  if (provider && providerUserId) {
    // Tenta inserir o vínculo se ainda não existir (idempotente)
    const { data: existingUp, error: selUpErr } = await supabase
      .from('user_providers')
      .select('id')
      .eq('provider', provider)
      .eq('provider_user_id', providerUserId)
      .maybeSingle();

    if (selUpErr) console.error('select user_providers err', selUpErr);

    if (!existingUp) {
      const { error: upErr } = await supabase
        .from('user_providers')
        .insert({
          usuario_id: usuarioId,
          provider,
          provider_user_id: providerUserId,
          email: user.email || null
        });
      if (upErr) {
        // Não bloqueia o fluxo; apenas log
        console.error('insert user_providers err', upErr);
      }
    }
  }

  // 4) Redirecionamento por tipo (respeita ?next=... se houver)
  const next = nextParam || (tipo === 'CLIENTE' ? '/links' : '/dashboard');
  return NextResponse.redirect(new URL(next, request.url));
}
