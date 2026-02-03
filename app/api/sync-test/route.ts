// app/api/sync-test/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório. Use ?userId=xxx' },
        { status: 400 }
      );
    }

    // Buscar usuário no Supabase
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

    console.log('🧪 Testando sincronização...', payload);

    // Fazer requisição para o backend
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

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      supabaseUser: {
        id: user.id,
        email: user.email,
        metadata: meta,
      },
      payload,
      backendResponse: responseData,
    });
  } catch (error) {
    console.error('Erro no teste de sincronização:', error);
    return NextResponse.json(
      {
        error: 'Erro ao testar sincronização',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
