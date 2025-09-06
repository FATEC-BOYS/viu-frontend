import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "./AudioRecorder";
import { Send } from "lucide-react";

export interface FeedbackPanelProps {
  onSubmit?: (payload: { text?: string; audio?: Blob }) => void;
}

export function FeedbackPanel({ onSubmit }: FeedbackPanelProps) {
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(undefined);

  const handleSend = () => {
    onSubmit?.({ text: text.trim() || undefined, audio: audioBlob });
    setText("");
    setAudioBlob(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Feedback em texto</label>
        <Textarea
          placeholder="Descreva aqui suas sugestões ou alterações..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-28"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">ou grave um áudio</label>
        <AudioRecorder onRecorded={setAudioBlob} />
      </div>

      <div className="pt-2">
        <Button onClick={handleSend} className="gap-2">
          <Send className="size-4" /> Enviar feedback
        </Button>
      </div>
    </div>
  );
}
