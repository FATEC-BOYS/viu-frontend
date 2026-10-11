import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeedbackViewer, { type FeedbackItem, getInitials, avatarColor, posicaoDoCartao } from "../FeedbackViewer";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/*
 * Comentar e responder deixaram de passar pelas rotas do Next
 * (`/api/feedbacks`) e falam direto com o backend: só o navegador tem o
 * cookie da sessão quando a API mora em outro domínio. Estes testes passam a
 * dublar esse módulo em vez de `fetch`, e ganham com isso — o que importa
 * aqui é o que a tela PEDE e como ela reage, não por qual cano o pedido foi.
 */
const enviarComentarioMock = vi.fn();
const enviarAudioMock = vi.fn();
const listarRespostasMock = vi.fn(async (_id?: string) => [] as any[]);
const responderMock = vi.fn();

vi.mock("@/lib/feedbacksDaArte", () => ({
  enviarComentario: (a: any) => enviarComentarioMock(a),
  enviarComentarioDeAudio: (a: any) => enviarAudioMock(a),
  listarRespostas: (a: any) => listarRespostasMock(a),
  responder: (a: any, b: any, c?: any) => responderMock(a, b, c),
}));

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
  viewer: { email: "viewer@test.com", nome: "Viewer" },
  readOnly: false,
  /*
   * O padrão destes testes é "tem sessão", porque é sobre escrever que eles
   * falam. Sem sessão a área de escrita deixou de existir no DOM — não fica
   * desabilitada — e esse caso tem o próprio bloco no fim do arquivo.
   */
  temSessao: true,
  urlDeLogin: "/login?next=%2Fl%2Ftok_123",
  urlDeCadastro: "/cadastro?next=%2Fl%2Ftok_123",
};

beforeEach(() => {
  mockFetch.mockReset();
  enviarComentarioMock.mockReset().mockResolvedValue({ id: "fb_novo", conteudo: "", tipo: "TEXTO" });
  enviarAudioMock.mockReset().mockResolvedValue({ id: "fb_audio", tipo: "AUDIO" });
  listarRespostasMock.mockReset().mockResolvedValue([]);
  responderMock.mockReset().mockResolvedValue({ id: "r1", conteudo: "", criado_em: "", autor: { id: "", nome: "" } });
  mockStart.mockReset();
  mockStop.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  // Comentar exige conta. Com a sessão em cookie HttpOnly, o sinal de "tem
  // sessão" é o perfil em cache — o token não é visível ao JavaScript.
  localStorage.setItem("viu_user", JSON.stringify({ id: "u1", nome: "Teste" }));
});

