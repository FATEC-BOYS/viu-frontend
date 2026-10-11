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

/*
 * A sessão agora vem do `AuthProvider`, e não mais de um `sessaoNoServidor`
 * passado pela página. Aquela prop era o cookie lido pelo SERVIDOR NEXT, e o
 * cookie é host-only no domínio do backend: publicados em domínios
 * diferentes, o servidor Next nunca o via e a resposta era sempre `false`.
 * O provider pergunta de onde dá para perguntar — do navegador, que tem o
 * cookie — então é ele que estes testes precisam controlar.
 */
let usuarioLogado: { id: string; nome: string; email: string } | null = null

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: usuarioLogado }),
}))

/*
 * As aprovações deixaram de passar pela rota do Next e vão direto ao backend,
 * pelo mesmo motivo: o servidor Next não tem o cookie da sessão quando a API
 * mora em outro domínio.
 */
let aprovacoesDaArte: any[] = []

vi.mock('@/lib/aprovacoesDaArte', () => ({
  listarAprovacoes: async () => aprovacoesDaArte,
  decidirAprovacao: async () => undefined,
}))

vi.mock('@/components/viewer/FeedbackViewer', () => ({
  default: ({
    aprovacoes,
    decisao,
  }: {
    aprovacoes?: React.ReactNode
    decisao?: React.ReactNode
  }) => (
    <div data-testid="feedback-viewer">
      {aprovacoes}
      {decisao}
    </div>
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
 * Quem está logado, segundo o provider — que é o que o componente consulta.
 * O e-mail importa: é ele que alimenta a etiqueta de com qual conta o
 * comentário vai sair, e sem ele a tela cai no genérico "com sua conta".
 */
function comSessao() {
  usuarioLogado = { id: 'cliente1', nome: 'Cliente', email: 'c@t.com' }
}

beforeEach(() => {
  usuarioLogado = null
  aprovacoesDaArte = []
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => localStorage.clear())

describe('quem responde se há sessão', () => {
  /*
   * O caso que quebrava em produção: pessoa logada, cookie válido no
   * navegador, e a tela entregando a porta de login no lugar dos próprios
   * controles.
   *
   * A resposta vinha do servidor Next lendo o cookie — que ele não tem, por
   * ser host-only no domínio do backend. Quem sabe é o navegador, e é o
   * `AuthProvider` quem pergunta por ele.
   */
  it('dá os controles a quem o provider diz estar logado', () => {
    comSessao()
    renderViewer()
    expect(screen.getByTestId('approvals-panel')).toBeInTheDocument()
  })

  it('sem usuário no provider, continua sendo visitante', () => {
    renderViewer()
    expect(screen.queryByTestId('approvals-panel')).not.toBeInTheDocument()
  })

  it('não depende do localStorage: cache cheio sem sessão não vira sessão', () => {
    // O cache é conveniência de interface, não credencial. Quem manda é o
    // cookie, e quem o confirma é o /auth/me por trás do provider.
    localStorage.setItem('viu_user', JSON.stringify({ id: 'x', email: 'x@t.com' }))
    renderViewer()
    expect(screen.queryByTestId('approvals-panel')).not.toBeInTheDocument()
  })
})

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

  /*
   * Antes isto era uma FRASE — "Entre na sua conta para comentar" — sem link, e
   * o botão de comentar ficava desabilitado ao lado. A tela pedia uma coisa e
   * não dizia por onde: quem recebeu o link no celular chegava num beco.
   */
  it('oferece uma PORTA para entrar, não só um aviso', () => {
    renderViewer()
    const entrar = screen.getByRole('link', { name: /entrar para comentar/i })
    expect(entrar).toBeInTheDocument()
  })

  it('volta para esta mesma arte depois do login', () => {
    /*
     * Sem o `next`, entrar jogava a pessoa no dashboard — e ela perdia o link
     * que tinha recebido, que é o único endereço que ela tem para a arte.
     */
    renderViewer()
    const href = screen.getByRole('link', { name: /entrar para comentar/i }).getAttribute('href')
    expect(href).toContain('/login?next=')
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

  /*
   * O link que o produto cria nasce só-leitura (o wizard começa com o switch
   * ligado). Como "Somente leitura" vinha antes de qualquer coisa, o visitante
   * do link padrão via a frase e NENHUMA porta — o beco que o `next=` tinha
   * fechado continuava aberto no caso mais comum. Só se vê dirigindo o app.
   */
  it('ainda assim oferece a porta para quem não tem sessão', () => {
    renderViewer({ readOnly: true })
    const entrar = screen.getByRole('link', { name: 'Entrar na sua conta' })
    expect(entrar.getAttribute('href')).toContain('/login?next=')
  })

  it('não promete comentário que o link não permite', () => {
    renderViewer({ readOnly: true })
    expect(screen.queryByRole('link', { name: /entrar para comentar/i })).not.toBeInTheDocument()
  })

  /*
   * Aprovar não passa pelo link: a permissão do link governa comentário, e a
   * decisão vai por `PUT /aprovacoes/:id` com a sessão. Condicionar a barra a
   * `!readOnly` escondia o botão justamente no link padrão.
   */
  it('mostra a decisão pendente mesmo com o link só-leitura', async () => {
    comSessao()
    aprovacoesDaArte = [
      { id: 'ap1', status: 'PENDENTE', versaoNumero: 2, aprovador: { id: 'cliente1' } },
    ]

    renderViewer({ readOnly: true })

    expect(await screen.findByText(/aguarda sua decisão/i)).toBeInTheDocument()
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
