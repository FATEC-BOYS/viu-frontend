import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
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

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ items: [] }, { status: 401 });

  const isEmailQuery = EMAIL_RE.test(qRaw);
  const q = qRaw.toLowerCase();
  if (!isEmailQuery && q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/usuarios?tipo=${tipo}&limit=200`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ items: [] }, { status: 200 });

    const body = await res.json();
    const all: any[] = body.data ?? [];

    const matched = all.filter((u: any) => {
      const nome = (u.nome ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      if (isEmailQuery) return email === q || nome.includes(q);
      return email.includes(q) || nome.includes(q);
    });

    const items = matched.slice(0, limit).map((u: any) => ({
      id: u.id,
      label: u.nome || u.email,
      email: u.email,
      isPendingUser: false,
      isNew: false,
    }));

    const hasExactEmail = items.some((i: any) => i.email?.toLowerCase() === q);
    if (isEmailQuery && !hasExactEmail) {
      items.unshift({ id: q, label: q, email: q, isPendingUser: true, isNew: true });
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
