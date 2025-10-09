"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square, Upload } from "lucide-react";

type Props = {
  arteId: string;
  onUploaded: (publicUrl: string, storagePath: string) => void;
  disabled?: boolean;
};

export default function AudioRecorder({ arteId, onUploaded, disabled }: Props) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function start() {
    if (disabled) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = handleStop;
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  }

  function stop() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function handleStop() {
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "feedback.webm", { type: "audio/webm" });
      const key = `feedbacks/${arteId}/${Date.now()}.webm`;
      const { error } = await supabase.storage.from("viewer-uploads").upload(key, file, {
        upsert: false,
        contentType: "audio/webm",
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("viewer-uploads").getPublicUrl(key);
      onUploaded(pub.publicUrl, key);
    } catch (e) {
      // TODO: toast
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <Button size="sm" variant="outline" onClick={start} disabled={disabled || uploading}>
          <Mic className="h-4 w-4 mr-1" /> Gravar áudio
        </Button>
      ) : (
        <Button size="sm" variant="destructive" onClick={stop}>
          <Square className="h-4 w-4 mr-1" /> Parar
        </Button>
      )}
      {uploading && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Enviando…
        </span>
      )}
    </div>
  );
}
