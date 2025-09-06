// app/(auth)/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

// Desliga SSG/cache pra este handler
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'default-no-store';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type'); // ex: 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite'
  const next = url.searchParams.get('next') ?? '/dashboard';

  // Tipos válidos para email (não inclui phone_change)
  const allowedTypes: EmailOtpType[] = [
    'signup',
    'magiclink',
    'recovery',
    'email_change',
    'invite',
  ];

  if (!token_hash || !typeParam || !allowedTypes.includes(typeParam as EmailOtpType)) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url));
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: typeParam as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url));
  }

  // ok
  return NextResponse.redirect(new URL(next, request.url));
}
