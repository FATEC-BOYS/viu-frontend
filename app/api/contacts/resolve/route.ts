import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  const tipo = (url.searchParams.get("tipo") ?? "") as "CLIENTE" | "DESIGNER";

  if (!id || !["CLIENTE", "DESIGNER"].includes(tipo)) {
    return Response.json({ ok: false, label: null }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return Response.json({ ok: false, label: null }, { status: 401 });

  // Se for email, a label é o próprio email (ou nome se existir em contatos).
  const isEmail = EMAIL_RE.test(id);

  // Procura nos seus contatos:
  const { data, error } = await supabase
    .from("contatos")
    .select("email, nome, contato_usuario_id")
    .eq("owner_id", auth.user.id)
    .eq("tipo", tipo)
    .or(
      isEmail
        ? `email.eq.${id}`
        : `contato_usuario_id.eq.${id}`
    )
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ ok: true, label: isEmail ? id : id });

  // Se achou contato → nome || email; se não, e for email → o email; se não, mostra o id cru (último caso).
  const label = data ? (data.nome || data.email) : (isEmail ? id : id);
  return Response.json({ ok: true, label });
}
