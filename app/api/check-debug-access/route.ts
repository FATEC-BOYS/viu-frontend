// app/api/check-debug-access/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Lista de emails com acesso debug (adicione seu email aqui)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export async function GET() {
  try {
    // Criar cliente Supabase com cookies do usuário
    const cookieStore = await cookies();
    const supabase = createClient(supabaseUrl, supabaseKey, {
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

    // Verificar se o email está na lista de admins
    const hasAccess = ADMIN_EMAILS.includes(user.email || '');

    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Erro ao verificar acesso debug:', error);
    return NextResponse.json({ hasAccess: false });
  }
}