afterEach(() => {
  localStorage.clear();
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
    expect(screen.getByText("Nenhum comentário ainda.")).toBeInTheDocument();
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

  /*
   * "Somente leitura", "Comentando como <e-mail>" e "Entre na sua conta" eram
   * verificados aqui porque o viewer repetia, acima do campo de texto, o que o
   * cabeçalho já dizia. A frase agora existe uma vez só, na faixa do topo, e
   * quem a trava é ViewerShell.test.tsx.
   */

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

    enviarComentarioMock.mockResolvedValueOnce(newFeedback);

    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Novo comentário");
    await userEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));

    await waitFor(() => {
      expect(screen.getByText("Novo comentário")).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith("Comentário enviado!");
    });
  });

  it("shows toast.error on failed submission", async () => {
    enviarComentarioMock.mockRejectedValueOnce(new Error("Token expirado"));

    render(<FeedbackViewer {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Test");
    await userEvent.click(screen.getByText("Enviar comentário"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Não foi possível enviar seu comentário.");
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
    expect(screen.getByText("Clique na arte")).toBeInTheDocument();
    expect(document.querySelector(".cursor-crosshair")).toBeInTheDocument();
  });

  it("toggles comment mode with C key", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByText("Comentar")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "c" });
    expect(screen.getByText("Clique na arte")).toBeInTheDocument();
  });

  it("does NOT toggle comment mode when typing in textarea", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    // First enable comment mode
    await userEvent.click(screen.getByText("Comentar"));
    expect(screen.getByText("Clique na arte")).toBeInTheDocument();

    // Focus textarea and press C — should NOT toggle
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "c" });
    // Still in comment mode
    expect(screen.getByText("Clique na arte")).toBeInTheDocument();
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

  it("shows 'Nenhum comentário em aberto.' when all are resolved and filter is on", async () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[resolvedFeedback]} />
    );
    await userEvent.click(screen.getByText("Todos"));
    expect(screen.getByText("Nenhum comentário em aberto.")).toBeInTheDocument();
  });

  /* ---------------------------------------------------------------- */
  /*  Pin navigation                                                    */
  /* ---------------------------------------------------------------- */

  it("shows pin navigation when positioned feedbacks exist", () => {
    render(
      <FeedbackViewer {...defaultProps} initialFeedbacks={[positionedFeedback]} />
    );
    expect(screen.getByText("1 na arte")).toBeInTheDocument();
    expect(screen.getByLabelText("Marcação anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Próxima marcação")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Aumentar zoom")).toBeInTheDocument();
    expect(screen.getByLabelText("Diminuir zoom")).toBeInTheDocument();
  });

  it("zoom in increases percentage", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("Aumentar zoom"));
    expect(screen.getByText("125%")).toBeInTheDocument();
  });

  it("zoom out decreases percentage", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("Diminuir zoom"));
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("oferece 'encaixar na tela' o tempo todo, não só depois de dar zoom", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    // Antes o botão só nascia depois do primeiro zoom. Quem chegava com a arte
    // grande demais para a tela não tinha como pedir que ela coubesse.
    expect(screen.getByLabelText("Encaixar na tela")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Aumentar zoom"));
    expect(screen.getByLabelText("Encaixar na tela")).toBeInTheDocument();
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
    // Should NOT display "Áudio" as transcription text anywhere
    const transcriptionText = screen.queryByText("Áudio");
    expect(transcriptionText).not.toBeInTheDocument();
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

  it("conta os comentários no cabeçalho da trilha", () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[baseFeedback, resolvedFeedback]} />);
    const titulo = screen.getByRole("heading", { name: /Comentários/ });
    expect(titulo).toHaveTextContent("(2)");
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

    enviarComentarioMock.mockResolvedValueOnce(newFeedback);

    render(<FeedbackViewer {...defaultProps} />);

    // Enable comment mode first
    await userEvent.click(screen.getByText("Comentar"));

    // Click on image to place pin (mock getBoundingClientRect since jsdom returns 0s)
    const moldura = document.querySelector("[data-arte-moldura]")!;
    vi.spyOn(moldura, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => {},
    });
    fireEvent.click(moldura, { clientX: 100, clientY: 50 });

    // Type comment and submit
    const textarea = screen.getByPlaceholderText("Escreva um comentário…");
    await userEvent.type(textarea, "Pin comment");
    /*
     * Com marcação o compositor nasce no pin, e ali o rótulo encurta: o cartão
     * tem 288px e precisa caber "Gravar áudio", "Cancelar" e o envio.
     */
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => {
      const [args] = enviarComentarioMock.mock.calls[0];
      expect(args.posicaoX).toBeTypeOf("number");
      expect(args.posicaoY).toBeTypeOf("number");
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

/**
 * Sem sessão, a escrita não fica desabilitada: ela não existe.
 *
 * Campo desabilitado ainda é campo — está no DOM, um script preenche e
 * dispara sem obstáculo, e a tela promete um caminho de escrita que o
 * servidor recusa (401 nas duas rotas de feedback). A barreira real continua
 * sendo o backend; o que muda aqui é a tela parar de prometer.
 */
describe("visitante sem sessão", () => {
  const semSessao = { ...defaultProps, temSessao: false, viewer: null };

  it("não tem campo de comentário no DOM", () => {
    render(<FeedbackViewer {...semSessao} />);
    expect(screen.queryByPlaceholderText(/escreva um comentário/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("não tem gravador de áudio no DOM", () => {
    render(<FeedbackViewer {...semSessao} />);
    expect(screen.queryByRole("button", { name: /gravar áudio/i })).not.toBeInTheDocument();
  });

  it("não tem botão de enviar comentário no DOM", () => {
    render(<FeedbackViewer {...semSessao} />);
    expect(screen.queryByRole("button", { name: /enviar comentário/i })).not.toBeInTheDocument();
  });

  it("não oferece marcar ponto na arte — marcar só serve para escrever", () => {
    render(<FeedbackViewer {...semSessao} />);
    expect(screen.queryByRole("button", { name: /^comentar$/i })).not.toBeInTheDocument();
  });

  /*
   * Duas portas, e as duas voltando para esta arte.
   *
   * Só havia o login — porta para quem JÁ tem conta. Quem recebe o link no
   * WhatsApp e nunca usou o VIU lia "precisa de conta" e não tinha para onde
   * ir: nenhum cadastro, nenhum caminho. Comentar por link não exige vínculo
   * com o projeto ("quem autorizou foi o token"), então criar conta ali mesmo
   * sempre funcionou do lado do servidor; faltava a tela oferecer.
   */
  it("oferece criar conta E entrar, as duas voltando para esta arte", () => {
    render(<FeedbackViewer {...semSessao} />);
    const cadastro = screen.getByRole("link", { name: /criar conta/i });
    const login = screen.getByRole("link", { name: /já tenho conta/i });
    expect(cadastro.getAttribute("href")).toContain("/cadastro?next=");
    expect(login.getAttribute("href")).toContain("/login?next=");
  });

  it("continua mostrando a arte e os comentários — ler pelo link é público", () => {
    render(<FeedbackViewer {...semSessao} initialFeedbacks={[baseFeedback]} />);
    expect(screen.getByText(baseFeedback.conteudo)).toBeInTheDocument();
  });

  it("com sessão, a área de escrita volta a existir", () => {
    render(<FeedbackViewer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/escreva um comentário/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /criar conta/i })).not.toBeInTheDocument();
  });
});

/*
 * Marcar vários pontos, e poder desistir de qualquer um.
 *
 * O que foi relatado: a segunda marcação movia a primeira em vez de criar
 * outra, e não havia como cancelar. O X de tirar a marcação morava no rodapé
 * da trilha — que no telefone é gaveta fechada —, Escape não fazia nada, e
 * desligar o modo comentário deixava a marcação pendurada para grudar no
 * próximo comentário. Nada disso tinha teste.
 */
describe("marcação: escrever no pin e poder desistir", () => {
  function marcar(x = 100, y = 50) {
    const moldura = document.querySelector("[data-arte-moldura]")!;
    vi.spyOn(moldura, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => {},
    });
    fireEvent.click(moldura, { clientX: x, clientY: y });
  }

  it("com marcação existe UM compositor, e ele está sobre a arte", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    // Sem marcação, o compositor é o do rodapé da trilha.
    expect(screen.getAllByPlaceholderText(/escreva um comentário/i)).toHaveLength(1);

    await userEvent.click(screen.getByText("Comentar"));
    marcar();

    // Com marcação ele não é duplicado: some do rodapé e aparece no pin. Dois
    // campos disputando o mesmo texto é como se escreve um bug.
    const campos = screen.getAllByPlaceholderText(/escreva um comentário/i);
    expect(campos).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("Escape desfaz a marcação, inclusive com o cursor no campo", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Comentar"));
    marcar();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();

    // Com o foco no campo: é escrevendo que se desiste, e a guarda que impede
    // a tecla "C" de ligar o modo no meio de uma palavra engolia o Escape.
    const campo = screen.getByPlaceholderText(/escreva um comentário/i);
    await userEvent.type(campo, "deixa pra lá");
    // Disparado NO campo e borbulhando até o window, que é como acontece de
    // verdade quando se aperta Escape com o cursor no texto.
    fireEvent.keyDown(campo, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("Cancelar tira a marcação e não guarda o texto abandonado", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Comentar"));
    marcar();
    await userEvent.type(screen.getByPlaceholderText(/escreva um comentário/i), "texto abandonado");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // O compositor volta para o rodapé, vazio: texto de uma marcação desfeita
    // reaparecendo no comentário seguinte seria pior que perdê-lo.
    const campo = screen.getByPlaceholderText(/escreva um comentário/i) as HTMLTextAreaElement;
    expect(campo.value).toBe("");
  });

  it("sair do modo comentário leva a marcação junto", async () => {
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Comentar"));
    marcar();
    // O botão alterna; o rótulo vira "Clique na arte" enquanto o modo está on.
    await userEvent.click(screen.getByText("Clique na arte"));

    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("depois de enviar, o modo segue ligado para a próxima marcação", async () => {
    enviarComentarioMock.mockResolvedValueOnce({ id: "fb_1", conteudo: "primeiro", tipo: "TEXTO" });
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.click(screen.getByText("Comentar"));
    marcar(100, 50);
    await userEvent.type(screen.getByPlaceholderText(/escreva um comentário/i), "primeiro");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    // Sem isto, marcar três pontos exigiria ligar o modo três vezes.
    await waitFor(() => expect(screen.getByText("Clique na arte")).toBeInTheDocument());
    marcar(300, 200);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("o comentário recém-enviado já aparece com autor e data", async () => {
    // Como o backend responde: camelCase, autor aninhado. O módulo já
    // desembrulha o envelope { data }, então o que chega aqui é o feedback.
    enviarComentarioMock.mockResolvedValueOnce({
      id: "fb_2", conteudo: "com autor", tipo: "TEXTO",
      criadoEm: "2026-01-02T10:00:00.000Z",
      autor: { nome: "João Santos", email: "joao@empresa.com" },
    });
    render(<FeedbackViewer {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText(/escreva um comentário/i), "com autor");
    await userEvent.click(screen.getByRole("button", { name: "Enviar comentário" }));

    // Entrava por um `as FeedbackItem` cru, sem passar pela conversão que a
    // página faz: aparecia como "Anônimo" e "Invalid Date" até recarregar.
    await waitFor(() => expect(screen.getByText("João Santos")).toBeInTheDocument());
  });
});

/*
 * O cartão do compositor não pode passar da tela.
 *
 * Números de medições reais no navegador. A primeira versão desta conta
 * clampava contra a largura errada — `clientWidth` inclui o padding, então a
 * moldura "media" 390px e mostrava 358px — e o "Enviar" saía pela borda
 * direita num telefone, com o cartão indo de 110 a 398 numa tela de 390.
 */
describe("posicaoDoCartao: cabe na tela, não na moldura", () => {
  // Telefone de 390px: área útil 358, arte deitada ocupando tudo.
  const TELEFONE = { larguraMoldura: 358, larguraArea: 358 };

  it("a marcação na borda direita não empurra o cartão para fora", () => {
    const { largura, esquerda } = posicaoDoCartao({ pinX: 90, ...TELEFONE });
    expect(largura).toBe(288);
    // Direita do cartão, em coordenadas da moldura, dentro da área.
    expect(esquerda + largura).toBeLessThanOrEqual(TELEFONE.larguraArea);
  });

  it("a marcação na borda esquerda também não", () => {
    const { esquerda } = posicaoDoCartao({ pinX: 0, ...TELEFONE });
    expect(esquerda).toBeGreaterThanOrEqual(0);
  });

  it("no meio, o cartão fica centrado na marcação", () => {
    const { largura, esquerda } = posicaoDoCartao({ pinX: 50, ...TELEFONE });
    expect(esquerda + largura / 2).toBeCloseTo(0.5 * TELEFONE.larguraMoldura, 1);
  });

  it("arte estreita não espreme o cartão: ele transborda a moldura, não a tela", () => {
    // Medido: arte 300x2400 num telefone vira moldura de 88px.
    const { largura, esquerda } = posicaoDoCartao({
      pinX: 50,
      larguraMoldura: 88,
      larguraArea: 358,
    });
    // Encolher até 88px cortaria "Gravar áudio", "Cancelar" e "Enviar".
    expect(largura).toBe(288);
    const folga = (358 - 88) / 2;
    expect(esquerda).toBeGreaterThanOrEqual(-folga);
    expect(esquerda + largura).toBeLessThanOrEqual(88 + folga);
  });

  it("tela mais estreita que o cartão encolhe o cartão, e não o contrário", () => {
    const { largura } = posicaoDoCartao({ pinX: 50, larguraMoldura: 200, larguraArea: 200 });
    expect(largura).toBe(184);
  });
});

/*
 * A conversa pelo link.
 *
 * O preview do token devolve TODOS os feedbacks públicos da arte, sem separar
 * resposta de comentário — então a resposta sempre chegou à tela. O que não
 * havia era `parent_id` no tipo: o conversor o descartava, e sem ele a
 * resposta entrava na trilha como comentário solto. Como a lista vem ordenada
 * por mais recente, ela aparecia ACIMA do comentário que respondia.
 *
 * E responder não existia pelo link: a única rota de resposta era a de
 * sessão, que exige vínculo com o projeto. O designer dizia "vou clarear na
 * v2" e quem recebeu o link não tinha como dizer "não era isso".
 */
describe("conversa: resposta é resposta, não comentário novo", () => {
  const pai: FeedbackItem = {
    id: "fb_pai",
    conteudo: "O azul do fundo ficou pesado",
    tipo: "TEXTO",
    status: "ABERTO",
    criado_em: "2026-03-01T10:00:00Z",
    autor_nome: "João",
  };
  const resposta: FeedbackItem = {
    id: "fb_resposta",
    conteudo: "Boa, vou clarear na v2",
    tipo: "TEXTO",
    status: "ABERTO",
    criado_em: "2026-03-01T11:00:00Z",
    autor_nome: "Ana",
    parent_id: "fb_pai",
  };

  it("não lista a resposta ao lado do comentário que ela responde", async () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai, resposta]} />);

    expect(screen.getByText("O azul do fundo ficou pesado")).toBeInTheDocument();
    // Fechada, a thread não mostra a resposta — e ela também não vaza para a
    // trilha. Antes aparecia como um segundo cartão, acima do pai.
    expect(screen.queryByText("Boa, vou clarear na v2")).not.toBeInTheDocument();
  });

  it("mostra a resposta dentro da thread do pai", async () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai, resposta]} />);
    await userEvent.click(screen.getByText(/^Respostas/));

    expect(await screen.findByText("Boa, vou clarear na v2")).toBeInTheDocument();
  });

  it("pelo link, não vai à rede buscar o que já veio na lista", async () => {
    /*
     * A rota de thread é de sessão e responde 403 a quem não é do projeto.
     * Buscar de novo seria pedir ao servidor o que já está na mão, por uma
     * porta que o visitante do link nem pode usar.
     */
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai, resposta]} />);
    await userEvent.click(screen.getByText(/^Respostas/));
    await screen.findByText("Boa, vou clarear na v2");

    expect(listarRespostasMock).not.toHaveBeenCalled();
  });

  it("pela conta, busca a thread mesmo já tendo uma resposta na mão", async () => {
    /*
     * Quem decide é a ORIGEM, não ter alguma resposta carregada.
     *
     * Pela conta a lista vem de `GET /feedbacks?arteId=`, que é paginada e
     * devolve só as raízes — ter uma resposta ali não significa ter a thread
     * inteira. Enquanto a condição era "já tenho alguma resposta?", isto
     * passava por acaso: como aquela rota não devolve resposta nenhuma, nunca
     * havia o que suprimir. Bastaria o servidor mudar esse filtro para a
     * thread começar a mostrar um subconjunto velho, sem nunca mais buscar.
     */
    render(<FeedbackViewer {...defaultProps} token="" initialFeedbacks={[pai, resposta]} />);
    await userEvent.click(screen.getByText(/^Respostas/));

    await waitFor(() => expect(listarRespostasMock).toHaveBeenCalledWith("fb_pai"));
  });

  it("conta as respostas sem contá-las como comentários", async () => {
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai, resposta]} />);
    expect(screen.getByText(/^Respostas \(1\)/)).toBeInTheDocument();
  });

  it("responder pelo link vai pela porta do token", async () => {
    responderMock.mockResolvedValueOnce({
      id: "fb_nova", conteudo: "não era isso", tipo: "TEXTO", status: "ABERTO",
      criado_em: "2026-03-01T12:00:00Z", autor_nome: "João", parent_id: "fb_pai",
    });
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai, resposta]} />);
    await userEvent.click(screen.getByText(/^Respostas/));

    await userEvent.type(await screen.findByPlaceholderText("Responder..."), "não era isso");
    await userEvent.keyboard("{Enter}");

    // O token é o terceiro argumento: é ele que manda por
    // /links/:token/feedbacks em vez da rota de sessão.
    await waitFor(() =>
      expect(responderMock).toHaveBeenCalledWith("fb_pai", "não era isso", "tok_123"),
    );
  });

  it("a resposta enviada aparece na thread sem recarregar", async () => {
    responderMock.mockResolvedValueOnce({
      id: "fb_nova", conteudo: "não era isso, é o contraste", tipo: "TEXTO", status: "ABERTO",
      criado_em: "2026-03-01T12:00:00Z", autor_nome: "João", parent_id: "fb_pai",
    });
    render(<FeedbackViewer {...defaultProps} initialFeedbacks={[pai]} />);
    await userEvent.click(screen.getByText(/^Respostas/));
    await userEvent.type(await screen.findByPlaceholderText("Responder..."), "x");
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByText("não era isso, é o contraste")).toBeInTheDocument();
    // E não vira um cartão novo na trilha: entrou com parent_id.
    expect(screen.getAllByText("não era isso, é o contraste")).toHaveLength(1);
  });
});
