import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackPanel from "../FeedbackPanel";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const baseProps = {
  arteId: "arte_1",
  versoes: [
    { id: "v1", numero: 1, criado_em: "2024-06-01T00:00:00Z", status: "EM_ANALISE" },
    { id: "v2", numero: 2, criado_em: "2024-06-10T00:00:00Z", status: "APROVADO" },
  ],
  aprovacoesByVersao: {
    v2: [
      {
        id: "ap_1",
        arte_versao_id: "v2",
        aprovador_nome: "Carlos",
        aprovador_email: "carlos@test.com",
        aprovado_em: "2024-06-11T00:00:00Z",
        visto_em: null,
      },
    ],
  },
  readOnly: false,
  viewer: { email: "user@test.com", nome: "User" },
  token: "tok_abc",
  initialFeedbacks: [
    {
      id: "fb_1",
      conteudo: "Ajustar cor",
      tipo: "TEXTO" as const,
      status: "ABERTO",
      criado_em: "2024-06-05T10:00:00Z",
      autor_nome: "Ana",
      autor_email: "ana@test.com",
      arte_versao_id: "v1",
    },
  ],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe("FeedbackPanel", () => {
  it("renders version headers", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText(/Versão 1/)).toBeInTheDocument();
    expect(screen.getByText(/Versão 2/)).toBeInTheDocument();
  });

  it("renders feedbacks grouped by version", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText("Ajustar cor")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("shows empty state for version without feedbacks", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText("Nenhum feedback nesta versão.")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText("EM_ANALISE")).toBeInTheDocument();
    expect(screen.getByText("APROVADO")).toBeInTheDocument();
  });

  it("renders aprovações for version", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("shows reload button", () => {
    render(<FeedbackPanel {...baseProps} />);
    expect(screen.getByText("Recarregar")).toBeInTheDocument();
  });

  it("fetches feedbacks when clicking reload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<FeedbackPanel {...baseProps} />);
    await userEvent.click(screen.getByText("Recarregar"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("/api/arte/arte_1/feedbacks");
    expect(url).toContain("token=tok_abc");
  });

  it("handles fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal" }),
    });

    render(<FeedbackPanel {...baseProps} />);
    await userEvent.click(screen.getByText("Recarregar"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("renders audio feedback with audio element", () => {
    const propsWithAudio = {
      ...baseProps,
      initialFeedbacks: [
        {
          id: "fb_audio",
          conteudo: "",
          tipo: "AUDIO" as const,
          arquivo: "https://example.com/audio.webm",
          status: "ABERTO",
          criado_em: "2024-06-05T10:00:00Z",
          autor_nome: "Pedro",
          autor_email: null,
          arte_versao_id: "v1",
        },
      ],
    };

    render(<FeedbackPanel {...propsWithAudio} />);
    const audio = document.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio?.src).toContain("audio.webm");
  });

  it("shows '(sem texto)' for empty text feedback", () => {
    const propsEmpty = {
      ...baseProps,
      initialFeedbacks: [
        {
          id: "fb_empty",
          conteudo: "",
          tipo: "TEXTO" as const,
          status: "ABERTO",
          criado_em: "2024-06-05T10:00:00Z",
          autor_nome: "Test",
          autor_email: null,
          arte_versao_id: "v1",
        },
      ],
    };
    render(<FeedbackPanel {...propsEmpty} />);
    expect(screen.getByText("(sem texto)")).toBeInTheDocument();
  });
});
