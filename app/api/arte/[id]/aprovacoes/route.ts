// app/api/arte/[id]/aprovacoes/route.ts
import { acessoAArte, backendFetch, credenciaisDaRequisicao } from "@/lib/serverBackend";
import { NextRequest, NextResponse } from "next/server";

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
  const token = req.nextUrl.searchParams.get("token");

  /*
   * Token OU sessão. Antes era só token, e a rota respondia 400 sem ele — o
   * que deixava a arte sem endereço para quem está logado. Quem é do projeto
   * chega aqui pela própria conta.
   */
  const acesso = await acessoAArte(req, arteId, token);
  if (!acesso.ok) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 403 });
  }

  // Sem sessão não há aprovações a mostrar: aprovar exige conta.
  const auth = acesso.credenciais;
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
 * Body: { aprovacaoId, decisao, comentario?, aprovadorId? }
 * Requer Authorization header com JWT do usuário autenticado.
 *
 * `aprovacaoId` é o id que a tela escolheu e mostrou. `aprovadorId` continua
 * aceito como caminho de compatibilidade, para clientes que ainda não foram
 * atualizados; é ele que obriga a reconsulta descrita abaixo.
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
  const { aprovacaoId, aprovadorId, decisao, comentario } = body;

  if (!decisao || (!aprovacaoId && !aprovadorId)) {
    return NextResponse.json(
      { error: "aprovacaoId (ou aprovadorId) e decisao são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    /*
     * Quando a tela manda o id, não se redescobre nada.
     *
     * A reconsulta abaixo existia para achar a pendência a partir do
     * aprovador. Ela e a busca que alimenta a barra de decisão são duas
     * consultas diferentes, com limites diferentes, concordando por um
     * `orderBy` que nenhuma das duas declara — e a mesma pessoa pode ter duas
     * pendências abertas na mesma arte, porque `solicitarAprovacao` deduplica
     * por `versaoNumero`. O modo de falhar é aplicar a decisão na versão
     * errada, que neste produto é o ato que vale.
     *
     * Não é buraco de autorização passar o id: o backend recusa com 403
     * quando `aprovacao.aprovadorId !== usuario.id`, qualquer que seja o
     * caminho.
     */
    let alvo: string | null = aprovacaoId ?? null;

    if (!alvo) {
      /*
       * Caminho de compatibilidade. Encontra a PENDÊNCIA — não "a aprovação
       * mais recente": sem `status=PENDENTE`, a busca ordenada por `criadoEm
       * desc` podia devolver uma decisão já tomada (de uma versão mais nova)
       * enquanto a versão anterior seguia esperando. O backend respondia 409
       * "é terminal", e a tela dizia que a decisão falhou sem nunca ter
       * chegado na linha certa.
       */
      const listRes = await backendFetch(
        `/aprovacoes?arteId=${arteId}&aprovadorId=${aprovadorId}&status=PENDENTE&limit=1`,
        { headers: { ...auth }, cache: "no-store" }
      );
      if (!listRes.ok) throw new Error("Falha ao buscar aprovação.");

      const listBody = await listRes.json();
      alvo = listBody.data?.[0]?.id ?? null;
    }

    if (!alvo) {
      return NextResponse.json(
        { error: "Não há decisão pendente sua nesta arte." },
        { status: 404 },
      );
    }

    const updateRes = await backendFetch(`/aprovacoes/${alvo}`, {
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
