import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as { email: string; nome?: string; tipo: "CLIENTE" | "DESIGNER" };
  const email = (body?.email || "").trim().toLowerCase();
  const tipo = body?.tipo;

  if (!EMAIL_RE.test(email) || !["CLIENTE", "DESIGNER"].includes(tipo)) {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contatos")
    .upsert(
      { owner_id: auth.user.id, email, nome: body?.nome ?? null, tipo },
      { onConflict: "owner_id,email" }
    )
    .select("id, email, nome, contato_usuario_id")
    .single();

  if (error) return NextResponse.json({ ok: false }, { status: 200 });

  return NextResponse.json({
    ok: true,
    item: {
      id: data.contato_usuario_id || data.email,
      label: data.nome || data.email,
      email: data.email,
      isPendingUser: !data.contato_usuario_id,
      isNew: false,
    },
  });
}
