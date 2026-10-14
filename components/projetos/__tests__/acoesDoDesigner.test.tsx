import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProjetoHeader from "../ProjetoHeader";
import EstadoDoProjeto from "../overview/EstadoDoProjeto";
import ProximosPassos from "../overview/ProximosPassos";

/**
 * O que a tela do projeto OFERECE a quem não pode fazer.
 *
 * Relatado com um print: logada como cliente, a tela mostrava "Editar",
 * "Subir nova arte" e "Resolver" em *Enviar para aprovação* — todas ações do
 * designer. E não era só a tela: medido no servidor, logada como cliente,
 * `PUT /projetos/:id` renomeava (200), cancelava (200) e `DELETE` apagava
 * (200). O backend passou a recusar; estes testes seguram o outro lado, para
 * a pessoa não esbarrar num 403 depois de clicar.
 *
 * Existem aqui, em vez de num teste de página, porque é por estes três
 * componentes que as ações entram na tela — e porque uma varredura visual já
 * passou por estes arquivos sem olhar para permissão.
 */

const PROJETO = {
  id: "cproj1",
  nome: "Identidade Visual",
  descricao: "um projeto",
  status: "EM_ANDAMENTO",
} as any;

const RESUMO = { total: 1, aprovadas: 0, estado: "CRIAR_ARTE" } as any;

const PASSOS = [
  { kind: "ENVIAR_APROVACAO", label: 'Enviar para aprovação: "Teste"', detalhe: null },
] as any;

describe("ProjetoHeader", () => {
  const acoes = {
    onEditar: vi.fn(),
    onPessoas: vi.fn(),
    onDuplicar: vi.fn(),
    onPausar: vi.fn(),
    onRetomar: vi.fn(),
    onCancelar: vi.fn(),
  };

  it("sem permissão de editar, nem o botão nem o menu existem no DOM", () => {
    render(<ProjetoHeader projeto={PROJETO} podeEditar={false} {...acoes} />);

    expect(screen.queryByRole("button", { name: /^editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pessoas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mais ações/i })).not.toBeInTheDocument();
  });

  /*
   * Não existir, e não ficar desabilitado: botão desabilitado continua no DOM
   * e continua prometendo um caminho que o servidor recusa. É a mesma regra
   * que o viewer já aplica para quem não tem sessão.
   */
  it("o designer do projeto continua com tudo", () => {
    render(<ProjetoHeader projeto={PROJETO} podeEditar {...acoes} />);

    expect(screen.getByRole("button", { name: /^editar$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pessoas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mais ações/i })).toBeInTheDocument();
  });

  it("ler o projeto nunca dependeu de poder editá-lo", () => {
    render(<ProjetoHeader projeto={PROJETO} podeEditar={false} {...acoes} />);
    expect(screen.getByText("Identidade Visual")).toBeInTheDocument();
  });
});

describe("EstadoDoProjeto", () => {
  it("sem ação, mostra o estado e não oferece o botão", () => {
    render(<EstadoDoProjeto resumo={RESUMO} estado="CRIAR_ARTE" />);
    expect(screen.queryByText(/subir nova arte/i)).not.toBeInTheDocument();
  });

  it("com ação, o botão aparece", () => {
    render(<EstadoDoProjeto resumo={RESUMO} estado="CRIAR_ARTE" onAction={vi.fn()} />);
    expect(screen.getByText(/subir nova arte/i)).toBeInTheDocument();
  });
});

describe("ProximosPassos", () => {
  /*
   * O passo CONTINUA listado: saber o que falta é de quem é do projeto, e
   * esconder a informação seria trocar um defeito por outro. O que sai é o
   * botão.
   */
  it("sem ação, o passo continua visível e o 'Resolver' não", () => {
    render(<ProximosPassos passos={PASSOS} />);
    expect(screen.getByText(/enviar para aprovação/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resolver/i })).not.toBeInTheDocument();
  });

  it("com ação, o 'Resolver' aparece", () => {
    render(<ProximosPassos passos={PASSOS} onAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: /resolver/i })).toBeInTheDocument();
  });
});
