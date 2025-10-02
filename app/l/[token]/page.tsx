// app/l/[token]/page.tsx
import { redirect, notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: { token: string } };

export default async function PublicLinkResolver({ params }: Props) {
  const supabase = getSupabaseServer(); // <- usa SR key no server

  const { data: link } = await supabase
    .from("link_compartilhado")
    .select("id, tipo, arte_id, projeto_id, expira_em")
    .eq("token", params.token)
    .maybeSingle();

  if (!link) return notFound();
  if (link.expira_em && new Date(link.expira_em) < new Date()) return notFound();

  if (link.tipo === "ARTE" && link.arte_id) {
    redirect(`/viewer/arte/${link.arte_id}?token=${params.token}`);
  }
  if (link.tipo === "PROJETO" && link.projeto_id) {
    redirect(`/viewer/projeto/${link.projeto_id}?token=${params.token}`);
  }

  return notFound();
}
