// app/api/verify-sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Usar service role para bypassar RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verificar Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      userId
    );

    // 2. Verificar tabela usuario_auth (com service role)
    const { data: usuarioAuth, error: usuarioAuthError } = await supabaseAdmin
      .from('usuario_auth')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 3. Verificar backend (Prisma)
    let backendData = null;
    let backendError = null;
    try {
      const backendUrl = 'https://viu-backend-production.up.railway.app';
      const response = await fetch(`${backendUrl}/usuarios/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        backendData = await response.json();
      } else {
        backendError = `HTTP ${response.status}: ${await response.text()}`;
      }
    } catch (error) {
      backendError = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json({
      verification: {
        supabaseAuth: {
          exists: !!authUser && !authError,
          confirmed: authUser?.user?.email_confirmed_at != null,
          data: authUser?.user
            ? {
                id: authUser.user.id,
                email: authUser.user.email,
                email_confirmed_at: authUser.user.email_confirmed_at,
                created_at: authUser.user.created_at,
              }
            : null,
          error: authError?.message || null,
        },
        usuarioAuth: {
          exists: !!usuarioAuth && !usuarioAuthError,
          data: usuarioAuth,
          error: usuarioAuthError?.message || null,
          rlsNote: 'Verificado com service role (bypassa RLS)',
        },
        backend: {
          exists: !!backendData && !backendError,
          data: backendData,
          error: backendError,
        },
      },
      summary: {
        allSynced:
          !!authUser &&
          !authError &&
          !!usuarioAuth &&
          !usuarioAuthError &&
          !!backendData &&
          !backendError,
        supabaseAuthOk: !!authUser && !authError,
        usuarioAuthOk: !!usuarioAuth && !usuarioAuthError,
        backendOk: !!backendData && !backendError,
      },
    });
  } catch (error) {
    console.error('Erro na verificação:', error);
    return NextResponse.json(
      {
        error: 'Erro ao verificar sincronização',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
