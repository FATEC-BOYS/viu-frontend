"use client";

import { useRef, useState } from "react";
import { saveAudioFeedback, updateFeedbackStatus } from "../_actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mic, Square, UploadCloud } from "lucide-react";

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

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => setRecState("ready");
      mediaRef.current = rec;
      rec.start();
      setRecState("recording");
    } catch {
      toast.error("Permita o microfone para gravar áudio.");
    }
  }
  function stopRec() {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }
  async function sendAudio() {
    if (!chunksRef.current.length) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    // FormData requerido pela server action
    const fd = new FormData();
    fd.append("token", token);
    fd.append("arteId", arteId);

    // opcional: autorId (se você já tiver salvo no localStorage)
    const authorId = localStorage.getItem("viu-author-id") || "";
    if (authorId) fd.append("authorId", authorId);

    fd.append("file", new File([blob], "feedback.webm", { type: "audio/webm" }));

    const created = await saveAudioFeedback(fd as any);
    if (created) {
      setItems((prev) => [created as Feedback, ...prev]);
      setRecState("idle");
      toast.success("Áudio enviado!");
    } else {
      toast.error("Falha ao enviar áudio.");
    }
  }

  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedback por áudio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={readOnly || recState === "recording"} onClick={startRec}>
              <Mic className="h-4 w-4 mr-1" /> Gravar
            </Button>
            <Button variant="outline" size="sm" disabled={recState !== "recording"} onClick={stopRec}>
              <Square className="h-4 w-4 mr-1" /> Parar
            </Button>
            <Button size="sm" disabled={recState !== "ready"} onClick={sendAudio}>
              <UploadCloud className="h-4 w-4 mr-1" /> Enviar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formato: <code>webm/opus</code>. Use para comentários rápidos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {items.map((f) => (
              <li key={f.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">{new Date(f.criado_em).toLocaleString()}</div>
                  <Select
                    value={f.status}
                    onValueChange={async (v) => {
                      const s = v as Feedback["status"];
                      const ok = await updateFeedbackStatus({ id: f.id, status: s });
                      if (ok) {
                        setItems((prev) => prev.map((it) => (it.id === f.id ? { ...it, status: s } : it)));
                        toast.success("Status atualizado");
                      } else {
                        toast.error("Não foi possível atualizar o status");
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[150px]" disabled={readOnly}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABERTO">Aberto</SelectItem>
                      <SelectItem value="EM_ANALISE">Em análise</SelectItem>
                      <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                      <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-2">
                  {f.tipo === "AUDIO" && f.arquivo ? (
                    <audio controls src={f.arquivo} className="w-full rounded-lg" />
                  ) : (
                    <p className="text-sm leading-relaxed">{f.conteudo}</p>
                  )}
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-sm text-muted-foreground py-6 text-center">
                Ainda não há feedbacks. Seja o primeiro! 🙂
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </aside>
  );
}
