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
 */

vi.mock('@/components/viewer/FeedbackViewer', () => ({
  default: () => <div data-testid="feedback-viewer" />,
}))
vi.mock('@/components/viewer/FeedbackPanel', () => ({
  default: () => <div data-testid="feedback-panel" />,
}))
vi.mock('@/components/viewer/ApprovalsPanel', () => ({
  default: () => <div data-testid="approvals-panel" />,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const ARTE = {
  id: 'arte1',
  nome: 'Capa',
  arquivo_url: 'https://r2.example.com/a.png?assinado',
  status: 'EM_ANALISE',
} as any

function renderViewer() {
  return render(
    <ViewerShell
      arte={ARTE}
      initialFeedbacks={[]}
      versoes={[]}
      aprovacoesByVersao={{}}
      readOnly={false}
      token="tok123"
    />,
  )
}

/** Sessão é sinalizada pelo perfil em cache — é o que `temSessao()` lê. */
function comSessao() {
  localStorage.setItem('viu_user', JSON.stringify({ nome: 'Cliente', email: 'c@t.com' }))
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

  it('não vê a aba de aprovações', () => {
    renderViewer()
    // Aprovar exige sessão E ser o cliente do projeto; o painel respondia 401.
    expect(screen.queryByTestId('approvals-panel')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /aprova/i })).not.toBeInTheDocument()
  })

  it('continua vendo a arte e os feedbacks — ler pelo link é público', () => {
    renderViewer()
    expect(screen.getByTestId('feedback-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('feedback-panel')).toBeInTheDocument()
  })

  it('diz que precisa entrar para comentar, em vez de deixar tentar', () => {
    renderViewer()
    expect(screen.getByText(/entre.*conta|somente leitura/i)).toBeInTheDocument()
  })
})

describe('usuário com sessão', () => {
  it('vê a aba de aprovações', () => {
    comSessao()
    renderViewer()
    expect(screen.getByTestId('approvals-panel')).toBeInTheDocument()
  })

  it('mantém o viewer e a aba de feedbacks disponível', () => {
    comSessao()
    renderViewer()
    expect(screen.getByTestId('feedback-viewer')).toBeInTheDocument()
    // Com sessão a aba ativa é Aprovações, e Tabs só monta o painel ativo —
    // o que se verifica aqui é que a aba de feedbacks continua alcançável.
    expect(screen.getByRole('tab', { name: /feedback/i })).toBeInTheDocument()
  })
})
