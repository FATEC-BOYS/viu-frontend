export const FEEDBACK_URL = "https://fbhmtiiqmnixlmuqraxn.supabase.co/functions/v1/submit-feedback";
export const STREAM_URL   = "https://fbhmtiiqmnixlmuqraxn.supabase.co/functions/v1/stream-audio";

type BasePayload = {
  token: string;
  arteId: string;
  arteVersaoId?: string | null;
  posX?: number | null;
  posY?: number | null;
  posXAbs?: number | null;
  posYAbs?: number | null;
  viewerEmail: string;
  viewerNome?: string | null;
};

export async function postTextFeedback(payload: BasePayload & { content: string }) {
  const res = await fetch(FEEDBACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      type: "text",
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postAudioFeedback(payload: BasePayload & { blob: Blob }) {
  const form = new FormData();
  form.set("meta", JSON.stringify({ ...payload, type: "audio" }));
  form.set("file", payload.blob, `feedback-${Date.now()}.webm`);

  const res = await fetch(FEEDBACK_URL, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// monta URL do stream (o endpoint valida token e path internamente)
export function getAudioStreamUrl(path: string, token: string) {
  const u = new URL(STREAM_URL);
  u.searchParams.set("path", path);
  u.searchParams.set("token", token);
  return u.toString();
}