import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ViewerShell from '../ViewerShell'

/**
 * O viewer público prometia o que não entrega.
 *
 * Ler pelo link é público, mas comentar e aprovar exigem conta — `autorId` é
 * obrigatório no schema de Feedback, e aprovar exige ser o cliente do projeto.
 * Mesmo assim o visitante anônimo levava um modal pedindo e-mail e nome (que
 * o backend nunca usa) e uma aba de Aprovações inteira que sempre respondia
 * 401. Este arquivo trava a regra: sem sessão, o viewer é leitura e diz isso.
 *
 * Havia também `FeedbackPanel` montado ao lado do viewer, com outra lista dos
 * mesmos feedbacks. Ele saiu, e por isso não há mais o que verificar sobre
 * ele aqui — o que ele tinha de próprio (ouvir o comentário) o viewer já faz.
 *
 * As aprovações agora entram no viewer como conteúdo da trilha lateral, então
 * o dublê precisa renderizar a prop: sem isso o teste diria "não há painel de
 * aprovações" pelo motivo errado.
 */

vi.mock('@/components/viewer/FeedbackViewer', () => ({
  default: ({ aprovacoes }: { aprovacoes?: React.ReactNode }) => (
    <div data-testid="feedback-viewer">{aprovacoes}</div>
  ),
}))
vi.mock('@/components/viewer/ApprovalsPanel', () => ({
  default: () => <div data-testid="approvals-panel" />,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const ARTE = {
  id: 'arte1',
  nome: 'Capa',
  arquivo: 'https://r2.example.com/a.png?assinado',
  versao: 1,
  status: 'EM_ANALISE',
} as any

function renderViewer(props: Partial<React.ComponentProps<typeof ViewerShell>> = {}) {
  return render(
    <ViewerShell
      arte={ARTE}
      initialFeedbacks={[]}
      versoes={[]}
      aprovacoesByVersao={{}}
      readOnly={false}
      token="tok123"
      {...props}
    />,
  )
}

/*
 * `temSessao()` só olha se a chave existe — é o cookie que manda no acesso.
 * Já `perfilEmCache()` exige `id`, e é ele que alimenta a etiqueta de quem
 * está comentando; sem o id a tela cai no genérico "com sua conta".
 */
function comSessao() {
  localStorage.setItem(
    'viu_user',
    JSON.stringify({ id: 'cliente1', nome: 'Cliente', email: 'c@t.com' }),
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => localStorage.clear())

describe('visitante anônimo (sem sessão)', () => {
  it('não recebe o modal de identificação', () => {
    renderViewer()
    // O IdentityGate coleta e-mail e nome que o backend não lê. Para quem não
    // pode comentar, é um formulário sem destino.
    expect(screen.queryByText(/informe.*e-mail|identifique/i)).not.toBeInTheDocument()
  })

  it('não vê as aprovações', () => {
    renderViewer()
    // Aprovar exige sessão E ser o cliente do projeto; o painel respondia 401.
    expect(screen.queryByTestId('approvals-panel')).not.toBeInTheDocument()
  })

  it('continua vendo a arte — ler pelo link é público', () => {
    renderViewer()
    expect(screen.getByTestId('feedback-viewer')).toBeInTheDocument()
  })

  it('diz que precisa entrar para comentar, em vez de deixar tentar', () => {
    renderViewer()
    expect(screen.getByText('Entre na sua conta para comentar')).toBeInTheDocument()
  })
})

describe('usuário com sessão', () => {
  it('vê as aprovações', () => {
    comSessao()
    renderViewer()
    expect(screen.getByTestId('approvals-panel')).toBeInTheDocument()
  })

  it('mantém a arte disponível', () => {
    comSessao()
    renderViewer()
    expect(screen.getByTestId('feedback-viewer')).toBeInTheDocument()
  })

  /*
   * A frase de situação vivia em dois lugares — a faixa do topo e, de novo,
   * acima do campo de texto dentro do viewer. Agora é só aqui.
   */
  it('diz com qual conta o comentário vai sair', () => {
    comSessao()
    renderViewer()
    expect(screen.getByText('Comentando como c@t.com')).toBeInTheDocument()
  })
})

describe('link somente leitura', () => {
  it('avisa antes de a pessoa tentar comentar', () => {
    comSessao()
    renderViewer({ readOnly: true })
    expect(screen.getByText('Somente leitura')).toBeInTheDocument()
  })
})

describe('o que identifica a arte', () => {
  it('mostra nome, versão e situação numa linha só', () => {
    renderViewer()
    expect(screen.getByRole('heading', { name: /Capa/ })).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    // O cliente lia "EM_ANALISE" em caixa alta — o enum é do banco, não da tela.
    expect(screen.queryByText('EM_ANALISE')).not.toBeInTheDocument()
  })
})
