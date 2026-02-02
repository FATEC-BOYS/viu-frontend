import { NextResponse } from "next/server";

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
  "audio/x-m4a",
];

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let audioBuffer: ArrayBuffer;
    let filename = "audio.webm";
    let fileType = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Arquivo de áudio ausente" }, { status: 400 });
      }
      
      // Validate file type
      fileType = file.type;
      if (!ALLOWED_AUDIO_TYPES.includes(fileType)) {
        return NextResponse.json(
          { error: "Tipo de arquivo inválido. Apenas arquivos de áudio são permitidos." },
          { status: 400 }
        );
      }
      
      audioBuffer = await file.arrayBuffer();
      filename = file.name || filename;
    } else {
      // For raw body, validate content-type header
      if (contentType && !ALLOWED_AUDIO_TYPES.some(type => contentType.includes(type))) {
        return NextResponse.json(
          { error: "Tipo de arquivo inválido. Apenas arquivos de áudio são permitidos." },
          { status: 400 }
        );
      }
      audioBuffer = await req.arrayBuffer();
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor" },
        { status: 503 }
      );
    }

    // Build multipart form for OpenAI Whisper API
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBuffer], { type: "audio/webm" }),
      filename
    );
    formData.append("model", "whisper-1");
    formData.append("language", "pt");
    formData.append("response_format", "json");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error("[transcribe] OpenAI Whisper error:", whisperRes.status, err);
      return NextResponse.json(
        { error: "Falha na transcrição do áudio" },
        { status: 502 }
      );
    }

    const result = await whisperRes.json();

    return NextResponse.json({
      text: result.text || "",
      language: result.language || "pt",
    });
  } catch (e: any) {
    console.error("[transcribe] erro:", e);
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 });
  }
}
