import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackViewer, { type FeedbackItem } from "../FeedbackViewer";

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
  autor_nome: "Carlos",
  autor_email: "carlos@test.com",
  posicao_x: 50,
  posicao_y: 30,
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

  it("renders text feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    expect(screen.getByText("Muito bom!")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("ABERTO")).toBeInTheDocument();
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

  // --- New: Pin / Click-to-comment tests ---
  it("image container has crosshair cursor for commenting", () => {
    render(<FeedbackViewer {...defaultProps} />);
    const container = document.querySelector(".cursor-crosshair");
    expect(container).toBeInTheDocument();
  });

  it("renders pin markers for positioned feedbacks", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    // Pin marker should show MapPin icon and number badge
    const pinButton = document.querySelector("button.absolute");
    expect(pinButton).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows MapPin icon next to positioned feedback author", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("highlights feedback on pin hover", async () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    const feedbackItem = screen.getByText("Carlos").closest("li");
    fireEvent.mouseEnter(feedbackItem!);
    expect(feedbackItem).toHaveClass("ring-2");
  });

  // --- New: Transcription display ---
  it("shows transcription for audio feedbacks", () => {
    render(
      <FeedbackViewer
        {...defaultProps}
        initialFeedbacks={[audioWithTranscription]}
      />
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
    // Should NOT display "Áudio" as transcription text anywhere
    const transcriptionText = screen.queryByText("Áudio");
    expect(transcriptionText).not.toBeInTheDocument();
  });

  // --- New: TTS button ---
  it("renders TTS button on text feedbacks", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback]} />);
    const ttsBtn = screen.getByTitle("Ouvir comentário");
    expect(ttsBtn).toBeInTheDocument();
  });

  // --- New: Audio recorder uses hook ---
  it("shows 'Gravar áudio' button", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Gravar áudio")).toBeInTheDocument();
  });

  it("calls recorder.start when clicking 'Gravar áudio'", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Gravar áudio"));
    expect(mockStart).toHaveBeenCalledOnce();
  });

  // --- Sends position data with feedback ---
  it("sends posicao_x and posicao_y when pin is placed", async () => {
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
});
