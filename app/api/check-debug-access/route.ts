// app/api/check-debug-access/route.ts
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ hasAccess: false });

  try {
    const res = await fetch(`${BACKEND_URL}/me`, {
      headers: { Authorization: authHeader },
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
