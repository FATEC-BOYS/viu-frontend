// components/viewer/hooks/useAudioRecorder.ts
"use client";

import fixWebmDuration from "fix-webm-duration";
import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "paused";

/**
 * Os formatos que o backend aceita, em ordem de preferência.
 *
 * `audio/webm` é o do Chrome e do Firefox; `audio/mp4` é o do Safari, que NÃO
 * suporta webm. Os dois estão na lista de tipos permitidos do backend, com as
 * extensões `.webm` e `.m4a`.
 *
 * A extensão viaja junto porque o backend valida o par: `validateMimeType`
 * compara o tipo declarado com a extensão do nome do arquivo, e `audio/mp4`
 * com nome `.webm` é recusado com 400.
 */
const FORMATOS: ReadonlyArray<{ mime: string; extensao: string }> = [
  { mime: "audio/webm", extensao: "webm" },
  { mime: "audio/mp4", extensao: "m4a" },
];

/**
 * O primeiro formato que ESTE navegador sabe gravar.
 *
 * O gravador pedia `audio/webm` fixo, e o construtor do `MediaRecorder` lança
 * `NotSupportedError` para um tipo que o navegador não grava — então no Safari
 * e no iPhone a gravação morria ali. Pior: o `catch` escrevia "Falha ao
 * acessar microfone", culpando o microfone por um problema de formato, e a
 * pessoa ia conferir permissões que estavam certas.
 *
 * `null` quando nenhum serve — aí a mensagem diz o que é de verdade.
 */
export function formatoSuportado(): { mime: string; extensao: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const f of FORMATOS) {
    // `isTypeSupported` pode não existir em navegador antigo: sem ele, não há
    // como perguntar antes, e tentar é a única resposta possível.
    if (typeof MediaRecorder.isTypeSupported !== "function") return f;
    if (MediaRecorder.isTypeSupported(f.mime)) return f;
  }
  return null;
}

export function useAudioRecorder() {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const formatoRef = useRef<{ mime: string; extensao: string } | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);

  const accumulatedMsRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const recordingDuration = () => accumulatedMsRef.current +
    (startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current);
  const tick = () => setElapsedMs(recordingDuration());

  /*
   * Soltar as tracks em UM lugar, chamado pelos dois caminhos.
   *
   * `start` instalava um `onstop` que soltava as tracks, e `stop`
   * SOBRESCREVIA esse `onstop` pelo seu — então pelo caminho normal (gravar e
   * parar) as tracks nunca eram soltas: o microfone continuava aberto depois
   * de enviar, com o indicador de gravação do navegador aceso na aba.
   */
  const soltarMicrofone = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setPermissionError(null);

    const formato = formatoSuportado();
    if (!formato) {
      setPermissionError("Este navegador não grava áudio. Escreva o comentário.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: formato.mime });
      mediaRef.current = rec;
      formatoRef.current = formato;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = soltarMicrofone;
      accumulatedMsRef.current = 0;
      startedAtRef.current = performance.now();
      rec.start();
      setElapsedMs(0);
      setState("recording");
      timerRef.current = window.setInterval(tick, 1000);
    } catch (e: any) {
      soltarMicrofone();
      setPermissionError(e?.message ?? "Falha ao acessar microfone.");
    }
  }, [soltarMicrofone]);

  const pause = useCallback(() => {
    if (mediaRef.current && state === "recording") {
      accumulatedMsRef.current = recordingDuration();
      startedAtRef.current = null;
      setElapsedMs(accumulatedMsRef.current);
      mediaRef.current.pause();
      setState("paused");
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }, [state]);

  const resume = useCallback(() => {
    if (mediaRef.current && state === "paused") {
      startedAtRef.current = performance.now();
      mediaRef.current.resume();
      setState("recording");
      timerRef.current = window.setInterval(tick, 1000);
    }
  }, [state]);

  /**
   * Para de gravar e devolve a gravação COM a extensão que combina com ela.
   *
   * A extensão sai daqui, e não de um valor lido na renderização, porque é
   * propriedade desta gravação: quem recebe o blob é quem precisa nomear o
   * arquivo, e o backend recusa `audio/mp4` com nome `.webm`.
   */
  const stop = useCallback(async () => {
    return new Promise<{ blob: Blob; extensao: string } | null>((resolve) => {
      const rec = mediaRef.current;
      if (!rec || rec.state === "inactive") return resolve(null);
      const durationMs = recordingDuration();
      startedAtRef.current = null;
      accumulatedMsRef.current = durationMs;
      setElapsedMs(durationMs);
      const formato = formatoRef.current;
      rec.onstop = async () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        // O tipo do blob é o que o navegador de fato gravou, e não `audio/webm`
        // fixo: no Safari os bytes são mp4, e declarar webm faria o backend
        // recusar por conteúdo que não corresponde ao tipo declarado.
        const blob = new Blob(chunksRef.current, {
          type: formato?.mime ?? "audio/webm",
        });
        soltarMicrofone();
        mediaRef.current = null;
        chunksRef.current = [];
        setState("idle");
        // MediaRecorder WebM may omit Duration (Opera/Chromium can display
        // absurd totals). Repair the actual file used by preview AND upload.
        let finalizedBlob = blob;
        if (blob.type.startsWith("audio/webm") && blob.size > 0 && durationMs > 0) {
          try {
            finalizedBlob = await fixWebmDuration(blob, durationMs, { logger: false });
          } catch {
            // Preserve the recording if metadata cannot be repaired.
          }
        }
        resolve({ blob: finalizedBlob, extensao: formato?.extensao ?? "webm" });
      };
      rec.stop();
    });
  }, [soltarMicrofone]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
      // Direto pelo ref, e não por `soltarMicrofone`: sair da tela no meio de
      // uma gravação precisa fechar o microfone mesmo que o recorder já
      // estivesse inativo e nenhum `onstop` vá disparar.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
