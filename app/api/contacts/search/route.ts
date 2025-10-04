import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const PAGE_SIZE_DEFAULT = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") ?? "").trim();
  const tipo = (url.searchParams.get("tipo") ?? "") as "CLIENTE" | "DESIGNER";
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "") || PAGE_SIZE_DEFAULT, 1),
    25
  );

  if (!["CLIENTE", "DESIGNER"].includes(tipo)) {
    return NextResponse.json({ items: [], error: "tipo inválido" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ items: [] }, { status: 401 });
  const ownerId = auth.user.id;

  const isEmailQuery = EMAIL_RE.test(qRaw);
  const q = qRaw.toLowerCase();
  if (!isEmailQuery && q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  let query = supabase
    .from("contatos")
    .select("id, email, nome, contato_usuario_id")
    .eq("owner_id", ownerId)
    .eq("tipo", tipo)
    .order("nome", { ascending: true })
    .limit(limit);

  if (isEmailQuery) {
    query = query.or(`email.eq.${q},nome.ilike.%${q}%`);
  } else {
    query = query.or(`email.ilike.%${q}%,nome.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [] }, { status: 200 });

  const items = (data ?? []).map((c) => ({
    id: c.contato_usuario_id || c.email,   // se não tem user, usa e-mail como id lógico
    label: c.nome || c.email,
    email: c.email,
    isPendingUser: !c.contato_usuario_id,  // contato sem conta ainda
    isNew: false,
  }));

  const hasExactEmail = items.some((i) => i.email.toLowerCase() === q);
  if (isEmailQuery && !hasExactEmail) {
    items.unshift({
      id: q,
      label: q,
      email: q,
      isPendingUser: true,
      isNew: true,                         
    });
  }

  return NextResponse.json({ items });
}
