import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.stubEnv("OPENAI_API_KEY", "sk-test-key");

const { POST } = await import("../route");

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("POST /api/tts", () => {
  it("returns audio/mpeg on success", async () => {
    const fakeMp3 = new ArrayBuffer(100);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakeMp3,
    });

    const res = await POST(makeRequest({ text: "Olá mundo" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
  });

  it("sends correct params to OpenAI TTS", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    await POST(makeRequest({ text: "Test text", voice: "echo" }));

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/speech");
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("tts-1");
    expect(body.voice).toBe("echo");
    expect(body.input).toBe("Test text");
  });

  it("defaults to nova voice for unknown voice", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    await POST(makeRequest({ text: "hi", voice: "invalid" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.voice).toBe("nova");
  });

  it("returns 400 for empty text", async () => {
    const res = await POST(makeRequest({ text: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing text", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 502 when OpenAI fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "error",
    });

    const res = await POST(makeRequest({ text: "test" }));
    expect(res.status).toBe(502);
  });

  it("returns 503 when OPENAI_API_KEY is missing", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await POST(makeRequest({ text: "test" }));
    expect(res.status).toBe(503);

    process.env.OPENAI_API_KEY = original;
  });

  it("truncates text to 4096 chars", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    const longText = "a".repeat(5000);
    await POST(makeRequest({ text: longText }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.input.length).toBe(4096);
  });

  it("caches response for 1 hour", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
    });

    const res = await POST(makeRequest({ text: "test" }));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });
});
