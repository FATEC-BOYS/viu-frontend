// app/api/supabase-keys/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function b64urlDecode(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  return Buffer.from(s + "=".repeat(pad), "base64").toString("utf8");
}

function parseJwtMeta(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(b64urlDecode(parts[1]));
    return { ref: payload?.ref ?? null, role: payload?.role ?? null, iat: payload?.iat ?? null, exp: payload?.exp ?? null };
  } catch {
    return null;
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const urlRef = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null;

  const anonMeta = parseJwtMeta(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  const serviceMeta = parseJwtMeta(process.env.SUPABASE_SERVICE_ROLE_KEY || "");

  return new Response(
    JSON.stringify(
      {
        url,
        urlRef,
        anonMeta,       // { ref, role: "anon", iat, exp }
        serviceMeta,    // { ref, role: "service_role", iat, exp }
        refsMatchAnon: !!anonMeta?.ref && anonMeta.ref === urlRef,
        refsMatchService: !!serviceMeta?.ref && serviceMeta.ref === urlRef,
      },
      null,
      2
    ),
    { headers: { "content-type": "application/json" } }
  );
}
