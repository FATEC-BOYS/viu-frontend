// components/artes/wizard/_actions.ts
"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";

export async function createSharedLink(input: {
  token: string;
  arteId: string;
  expiraDias: number;     // 1..365
  somenteLeitura: boolean;
}) {
  const supabase = getSupabaseServer();

  const dias = Math.max(1, Math.min(365, input.expiraDias || 7));
  const expira = new Date();
  expira.setDate(expira.getDate() + dias);

  const { data, error } = await supabase
    .from("link_compartilhado")
    .insert({
      token: input.token,
      tipo: "ARTE",
      arte_id: input.arteId,
      expira_em: expira.toISOString(),
      somente_leitura: !!input.somenteLeitura,
    })
    .select("id, token")
    .single();

  if (error) throw error;
  return data;
}
