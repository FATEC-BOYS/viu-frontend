import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackViewer, { type FeedbackItem, getInitials, avatarColor } from "../FeedbackViewer";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { toast } from "sonner";

// Mock useAudioRecorder
const mockStart = vi.fn();
const mockStop = vi.fn();
vi.mock("../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    state: "idle",
    elapsedMs: 0,
    start: mockStart,
    pause: vi.fn(),
    resume: vi.fn(),
    stop: mockStop,
    permissionError: null,
  }),
  formatElapsed: (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  },
}));

const mockArte = {
  id: "arte_1",
  nome: "Banner Principal",
  arquivo: "https://example.com/image.png",
};

const baseFeedback: FeedbackItem = {
  id: "fb_1",
  conteudo: "Muito bom!",
  tipo: "TEXTO",
  status: "ABERTO",
  criado_em: "2024-06-15T14:00:00Z",
  autor_nome: "João",
  autor_email: "joao@test.com",
};

const audioFeedback: FeedbackItem = {
  id: "fb_2",
  conteudo: "",
  tipo: "AUDIO",
  arquivo: "https://example.com/audio.webm",
  status: "ABERTO",
  criado_em: "2024-06-15T15:00:00Z",
  autor_nome: "Maria",
  autor_email: null,
};

const positionedFeedback: FeedbackItem = {
  id: "fb_3",
  conteudo: "Ajustar aqui",
  tipo: "TEXTO",
  status: "ABERTO",
  criado_em: "2024-06-15T16:00:00Z",
  autor_nome: "Carlos Silva",
  autor_email: "carlos@test.com",
  posicao_x: 50,
  posicao_y: 30,
};

const resolvedFeedback: FeedbackItem = {
  id: "fb_resolved",
  conteudo: "Já foi corrigido",
  tipo: "TEXTO",
  status: "RESOLVIDO",
  criado_em: "2024-06-15T18:00:00Z",
  autor_nome: "Ana",
  autor_email: "ana@test.com",
};

const audioWithTranscription: FeedbackItem = {
  id: "fb_4",
  conteudo: "Texto transcrito do áudio",
  tipo: "AUDIO",
  arquivo: "https://example.com/audio2.webm",
  transcricao: "Texto transcrito do áudio",
  status: "ABERTO",
  criado_em: "2024-06-15T17:00:00Z",
  autor_nome: "Ana",
  autor_email: null,
};

const defaultProps = {
  arte: mockArte,
  initialFeedbacks: [] as FeedbackItem[],
  token: "tok_123",
  onAskIdentity: vi.fn(),
  viewer: { email: "viewer@test.com", nome: "Viewer" },
  readOnly: false,
};

beforeEach(() => {
  mockFetch.mockReset();
  mockStart.mockReset();
  mockStop.mockReset();
  defaultProps.onAskIdentity.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
});

/* ------------------------------------------------------------------ */
/*  Helper functions                                                    */
/* ------------------------------------------------------------------ */

describe("getInitials", () => {
  it("returns two initials from full name", () => {
    expect(getInitials("João Silva")).toBe("JS");
  });

  it("returns first two chars from single name", () => {
    expect(getInitials("Ana")).toBe("AN");
  });

  it("falls back to email", () => {
    expect(getInitials(null, "test@email.com")).toBe("TE");
  });

  it("returns ? for no input", () => {
    expect(getInitials()).toBe("?");
  });
});

