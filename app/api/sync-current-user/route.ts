// app/api/sync-current-user/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório no body' },
        { status: 400 }
      );
    }

    // Buscar usuário no Supabase Auth
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
      userId
    );

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado no Supabase Auth', details: authError },
        { status: 404 }
      );
    }

    const user = authUser.user;
    const meta = (user.user_metadata ?? {}) as Record<string, any>;

    const nome: string =
      meta.name ??
      meta.full_name ??
      meta.fullName ??
      meta.fullname ??
      meta.user_name ??
      (user.email ? user.email.split('@')[0] : 'Usuário');

    const avatar: string | undefined =
      meta.avatar_url ?? meta.picture ?? undefined;

    const provider: string = user.app_metadata?.provider ?? 'email';

    const payload = {
      supabaseId: user.id,
      email: user.email,
      nome,
      avatar,
      provider,
    };

    console.log('🔄 [API] Sincronizando usuário...', payload);

    // 1. Garantir que usuário existe na tabela usuarios do Supabase
    const { error: upsertErr } = await supabase
      .from('usuarios')
      .upsert(
        {
          id: user.id,
          email: user.email!,
          nome,
          tipo: (meta.tipo as 'DESIGNER' | 'CLIENTE') || 'DESIGNER',
          avatar: avatar ?? null,
          ativo: true,
        },
        { onConflict: 'id' }
      );

    if (upsertErr) {
      console.warn('⚠️ Erro ao criar usuário na tabela usuarios:', upsertErr);
    } else {
      console.log('✅ Usuário criado/atualizado na tabela usuarios');
    }

    // 2. Sincronizar com backend (Prisma)
    const backendUrl = 'https://viu-backend-production.up.railway.app';
    const response = await fetch(`${backendUrl}/auth/supabase/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log('📡 [API] Resposta do backend:', {
      status: response.status,
      data: responseData,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Falha ao sincronizar com backend',
          supabaseSync: !upsertErr,
          backendStatus: response.status,
          backendResponse: responseData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário sincronizado com sucesso',
      supabaseSync: !upsertErr,
      backendSync: true,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ [API] Erro ao sincronizar usuário:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao sincronizar usuário',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
