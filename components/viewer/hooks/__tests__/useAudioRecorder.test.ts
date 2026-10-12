import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { formatElapsed, formatoSuportado, useAudioRecorder } from "../useAudioRecorder";

describe("formatElapsed", () => {
  it("formats 0ms as 00:00", () => {
    expect(formatElapsed(0)).toBe("00:00");
  });

  it("formats seconds correctly", () => {
    expect(formatElapsed(5000)).toBe("00:05");
    expect(formatElapsed(30000)).toBe("00:30");
  });

  it("formats minutes and seconds", () => {
    expect(formatElapsed(65000)).toBe("01:05");
    expect(formatElapsed(600000)).toBe("10:00");
  });

  it("pads single-digit values with zero", () => {
    expect(formatElapsed(1000)).toBe("00:01");
    expect(formatElapsed(61000)).toBe("01:01");
  });

  it("handles large values", () => {
    expect(formatElapsed(3600000)).toBe("60:00"); // 1 hour
  });
});

/**
 * Finge ser o `MediaRecorder` do navegador, aceitando só os tipos informados.
 *
 * O construtor LANÇA para um tipo não suportado — é esse o comportamento real,
 * e era ele que derrubava a gravação no Safari.
 */
function fingirMediaRecorder(suportados: string[]) {
  const instancias: any[] = [];
  class FalsoMediaRecorder {
    onstop: (() => void) | null = null;
    ondataavailable: ((e: any) => void) | null = null;
    state = "inactive";
    constructor(_stream: MediaStream, opcoes?: { mimeType?: string }) {
      if (opcoes?.mimeType && !suportados.includes(opcoes.mimeType)) {
        throw new Error(`NotSupportedError: ${opcoes.mimeType}`);
      }
      instancias.push(this);
    }
    static isTypeSupported(tipo: string) {
      return suportados.includes(tipo);
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", FalsoMediaRecorder);
  return instancias;
}

/** Um microfone de mentira que sabe dizer se foi desligado. */
function fingirMicrofone() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  return track;
}

afterEach(() => vi.unstubAllGlobals());

/*
 * O gravador pedia `audio/webm` FIXO, e o Safari não grava webm: o construtor
 * do MediaRecorder lança, e o `catch` escrevia "Falha ao acessar microfone" —
 * culpando o microfone por um problema de formato. No iPhone, que é onde o
 * cliente abre o link do WhatsApp, gravar simplesmente não funcionava.
 */
describe("formatoSuportado", () => {
  it("prefere webm onde ele existe (Chrome, Firefox)", () => {
    fingirMediaRecorder(["audio/webm", "audio/mp4"]);
    expect(formatoSuportado()).toEqual({ mime: "audio/webm", extensao: "webm" });
  });

  it("cai para mp4 onde webm não existe (Safari, iPhone)", () => {
    fingirMediaRecorder(["audio/mp4"]);
    expect(formatoSuportado()).toEqual({ mime: "audio/mp4", extensao: "m4a" });
  });

  it("devolve nulo quando nenhum formato serve", () => {
    fingirMediaRecorder([]);
    expect(formatoSuportado()).toBeNull();
  });

  /*
   * A extensão acompanha o formato porque o backend valida o PAR: um blob
   * `audio/mp4` com nome `.webm` é recusado com 400 em `validateMimeType`.
   */
  it("a extensão combina com o tipo, que é o que o backend confere", () => {
    fingirMediaRecorder(["audio/mp4"]);
    const f = formatoSuportado();
    expect(f?.extensao).toBe("m4a");
    expect(f?.mime).toBe("audio/mp4");
  });
});

describe("useAudioRecorder", () => {
  it("grava no formato do navegador e devolve a extensão junto", async () => {
    fingirMicrofone();
    fingirMediaRecorder(["audio/mp4"]);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.start(); });
    expect(result.current.permissionError).toBeNull();

    let gravacao: { blob: Blob; extensao: string } | null = null;
    await act(async () => { gravacao = await result.current.stop(); });

    expect(gravacao!.extensao).toBe("m4a");
    expect(gravacao!.blob.type).toBe("audio/mp4");
  });

  /*
   * O microfone ficava LIGADO depois de parar.
   *
   * `start` instalava um `onstop` que soltava as tracks, e `stop`
   * SOBRESCREVIA esse `onstop` pelo seu — então pelo caminho normal (gravar e
   * parar) as tracks nunca eram soltas, e o indicador de gravação do navegador
   * continuava aceso na aba depois do comentário enviado.
   */
  it("solta o microfone ao parar a gravação", async () => {
    const track = fingirMicrofone();
    fingirMediaRecorder(["audio/webm"]);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.start(); });
    expect(track.stop).not.toHaveBeenCalled();

    await act(async () => { await result.current.stop(); });
    expect(track.stop).toHaveBeenCalled();
  });

  it("sem formato possível, diz o que é — não acusa o microfone", async () => {
    fingirMicrofone();
    fingirMediaRecorder([]);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.start(); });

    expect(result.current.permissionError).toContain("não grava áudio");
    expect(result.current.state).toBe("idle");
  });
});
