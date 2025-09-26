"use client";
import { useEffect, useState } from "react";
import { listRespostas, addResposta } from "@/lib/feedbacks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ReplyThread({
  feedbackId,
  canReply,
  currentUsuarioId, // id da tabela usuarios (não o auth uid)
}: {
  feedbackId: string;
  canReply: boolean;
  currentUsuarioId?: string | null;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await listRespostas(feedbackId);
    setRows(data);
  }
  useEffect(() => { load(); }, [feedbackId]);

  async function handleReply() {
    if (!text.trim()) return;
    try {
      setLoading(true);
      if (!currentUsuarioId) {
        toast.error("Sem usuário de aplicação para responder.");
        return;
      }
      await addResposta(feedbackId, text.trim(), currentUsuarioId);
      setText("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao responder.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="text-sm border rounded-md p-2">
          <div className="font-medium">{r.autor?.nome ?? "—"}</div>
          <div className="text-muted-foreground">{r.conteudo}</div>
        </div>
      ))}
      {canReply && (
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Responder..."
          />
          <Button onClick={handleReply} disabled={loading || !text.trim()}>Enviar</Button>
        </div>
      )}
    </div>
  );
}
