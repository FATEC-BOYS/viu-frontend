import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  if (token_hash && type) {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error) {
      // Redireciona para o dashboard após confirmação
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Em caso de erro, redireciona para login com mensagem
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
}