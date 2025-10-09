import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ use a chave SERVICE ROLE
);

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ----------- JSON (texto) -----------
    if (contentType.includes("application/json")) {
      const { token, arteId, tipo, conteudo, viewer } = await req.json();

      // valida link
      const { data: link } = await supabase
        .from("link_compartilhado")
        .select("id, tipo, arte_id, expira_em, somente_leitura, can_comment")
        .eq("token", token)
        .maybeSingle();

      if (
        !link ||
        link.tipo !== "ARTE" ||
        link.arte_id !== arteId ||
        (link.expira_em && new Date(link.expira_em) < new Date()) ||
        link.somente_leitura ||
        !link.can_comment
      ) {
        return NextResponse.json({ error: "Link inválido ou bloqueado" }, { status: 403 });
      }

      // upsert do viewer
      const { data: guest } = await supabase
        .from("viewer_guests")
        .upsert({ email: viewer.email, nome: viewer.nome ?? null }, { onConflict: "email" })
        .select("id, email, nome")
        .maybeSingle();

      if (!guest) throw new Error("Falha ao identificar viewer");

      // cria feedback
      const { data: feedback, error } = await supabase
        .from("feedbacks")
        .insert({
          conteudo,
          tipo,
          arte_id: arteId,
          autor_externo_id: guest.id,
          autor_email: guest.email,
          autor_nome: guest.nome,
        })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json(feedback, { status: 201 });
    }

    // ----------- ÁUDIO (form-data) -----------
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const token = String(form.get("token") || "");
      const arteId = String(form.get("arteId") || "");
      const email = String(form.get("email") || "");
      const nome = (form.get("nome") as string) || null;
      const file = form.get("file") as File | null;

      if (!file) throw new Error("Arquivo ausente");

      // valida link
      const { data: link } = await supabase
        .from("link_compartilhado")
        .select("id, tipo, arte_id, expira_em, somente_leitura, can_comment")
        .eq("token", token)
        .maybeSingle();

      if (
        !link ||
        link.tipo !== "ARTE" ||
        link.arte_id !== arteId ||
        (link.expira_em && new Date(link.expira_em) < new Date()) ||
        link.somente_leitura ||
        !link.can_comment
      ) {
        return NextResponse.json({ error: "Link inválido ou bloqueado" }, { status: 403 });
      }

      // garante viewer
      const { data: guest } = await supabase
        .from("viewer_guests")
        .upsert({ email, nome }, { onConflict: "email" })
        .select("id, email, nome")
        .maybeSingle();

      if (!guest) throw new Error("Falha ao identificar viewer");

      // envia arquivo para o bucket feedbacks
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const ext = file.name.split(".").pop() || "webm";
      const path = `${arteId}/${crypto.randomUUID()}.${ext}`;

      const { data: up, error: upErr } = await supabase.storage
        .from("feedbacks")
        .upload(path, bytes, {
          contentType: file.type || "audio/webm",
        });

      if (upErr) throw upErr;

      const { data: pub } = await supabase.storage.from("feedbacks").getPublicUrl(up.path);

      const { data: feedback, error } = await supabase
        .from("feedbacks")
        .insert({
          tipo: "AUDIO",
          arquivo: pub.publicUrl,
          arte_id: arteId,
          autor_externo_id: guest.id,
          autor_email: guest.email,
          autor_nome: guest.nome,
        })
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json(feedback, { status: 201 });
    }

    return NextResponse.json({ error: "Formato não suportado" }, { status: 415 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 });
  }
}
