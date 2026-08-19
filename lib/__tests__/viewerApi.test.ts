import { describe, it, expect, vi, beforeEach } from "vitest";
import { postTextFeedback, postAudioFeedback, getAudioStreamUrl } from "../viewerApi";

/*
 * Estes testes foram escritos contra as Edge Functions do Supabase
 * (submit-feedback, stream-audio, campos posX/posY). O viewer passou a usar o
 * proxy do Next em /api/feedbacks, com os nomes de campo do backend
 * (posicao_x/posicao_y), e as asserções nunca acompanharam.
 */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const basePayload = {
  token: "tok_123",
  arteId: "arte_1",
  viewerEmail: "user@test.com",
  viewerNome: "User",
};

describe("postTextFeedback", () => {
  it("sends JSON POST with correct body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "fb_1" }),
    });

    const result = await postTextFeedback({ ...basePayload, content: "Ótimo trabalho!" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/feedbacks");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts.body);
    expect(body.tipo).toBe("TEXTO");
    expect(body.conteudo).toBe("Ótimo trabalho!");
    expect(body.token).toBe("tok_123");
    expect(result).toEqual({ id: "fb_1" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Forbidden"),
    });

    await expect(postTextFeedback({ ...basePayload, content: "test" })).rejects.toThrow(
      "Forbidden"
    );
  });

  it("includes optional position fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "fb_2" }),
    });

    await postTextFeedback({
      ...basePayload,
      content: "Aqui",
      posX: 100,
      posY: 200,
      posXAbs: 500,
      posYAbs: 1000,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.posicao_x).toBe(100);
    expect(body.posicao_y).toBe(200);
  });
});

describe("postAudioFeedback", () => {
  it("sends FormData with file and meta", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: "fb_audio_1" }),
    });

    const blob = new Blob(["audio data"], { type: "audio/webm" });
    const result = await postAudioFeedback({ ...basePayload, blob });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/feedbacks");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get("token")).toBe("tok_123");
    expect(opts.body.get("arteId")).toBe("arte_1");
    expect(opts.body.get("file")).toBeInstanceOf(Blob);
    expect(result).toEqual({ id: "fb_audio_1" });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Server error"),
    });

    const blob = new Blob(["audio"], { type: "audio/webm" });
    await expect(postAudioFeedback({ ...basePayload, blob })).rejects.toThrow("Server error");
  });
});

describe("getAudioStreamUrl", () => {
  // O áudio hoje vem numa URL já assinada pelo backend; a função só repassa.
  it("devolve URL absoluta sem alterar", () => {
    const url = getAudioStreamUrl("https://cdn.exemplo.com/a.webm?sig=x", "tok_abc");
    expect(url).toBe("https://cdn.exemplo.com/a.webm?sig=x");
  });

  it("devolve caminho relativo sem alterar", () => {
    expect(getAudioStreamUrl("/uploads/feedbacks/a.webm", "tok_abc")).toBe(
      "/uploads/feedbacks/a.webm",
    );
  });
});
