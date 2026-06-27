import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  const tipo = (url.searchParams.get("tipo") ?? "") as "CLIENTE" | "DESIGNER";

  if (!id || !["CLIENTE", "DESIGNER"].includes(tipo)) {
    return Response.json({ ok: false, label: null }, { status: 400 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return Response.json({ ok: false, label: null }, { status: 401 });

  const isEmail = EMAIL_RE.test(id);

  try {
    if (!isEmail) {
      // É um UUID — busca direto pelo id
      const res = await fetch(`${BACKEND_URL}/usuarios/${id}`, {
        headers: { Authorization: authHeader },
        cache: "no-store",
      });
      if (!res.ok) return Response.json({ ok: true, label: id });
      const body = await res.json();
      const u = body.data;
      return Response.json({ ok: true, label: u?.nome || u?.email || id });
    }

    // É email — busca todos do tipo e filtra
    const res = await fetch(`${BACKEND_URL}/usuarios?tipo=${tipo}&limit=200`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ ok: true, label: id });
    const body = await res.json();
    const found = (body.data ?? []).find((u: any) => u.email?.toLowerCase() === id.toLowerCase());
    return Response.json({ ok: true, label: found ? (found.nome || found.email) : id });
  } catch {
    return Response.json({ ok: true, label: id });
  }
}
