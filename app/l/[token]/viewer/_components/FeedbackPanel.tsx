// app/l/[token]/viewer/_components/FeedbackPanel.tsx
"use client";

import { useRef, useState } from "react";
import { saveAudioFeedback, createGuestUser, updateFeedbackStatus } from "../_actions";

type Feedback = {
  id: string;
  conteudo: string;
  tipo: "TEXTO" | "AUDIO";
  arquivo: string | null;
  status: "ABERTO" | "EM_ANALISE" | "RESOLVIDO" | "ARQUIVADO";
  criado_em: string;
};

export default function FeedbackPanel({
  arteId,
  initialFeedbacks,
  readOnly,
  token,
}: {
  arteId: string;
  initialFeedbacks: Feedback[];
  readOnly: boolean;
  token: string;
}) {
  const [items, setItems] = useState(initialFeedbacks);
  const [recState, setRecState] = useState<"idle" | "recording" | "ready">("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function ensureAuthorId(): Promise<string | null> {
    let authorId: string | null = localStorage.getItem("viu-author-id");
    if (!authorId) {
      const nome = window.prompt("Digite seu nome:");
      const email = window.prompt("Digite seu email:");
      if (!nome || !email) return null;

      const newUser = await createGuestUser({ nome, email });
      if (!newUser) return null;

      authorId = newUser.id;
      localStorage.setItem("viu-author-id", authorId);
    }
    return authorId;
  }

  async function startRec() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => setRecState("ready");
    mediaRef.current = rec;
    rec.start();
    setRecState("recording");
  }

  function stopRec() {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }

  async function sendAudio() {
    if (!chunksRef.current.length) return;

    const authorId = await ensureAuthorId();
    if (!authorId) return;

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    // monta FormData compatível com saveAudioFeedback
    const fd = new FormData();
    fd.append("token", token);
    fd.append("arteId", arteId);
    fd.append("authorId", authorId);
    fd.append("file", new File([blob], "feedback.webm", { type: "audio/webm" }));

    const created = await saveAudioFeedback(fd);
    if (created) setItems((prev) => [created, ...prev]);

    setRecState("idle");
  }

  return (
    <aside className="space-y-4">
      <div className="border rounded-xl p-3">
        <div className="font-semibold">Feedback por áudio</div>
        <p className="text-sm text-muted-foreground">
          Nosso diferencial: grave e envie seu comentário.
        </p>

        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-2 border rounded"
            disabled={readOnly || recState === "recording"}
            onClick={startRec}
          >
            Gravar
          </button>
          <button
            className="px-3 py-2 border rounded"
            disabled={recState !== "recording"}
            onClick={stopRec}
          >
            Parar
          </button>
          <button
            className="px-3 py-2 border rounded"
            disabled={recState !== "ready"}
            onClick={sendAudio}
          >
            Enviar
          </button>
        </div>
        <div className="text-xs mt-1 text-muted-foreground">Formato: webm/opus</div>
      </div>

      <div className="border rounded-xl p-3">
        <div className="font-semibold mb-2">Feedbacks</div>
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="border rounded p-2">
              <div className="text-xs text-muted-foreground">
                {new Date(f.criado_em).toLocaleString()}
              </div>
              <div className="mt-1">
                {f.tipo === "AUDIO" && f.arquivo ? (
                  <audio controls src={f.arquivo} className="w-full" />
                ) : (
                  <p>{f.conteudo}</p>
                )}
              </div>

              {/* status + resposta (simples) */}
              <div className="mt-2 flex items-center gap-2">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={f.status}
                  onChange={async (e) => {
                    const s = e.target.value as Feedback["status"];
                    const ok = await updateFeedbackStatus({ id: f.id, status: s });
                    if (ok)
                      setItems((prev) =>
                        prev.map((it) => (it.id === f.id ? { ...it, status: s } : it))
                      );
                  }}
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="EM_ANALISE">Em análise</option>
                  <option value="RESOLVIDO">Resolvido</option>
                  <option value="ARQUIVADO">Arquivado</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
