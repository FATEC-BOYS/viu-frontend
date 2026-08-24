// app/api/check-debug-access/route.ts
import { backendFetch, credenciaisDaRequisicao } from "@/lib/serverBackend";
import { NextResponse } from "next/server";


export async function GET(req: Request) {
  const auth = credenciaisDaRequisicao(req);
  if (!auth) return NextResponse.json({ hasAccess: false });

  try {
    const res = await backendFetch(`/me`, {
      headers: { ...auth },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ hasAccess: false });
    const body = await res.json();
    const tipo = body?.data?.tipo ?? "";
    return NextResponse.json({ hasAccess: tipo === "ADMIN" });
  } catch {
    return NextResponse.json({ hasAccess: false });
  }
}
