// app/api/check-debug-access/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    // Criar cliente Supabase com cookies do usuário
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    });

    // Obter usuário atual
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ hasAccess: false });
    }

    // Verificar se o usuário tem tipo ADMIN na tabela usuario_auth
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('usuario_auth')
      .select('tipo')
      .eq('id', user.id)
      .maybeSingle();

    // Se encontrou o registro, verificar se é ADMIN
    if (userData && !dbError) {
      const hasAccess = userData.tipo === 'ADMIN';
      return NextResponse.json({ hasAccess });
    }

    // FALLBACK: Se não encontrou registro (primeira sincronização),
    // permitir acesso temporário para que possa criar o registro
    console.log('⚠️ usuario_auth não encontrado, permitindo acesso temporário para primeira sincronização');
    return NextResponse.json({ hasAccess: true, temporaryAccess: true });

  } catch (error) {
    console.error('Erro ao verificar acesso debug:', error);
    return NextResponse.json({ hasAccess: false });
  }
}
