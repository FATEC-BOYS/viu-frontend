import { NextResponse } from "next/server";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];

export async function POST(req: Request) {
  try {
    const { text, voice } = (await req.json()) as {
      text?: string;
      voice?: string;
    };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no servidor" },
        { status: 503 }
      );
    }

    const selectedVoice: Voice = VOICES.includes(voice as Voice)
      ? (voice as Voice)
      : "nova";

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.slice(0, 4096), // OpenAI limit
        voice: selectedVoice,
        response_format: "mp3",
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("[tts] OpenAI TTS error:", ttsRes.status, err);
      return NextResponse.json(
        { error: "Falha ao gerar áudio" },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline; filename=\"feedback-tts.mp3\"",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    console.error("[tts] erro:", e);
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 });
  }
}
