// components/viewer/hooks/useAudioRecorder.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "paused";

export function useAudioRecorder() {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [state, setState] = useState<RecorderState>("idle");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  const tick = () => setElapsedMs((e) => e + 1000);

  const start = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setElapsedMs(0);
      setState("recording");
      timerRef.current = window.setInterval(tick, 1000);
    } catch (e: any) {
      setPermissionError(e?.message ?? "Falha ao acessar microfone.");
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRef.current && state === "recording") {
      mediaRef.current.pause();
      setState("paused");
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }, [state]);

  const resume = useCallback(() => {
    if (mediaRef.current && state === "paused") {
      mediaRef.current.resume();
      setState("recording");
      timerRef.current = window.setInterval(tick, 1000);
    }
  }, [state]);

  const stop = useCallback(async () => {
    return new Promise<Blob | null>((resolve) => {
      const rec = mediaRef.current;
      if (!rec) return resolve(null);
      rec.onstop = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        mediaRef.current = null;
        chunksRef.current = [];
        setState("idle");
        resolve(blob);
      };
      rec.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    };
  }, []);

  return {
    state,
    elapsedMs,
    start,
    pause,
    resume,
    stop,
    permissionError,
  };
}

export function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
