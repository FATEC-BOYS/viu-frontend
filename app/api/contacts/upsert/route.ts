import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

// Contatos são agora resolvidos diretamente pelo backend via /usuarios.
// Não há tabela de contatos local — o upsert é no-op para compatibilidade.
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    nome?: string;
    tipo?: "CLIENTE" | "DESIGNER";
  };
  const email = (body?.email || "").trim().toLowerCase();
  const tipo = body?.tipo;

  if (!EMAIL_RE.test(email) || !tipo || !["CLIENTE", "DESIGNER"].includes(tipo)) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      id: email,
      label: body?.nome || email,
      email,
      isPendingUser: true,
      isNew: false,
    },
  });
}
