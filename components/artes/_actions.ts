// components/artes/wizard/_actions.ts
"use server";

// TODO: Migrado do Supabase para chamada REST ao viu-backend.
// Endpoint equivalente: POST /links
// Este é dead code (não importado em lugar nenhum) — implementar ao ativar.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "";

export async function createSharedLink(input: {
  token: string;
  arteId: string;
  expiraDias: number;
  somenteLeitura: boolean;
}) {
  const dias = Math.max(1, Math.min(365, input.expiraDias || 7));
  const expira = new Date();
  expira.setDate(expira.getDate() + dias);

  // TODO: implementar cookie-based auth para server actions
  const res = await fetch(`${BASE_URL}/links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Authorization: `Bearer ${cookieToken}`,
    },
    body: JSON.stringify({
      token: input.token,
      tipo: "ARTE",
      arteId: input.arteId,
      expiraEm: expira.toISOString(),
      somenteLeitura: !!input.somenteLeitura,
    }),
  });

  if (!res.ok) throw new Error(`Erro ao criar link: ${res.statusText}`);
  const data = await res.json();
  return data?.data ?? data;
}
