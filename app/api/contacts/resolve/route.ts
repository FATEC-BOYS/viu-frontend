import { backendFetch, credenciaisDaRequisicao } from "@/lib/serverBackend";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * Traduz um id (ou e-mail) de contato para um rótulo legível.
 *
 * GET /usuarios/:id exige ownership, então um designer não consegue ler o
 * cadastro do próprio cliente por ali. O fallback procura a pessoa entre os
 * participantes dos projetos do usuário, que é o escopo que ele já enxerga.
 *
 * Quando nem isso acha, devolve `label: null` — e não o id. Devolver o id como
 * se fosse rótulo punha "c09e853bcfdce8af1a54d9534" no campo "Cliente
 * principal" do modal de novo projeto, e é justamente no primeiro projeto de um
 * cliente que o fallback não tem como funcionar: ele procura entre os projetos
 * existentes, e ainda não há nenhum. Sem nome, quem chama decide o que mostrar.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  const tipo = (url.searchParams.get("tipo") ?? "") as "CLIENTE" | "DESIGNER";

  if (!id || !["CLIENTE", "DESIGNER"].includes(tipo)) {
    return NextResponse.json({ ok: false, label: null }, { status: 400 });
  }

  const auth = credenciaisDaRequisicao(req);
  if (!auth) return NextResponse.json({ ok: false, label: null }, { status: 401 });

  const headers = { ...auth };
  const isEmail = EMAIL_RE.test(id);
  const rotulo = (u: any) => u?.nome || u?.email || id;

  try {
    if (!isEmail) {
      const res = await backendFetch(`/usuarios/${id}`, { headers });
      if (res.ok) {
        const body = await res.json();
        return NextResponse.json({ ok: true, label: rotulo(body.data) });
      }
    }

    // Fallback: procura nos projetos do usuário
    const campo = tipo === "CLIENTE" ? "cliente" : "designer";
    const res = await backendFetch(`/projetos?page=1&limit=100`, { headers });
    if (res.ok) {
      const body = await res.json();
      const alvo = id.toLowerCase();
      const achado = (body.data ?? [])
        .map((p: any) => p[campo])
        .find((u: any) => u && (u.id === id || u.email?.toLowerCase() === alvo));
      if (achado) return NextResponse.json({ ok: true, label: rotulo(achado) });
    }

    return NextResponse.json({ ok: true, label: null });
  } catch {
    return NextResponse.json({ ok: true, label: null });
  }
}
