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
      // O padrão dos testes é o visitante de link sem sessão; quem tem sessão
      // passa `sessaoNoServidor` explicitamente, como a página faz.
      sessaoNoServidor={false}
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

describe('sessão que só o servidor enxerga', () => {
  /*
   * O caso que quebrava: cookie HttpOnly válido e `localStorage` vazio.
   *
   * Acontece em aba anônima, com armazenamento bloqueado, e — o mais comum —
   * na primeira carga, antes de o `AuthProvider` preencher o cache. A tela
   * lia `localStorage` uma vez e concluía "deslogado", entregando a porta de
   * login a quem já estava dentro. E nunca mais, porque o efeito não relê.
   */
  it('dá os controles a quem o servidor diz estar logado, mesmo sem cache', () => {
    renderViewer({ sessaoNoServidor: true })
    expect(screen.getByTestId('approvals-panel')).toBeInTheDocument()
  })

  it('o cache confirma a sessão, nunca a nega', () => {
    // Sem cache e sem sessão no servidor continua sendo visitante — o `||` não
    // pode transformar ausência de cache em sessão.
    renderViewer({ sessaoNoServidor: false })
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          aprovacoes: [
            { id: 'ap1', status: 'PENDENTE', versaoNumero: 2, aprovador: { id: 'cliente1' } },
          ],
        }),
      }),
    )

    renderViewer({ readOnly: true })

    expect(await screen.findByText(/aguarda sua decisão/i)).toBeInTheDocument()
    vi.unstubAllGlobals()
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