describe("avatarColor", () => {
  it("returns a bg-* class", () => {
    expect(avatarColor("test")).toMatch(/^bg-/);
  });

  it("is deterministic", () => {
    expect(avatarColor("abc")).toBe(avatarColor("abc"));
  });

  it("varies with input", () => {
    // Different strings should (usually) produce different colors
    const colors = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(avatarColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Core rendering                                                      */
/* ------------------------------------------------------------------ */

describe("FeedbackViewer", () => {
  it("renders the art image", () => {
    render(<FeedbackViewer {...defaultProps} />);
    const img = screen.getByAltText("Banner Principal");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
  });

  it("shows empty state when no feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Nenhum feedback ainda.")).toBeInTheDocument();
  });

  it("renders text feedbacks with avatar", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    expect(screen.getByText("Muito bom!")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("ABERTO")).toBeInTheDocument();
    // Avatar initials
    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("renders audio feedbacks with audio element", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[audioFeedback]} />);
    expect(screen.getByText("Maria")).toBeInTheDocument();
    const audio = document.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio?.src).toContain("audio.webm");
  });

  it("shows 'Somente leitura' when readOnly is true", () => {
    render(<FeedbackViewer {...defaultProps} readOnly={true} />);
    expect(screen.getByText("Somente leitura")).toBeInTheDocument();
  });

  it("shows viewer email when identified", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Comentando como viewer@test.com")).toBeInTheDocument();
  });

  it("shows identify button when no viewer", () => {
    render(<FeedbackViewer {...defaultProps} viewer={null} />);
    expect(screen.getByText("Identificar para comentar")).toBeInTheDocument();
  });

  it("calls onAskIdentity when clicking identify button", async () => {
    render(<FeedbackViewer {...defaultProps} viewer={null} />);
    await userEvent.click(screen.getByText("Identificar para comentar"));
    expect(defaultProps.onAskIdentity).toHaveBeenCalledOnce();
  });

  it("disables send button when comment is empty", () => {
    render(<FeedbackViewer {...defaultProps} />);
    const sendBtn = screen.getByText("Enviar comentário");
    expect(sendBtn).toBeDisabled();
  });

  it("enables send button when comment has text", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Novo feedback");
    const sendBtn = screen.getByText("Enviar comentário");
    expect(sendBtn).not.toBeDisabled();
  });

  it("submits text feedback and shows toast", async () => {
    const newFeedback: FeedbackItem = {
      id: "fb_new",
      conteudo: "Novo comentário",
      tipo: "TEXTO",
      status: "ABERTO",
      criado_em: new Date().toISOString(),
      autor_nome: "Viewer",
      autor_email: "viewer@test.com",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newFeedback),
    });

    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Novo comentário");
    await userEvent.click(screen.getByText("Enviar comentário"));

    await waitFor(() => {
      expect(screen.getByText("Novo comentário")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("Comentário enviado!");
    });
  });

  it("shows toast.error on failed submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Token expirado" }),
    });

    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Test");
    await userEvent.click(screen.getByText("Enviar comentário"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Token expirado");
    });
  });

  it("shows 'Anônimo' for feedbacks without author", () => {
    const anonFeedback: FeedbackItem = {
      ...baseFeedback,
      id: "fb_anon",
      autor_nome: null,
      autor_email: null,
    };
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[anonFeedback]} />);
    expect(screen.getByText("Anônimo")).toBeInTheDocument();
  });

  it("shows placeholder text when readOnly", () => {
    render(<FeedbackViewer {...defaultProps} readOnly={true} />);
    expect(screen.getByPlaceholderText("Comentários desabilitados")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Comment mode toggle                                              */
  /* ---------------------------------------------------------------- */

  it("starts in non-comment mode (cursor-default, not crosshair)", () => {
    render(<FeedbackViewer {...defaultProps} />);
    const container = document.querySelector(".cursor-default");
    expect(container).toBeInTheDocument();
    expect(document.querySelector(".cursor-crosshair")).not.toBeInTheDocument();
  });

  it("shows Comentar button with C shortcut", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Comentar")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("toggles to comment mode on Comentar click", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Comentar"));
    expect(screen.getByText("Comentando")).toBeInTheDocument();
    expect(document.querySelector(".cursor-crosshair")).toBeInTheDocument();
  });

  it("toggles comment mode with C key", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Comentar")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByText("Comentando")).toBeInTheDocument();
  });

  it("does NOT toggle comment mode when typing in textarea", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    // First enable comment mode
    await userEvent.click(screen.getByText("Comentar"));
    expect(screen.getByText("Comentando")).toBeInTheDocument();

    // Focus textarea and press C — should NOT toggle
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "c" });
    // Still in comment mode
    expect(screen.getByText("Comentando")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Pins: bubble style with avatar                                    */
  /* ---------------------------------------------------------------- */

  it("renders bubble-style pins for positioned feedbacks", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    // Pin should have data-pin-id and avatar initials
    const pinBtn = document.querySelector('[data-pin-id="fb_3"]');
    expect(pinBtn).toBeInTheDocument();
    // Avatar initials for "Carlos Silva" = "CS" (both in pin and list)
    expect(screen.getAllByText("CS").length).toBeGreaterThanOrEqual(1);
  });

  it("shows avatar initials on pin instead of number", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    // Should NOT have a numbered badge like "1"
    const pinBtn = document.querySelector('[data-pin-id="fb_3"]');
    expect(pinBtn?.textContent).toContain("CS");
  });

  it("highlights feedback on pin hover", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    const feedbackItem = screen.getByText("Carlos Silva").closest("li");
    fireEvent.mouseEnter(feedbackItem!);
    expect(feedbackItem).toHaveClass("ring-2");
  });

  /* ---------------------------------------------------------------- */
  /*  Resolve / reopen                                                  */
  /* ---------------------------------------------------------------- */

  it("shows resolve button (checkmark) on feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    // The resolve button tooltip says "Marcar como resolvido"
    const resolveBtn = document.querySelector('[class*="hover:text-green-500"]');
    expect(resolveBtn).toBeInTheDocument();
  });

  it("shows resolved feedbacks with opacity and line-through", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[resolvedFeedback]} />);
    const li = screen.getByText("Já foi corrigido").closest("li");
    expect(li).toHaveClass("opacity-60");
    const textP = screen.getByText("Já foi corrigido");
    expect(textP).toHaveClass("line-through");
  });

  it("does not show resolve button in readOnly mode", () => {
    render(<FeedbackViewer {...defaultProps} readOnly={true} initialFeedbacks={[baseFeedback]} />);
    const resolveBtn = document.querySelector('[class*="hover:text-green-500"]');
    expect(resolveBtn).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Filter resolved / open                                            */
  /* ---------------------------------------------------------------- */

  it("shows filter toggle button", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Todos")).toBeInTheDocument();
  });

  it("hides resolved feedbacks when filter toggled", async () => {
    render(
      <FeedbackViewer
        {...defaultProps}
        initialFeedbacks={[baseFeedback, resolvedFeedback]}
      />
    );
    expect(screen.getByText("Já foi corrigido")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Todos"));
    expect(screen.getByText("Abertos")).toBeInTheDocument();
    expect(screen.queryByText("Já foi corrigido")).not.toBeInTheDocument();
    expect(screen.getByText("Muito bom!")).toBeInTheDocument();
  });

  it("shows 'Nenhum feedback aberto.' when all are resolved and filter is on", async () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[resolvedFeedback]} />
    );
    await userEvent.click(screen.getByText("Todos"));
    expect(screen.getByText("Nenhum feedback aberto.")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Pin navigation                                                    */
  /* ---------------------------------------------------------------- */

  it("shows pin navigation when positioned feedbacks exist", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    expect(screen.getByText("1 pins")).toBeInTheDocument();
    expect(screen.getByLabelText("Pin anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próximo pin")).toBeInTheDocument();
  });

  it("does not show pin navigation when no positioned feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    expect(screen.queryByLabelText("Pin anterior")).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Zoom controls                                                     */
  /* ---------------------------------------------------------------- */

  it("shows zoom controls", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
  });

  it("zoom in increases percentage", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByText("125%")).toBeInTheDocument();
  });

  it("zoom out decreases percentage", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("Zoom out"));
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows reset button only when zoomed", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.queryByLabelText("Reset zoom")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Zoom in"));
    expect(screen.getByLabelText("Reset zoom")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Transcription display                                             */
  /* ---------------------------------------------------------------- */

  it("shows transcription for audio feedbacks", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[audioWithTranscription]} />
    );
    expect(screen.getByText("Texto transcrito do áudio")).toBeInTheDocument();
  });

  it("does not show 'Áudio' as transcription text", () => {
    const audioNoTranscription: FeedbackItem = {
      ...audioFeedback,
      conteudo: "Áudio",
    };
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[audioNoTranscription]} />
    );
    const transcriptionBlock = document.querySelector(".bg-muted\\/50");
    expect(transcriptionBlock).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  TTS button                                                        */
  /* ---------------------------------------------------------------- */

  it("renders TTS button on text feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    const ttsBtn = screen.getByTitle("Ouvir comentário");
    expect(ttsBtn).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Audio recorder                                                    */
  /* ---------------------------------------------------------------- */

  it("shows 'Gravar áudio' button", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Gravar áudio")).toBeInTheDocument();
  });

  it("calls recorder.start when clicking 'Gravar áudio'", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Gravar áudio"));
    expect(mockStart).toHaveBeenCalledOnce();
  });

  /* ---------------------------------------------------------------- */
  /*  Thread / replies                                                  */
  /* ---------------------------------------------------------------- */

  it("shows Respostas button on each feedback", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    expect(screen.getByText("Respostas")).toBeInTheDocument();
  });

  it("expands thread on click and shows empty state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    await userEvent.click(screen.getByText("Respostas"));

    await waitFor(() => {
      expect(screen.getByText("Nenhuma resposta ainda.")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Responder...")).toBeInTheDocument();
    });
  });

  it("shows reply input only when thread is expanded and not readOnly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    // Before expanding, no reply input
    expect(screen.queryByPlaceholderText("Responder...")).not.toBeInTheDocument();

    // Expand thread
    await userEvent.click(screen.getByText("Respostas"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Responder...")).toBeInTheDocument();
    });
  });

  it("hides reply input in readOnly mode", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<FeedbackViewer {...defaultProps} readOnly={true} initialFeedbacks={[baseFeedback]} />);
    await userEvent.click(screen.getByText("Respostas"));

    await waitFor(() => {
      expect(screen.getByText("Nenhuma resposta ainda.")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Responder...")).not.toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Feedback count display                                            */
  /* ---------------------------------------------------------------- */

  it("shows feedback count", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback, resolvedFeedback]} />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Position data with feedback                                       */
  /* ---------------------------------------------------------------- */

  it("sends posicao_x and posicao_y when pin is placed in comment mode", async () => {
    const newFeedback: FeedbackItem = {
      id: "fb_pin",
      conteudo: "Pin comment",
      tipo: "TEXTO",
      status: "ABERTO",
      criado_em: new Date().toISOString(),
      autor_nome: "Viewer",
      autor_email: "viewer@test.com",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(newFeedback),
    });

    render(<FeedbackViewer {...defaultProps} />);

    // Enable comment mode first
    await userEvent.click(screen.getByText("Comentar"));

    // Click on image to place pin (mock getBoundingClientRect since jsdom returns 0s)
    const imgContainer = document.querySelector(".cursor-crosshair")!;
    vi.spyOn(imgContainer, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => {},
    });
    fireEvent.click(imgContainer, { clientX: 100, clientY: 50 });

    // Type comment and submit
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Pin comment");
    await userEvent.click(screen.getByText("Enviar comentário"));

    await waitFor(() => {
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.posicao_x).toBeTypeOf("number");
      expect(body.posicao_y).toBeTypeOf("number");
    });
  });

  it("does NOT place pin when comment mode is off", () => {
    render(<FeedbackViewer {...defaultProps} />);
    // Not in comment mode (cursor-default)
    const imgContainer = document.querySelector(".cursor-default")!;
    vi.spyOn(imgContainer, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => {},
    });
    fireEvent.click(imgContainer, { clientX: 100, clientY: 50 });
    // No pin indicator bar
    expect(screen.queryByText(/Comentário posicionado/)).not.toBeInTheDocument();
  });
});
