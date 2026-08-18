// app/api/feedbacks/[id]/respostas/route.ts
import { backendFetch } from "@/lib/serverBackend";
import { NextResponse } from "next/server";

/**
 * Thread de um feedback. O backend modela resposta como um feedback com
 * parentId apontando para o pai (migration 20240106000000_feedback_threads),
 * então ler é GET /feedbacks/:id (que já traz respostas) e responder é
 * POST /feedbacks com parentId.
 */
/** O backend devolve criadoEm/autor; a tela lê criado_em/autor. */
function normalizar(r: any) {
  return {
    id: r?.id,
    conteudo: r?.conteudo ?? "",
    criado_em: r?.criadoEm ?? r?.criado_em ?? "",
    autor: {
      id: r?.autor?.id ?? r?.autorId ?? "",
      nome: r?.autor?.nome ?? "Usuário",
      avatar: r?.autor?.avatar ?? null,
    },
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json([], { status: 401 });

  try {
    const res = await backendFetch(`/feedbacks/${id}`, {
      headers: { Authorization: authHeader },
    });
    if (!res.ok) return NextResponse.json([]);
    const body = await res.json();
    return NextResponse.json((body?.data?.respostas ?? []).map(normalizar));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { conteudo } = await req.json();
    if (!String(conteudo ?? "").trim()) {
      return NextResponse.json({ error: "Conteúdo vazio." }, { status: 400 });
    }

    // arteId sai do próprio pai — a resposta vive na mesma arte, e o backend
    // recusa parentId de outra arte.
    const paiRes = await backendFetch(`/feedbacks/${id}`, {
      headers: { Authorization: authHeader },
    });
    if (!paiRes.ok) {
      return NextResponse.json({ error: "Feedback não encontrado." }, { status: 404 });
    }
    const pai = (await paiRes.json())?.data;

    const res = await backendFetch("/feedbacks", {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        conteudo: String(conteudo).slice(0, 2000),
        tipo: "TEXTO",
        arteId: pai?.arte?.id ?? pai?.arteId,
        parentId: id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.message ?? "Falha ao responder." }, { status: res.status });
    }
    return NextResponse.json({ resposta: normalizar(data?.data ?? data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao enviar resposta." }, { status: 500 });
  }
}
