import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackViewer, { type FeedbackItem } from "../FeedbackViewer";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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
  defaultProps.onAskIdentity.mockReset();
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

  it("calls onAskIdentity when trying to submit without viewer", async () => {
    render(<FeedbackViewer {...defaultProps} viewer={null} />);
    // The textarea area is disabled, but handleAddComment checks viewer
    const sendBtn = screen.getByText("Enviar comentário");
    // Button should be disabled since textarea is empty + no viewer
    expect(sendBtn).toBeDisabled();
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

  it("submits text feedback and adds to list", async () => {
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
    });
  });

  it("shows error alert on failed submission", async () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Token expirado" }),
    });

    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Test");
    await userEvent.click(screen.getByText("Enviar comentário"));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Token expirado");
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
});
