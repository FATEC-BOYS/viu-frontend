import { describe, it, expect, vi, beforeEach } from "vitest";
import { postTextFeedback, postAudioFeedback, getAudioStreamUrl } from "../viewerApi";

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
    expect(url).toContain("submit-feedback");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts.body);
    expect(body.type).toBe("text");
    expect(body.content).toBe("Ótimo trabalho!");
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
    expect(body.posX).toBe(100);
    expect(body.posY).toBe(200);
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
    expect(url).toContain("submit-feedback");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
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
  it("builds stream URL with path and token params", () => {
    const url = getAudioStreamUrl("feedbacks/arte_1/file.webm", "tok_abc");
    expect(url).toContain("stream-audio");
    expect(url).toContain("path=feedbacks");
    expect(url).toContain("token=tok_abc");
  });
});
