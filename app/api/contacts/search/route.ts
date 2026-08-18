import { backendFetch } from "@/lib/serverBackend";
import { NextResponse } from "next/server";

const PAGE_SIZE_DEFAULT = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
// GET /usuarios/buscar exige ao menos 3 caracteres
const MIN_QUERY = 3;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const tipo = (url.searchParams.get("tipo") ?? "") as "CLIENTE" | "DESIGNER";
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "") || PAGE_SIZE_DEFAULT, 1),
    20
  );

  if (!["CLIENTE", "DESIGNER"].includes(tipo)) {
    return NextResponse.json({ items: [], error: "tipo inválido" }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ items: [] }, { status: 401 });

  const isEmailQuery = EMAIL_RE.test(qRaw);
  const q = qRaw.toLowerCase();
  if (qRaw.length < MIN_QUERY) {
    return NextResponse.json({ items: [] });
  }

  try {
    // GET /usuarios é restrito a ADMIN; /usuarios/buscar é o typeahead aberto a
    // qualquer autenticado. Ele não filtra por tipo, então filtramos aqui.
    const res = await backendFetch(`/usuarios/buscar?q=${encodeURIComponent(qRaw)}&limit=20`,
      { headers: { Authorization: authHeader }, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ items: [] }, { status: 200 });

    const body = await res.json();
    const encontrados: any[] = (body.data ?? []).filter((u: any) => u.tipo === tipo);

    const items = encontrados.slice(0, limit).map((u: any) => ({
      id: u.id,
      label: u.nome || u.email,
      email: u.email,
      isPendingUser: false,
      isNew: false,
    }));

    // e-mail digitado por inteiro que não existe ainda vira convite
    const hasExactEmail = items.some((i: any) => i.email?.toLowerCase() === q);
    if (isEmailQuery && !hasExactEmail) {
      items.unshift({ id: q, label: q, email: q, isPendingUser: true, isNew: true });
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
