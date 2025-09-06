import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Tipos aceitos quando o fluxo usa token_hash (links por e-mail)
type EmailOtpType = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'

const isEmailOtpType = (t: string): t is EmailOtpType =>
  ['signup', 'magiclink', 'recovery', 'invite', 'email_change'].includes(t)

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token_hash = url.searchParams.get('token_hash')
  const typeParam = url.searchParams.get('type')

  // Apenas fluxos de e-mail usam token_hash
  if (token_hash && typeParam && isEmailOtpType(typeParam)) {
    const supabase = createRouteHandlerClient({ cookies })

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: typeParam, // agora é EmailOtpType (compatível com EmailOtpType do SDK)
    })

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Qualquer outra combinação falha (ex.: sms/phone_change com token_hash)
  return NextResponse.redirect(
    new URL('/login?error=confirmation_failed', request.url)
  )
}
