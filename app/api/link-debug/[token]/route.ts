export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function GET(_req: Request, ctx: any) {
  const p = ctx?.params;
  const { token } = p && typeof p.then === "function" ? await p : p || {};

  try {
    const res = await fetch(`${BACKEND_URL}/preview/${token}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);

    const out: any = { status: res.status, ok: res.ok };

    if (res.ok && body?.data) {
      const { arte, somenteLeitura } = body.data;
      out.link = { token, somenteLeitura };
      out.arte = arte ? { id: arte.id, nome: arte.nome, arquivo: arte.arquivo } : null;
    } else {
      out.error = body?.message ?? "Link não encontrado ou expirado";
    }

    return new Response(JSON.stringify(out, null, 2), {
      status: res.ok ? 200 : res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "Erro interno" }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
