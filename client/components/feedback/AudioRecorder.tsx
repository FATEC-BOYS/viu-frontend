import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Trash2, Play } from "lucide-react";

export interface AudioRecorderProps {
  onRecorded?: (blob: Blob) => void;
}

export function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        onRecorded?.(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Falha ao acessar microfone:", err);
      alert("Permita o acesso ao microfone para gravar áudio.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const clearRecording = () => {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!recording ? (
          <Button onClick={startRecording} className="gap-2">
            <Mic className="size-4" /> Gravar
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="gap-2"
          >
            <Square className="size-4" /> Parar
          </Button>
        )}
        {audioURL && (
          <>
            <a
              className="inline-flex items-center gap-2 h-10 px-4 py-2 rounded-md border hover:bg-accent"
              href={audioURL}
              download={`feedback-${Date.now()}.webm`}
            >
              <Play className="size-4" /> Baixar
            </a>
            <Button variant="ghost" onClick={clearRecording} className="gap-2">
              <Trash2 className="size-4" /> Limpar
            </Button>
          </>
        )}
      </div>
      {audioURL && <audio controls src={audioURL} className="w-full" />}
    </div>
  );
}
