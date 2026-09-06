// app/api/arte/[id]/aprovacoes/route.ts
import { backendFetch, credenciaisDaRequisicao } from "@/lib/serverBackend";
import { NextRequest, NextResponse } from "next/server";


/** Valida o token público via GET /preview/:token */
async function validateToken(arteId: string, token: string): Promise<boolean> {
  try {
    const res = await backendFetch(`/preview/${token}`, { cache: "no-store" });
    if (!res.ok) return false;
    const body = await res.json();
    return body?.data?.arte?.id === arteId;
  } catch {
    return false;
  }
}

/**
 * GET /api/arte/[id]/aprovacoes?token=...
 * Valida o token e busca aprovações do backend (requer sessão).
 * Sem sessão, retorna lista vazia — convidados não veem aprovações.
 *
 * Não existe mais `versao: 1` fixo nem `convidados: []`: o primeiro fazia o
 * painel anunciar "(v1)" para sempre, e o segundo alimentava uma seção
 * "Aprovações via link" que nunca teve fonte de dados.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  const valid = await validateToken(arteId, token);
  if (!valid) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 403 });
  }

  // tenta buscar aprovações com JWT do usuário autenticado
  const auth = credenciaisDaRequisicao(req);
  if (!auth) {
    return NextResponse.json({ aprovacoes: [] });
  }

  try {
    const res = await backendFetch(`/aprovacoes?arteId=${arteId}&limit=50`, {
      headers: { ...auth },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ aprovacoes: [] });

    const body = await res.json();
    const aprovacoes = (body.data ?? []).map((a: any) => ({
      id: a.id,
      status: a.status,
      comentario: a.comentario ?? null,
      criadoEm: a.criadoEm ?? '',
      // O backend passou a registrar qual entrega foi julgada. Sem isso a tela
      // não consegue dizer "você aprovou a v2, a v3 continua pendente".
      versaoNumero: a.versaoNumero ?? null,
      aprovador: a.aprovador
        ? { id: a.aprovador.id, nome: a.aprovador.nome ?? null }
        : null,
    }));

    return NextResponse.json({ aprovacoes });
  } catch (e) {
    console.error("[GET /api/arte/[id]/aprovacoes] erro:", e);
    return NextResponse.json({ aprovacoes: [] });
  }
}

/**
 * PATCH /api/arte/[id]/aprovacoes
 * Body: { aprovadorId, decisao, comentario?, versao? }
 * Requer Authorization header com JWT do usuário autenticado.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: arteId } = await context.params;
  const auth = credenciaisDaRequisicao(req);

  if (!auth) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { aprovadorId, decisao, comentario } = body;

  if (!aprovadorId || !decisao) {
    return NextResponse.json(
      { error: "aprovadorId e decisao são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    // Encontra a aprovação pelo arteId + aprovadorId
    const listRes = await backendFetch(`/aprovacoes?arteId=${arteId}&aprovadorId=${aprovadorId}&limit=1`,
      { headers: { ...auth }, cache: "no-store" }
    );
    if (!listRes.ok) throw new Error("Falha ao buscar aprovação.");

    const listBody = await listRes.json();
    const aprovacao = listBody.data?.[0];
    if (!aprovacao) {
      return NextResponse.json({ error: "Aprovação não encontrada." }, { status: 404 });
    }

    const updateRes = await backendFetch(`/aprovacoes/${aprovacao.id}`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ status: decisao, comentario: comentario ?? null }),
    });
    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message ?? "Erro ao aplicar decisão." }, { status: updateRes.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/arte/[id]/aprovacoes] erro:", e);
    return NextResponse.json({ error: "Não foi possível aplicar a decisão." }, { status: 500 });
  }
}
