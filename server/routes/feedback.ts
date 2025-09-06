import { RequestHandler } from "express";
import { ensureBucket, supabaseAdmin } from "../lib/supabase";

export const handleCreateFeedback: RequestHandler = async (req, res) => {
  const { text, audioBase64, arteId, autorId } = req.body || {};

  if (!supabaseAdmin) {
    return res
      .status(501)
      .json({
        error:
          "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      });
  }

  let audioPath: string | null = null;
  try {
    if (audioBase64 && typeof audioBase64 === "string") {
      await ensureBucket("feedbacks");
      const b64 = audioBase64.replace(
        /^data:audio\/(webm|ogg|mpeg);base64,/,
        "",
      );
      const buf = Buffer.from(b64, "base64");
      const path = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.webm`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("feedbacks")
        .upload(path, buf, { contentType: "audio/webm" });
      if (upErr) throw upErr;
      audioPath = path;
    }
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message || "Falha ao enviar áudio" });
  }

  // Inserção em tabela real fica para quando tivermos IDs válidos e RLS definidas
  return res.json({
    ok: true,
    storedAudioPath: audioPath,
    text: text || null,
    arteId: arteId || null,
    autorId: autorId || null,
  });
};
