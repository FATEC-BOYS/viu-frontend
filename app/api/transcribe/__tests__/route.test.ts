import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch for OpenAI calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env before importing
vi.stubEnv("OPENAI_API_KEY", "sk-test-key");

// Dynamic import to pick up env stubs
const { POST } = await import("../route");

function makeFormRequest(file: Blob, filename = "audio.webm") {
  const fd = new FormData();
  fd.append("file", file, filename);
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    body: fd,
  });
}

function makeRawRequest(body: ArrayBuffer) {
  return new Request("http://localhost/api/transcribe", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/octet-stream" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("POST /api/transcribe", () => {
  it("returns transcribed text on success (form-data)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Olá, mundo!", language: "pt" }),
    });

    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const res = await POST(makeFormRequest(blob));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe("Olá, mundo!");
    expect(json.language).toBe("pt");
  });

  it("returns transcribed text from raw body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "Raw audio", language: "pt" }),
    });

    const buf = new ArrayBuffer(10);
    const res = await POST(makeRawRequest(buf));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toBe("Raw audio");
  });

  it("sends correct params to OpenAI Whisper", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "test" }),
    });

    const blob = new Blob(["audio"], { type: "audio/webm" });
    await POST(makeFormRequest(blob, "meu_audio.webm"));

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toBe("Bearer sk-test-key");
  });

  it("returns 502 when OpenAI fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const blob = new Blob(["audio"], { type: "audio/webm" });
    const res = await POST(makeFormRequest(blob));

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("transcrição");
  });

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    // Temporarily remove the key
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const blob = new Blob(["audio"], { type: "audio/webm" });
    const res = await POST(makeFormRequest(blob));

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain("OPENAI_API_KEY");

    process.env.OPENAI_API_KEY = original;
  });
});
