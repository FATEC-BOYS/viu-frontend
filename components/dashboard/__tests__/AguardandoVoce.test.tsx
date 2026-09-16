import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AguardandoVoce from '../AguardandoVoce'

/**
 * A fila do cliente existia no banco e nenhuma tela perguntava por ela.
 *
 * O que estes testes seguram:
 *  - a pergunta certa (`status=PENDENTE` + `aprovadorId=eu`), porque o
 *    dashboard perguntava `status=APROVADO` — as já decididas;
 *  - a faixa sumir quando não há nada, para não custar espaço a quem não tem
 *    fila;
 *  - pedir ajuste sem dizer o quê não sair da tela, que é a mesma regra que o
 *    backend aplica em 422.
 */

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const get = vi.fn()
const put = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...a: any[]) => get(...a), put: (...a: any[]) => put(...a) } }))

const EU = 'cliente-1'

function pendente(over: Record<string, unknown> = {}) {
  return {
    id: 'ap1',
    criadoEm: new Date().toISOString(),
    versaoNumero: 2,
    arte: { id: 'arte-1', nome: 'Cartaz do show', versao: 3, previewUrl: null },
    ...over,
  }
}

beforeEach(() => {
  get.mockReset()
  put.mockReset()
})

describe('AguardandoVoce', () => {
  it('pergunta pelas pendentes de quem está logado, não pelas já decididas', async () => {
    get.mockResolvedValue({ data: [] })
    render(<AguardandoVoce usuarioId={EU} />)

    await waitFor(() => expect(get).toHaveBeenCalled())
    const rota = get.mock.calls[0][0] as string
    expect(rota).toContain('status=PENDENTE')
    expect(rota).toContain(`aprovadorId=${EU}`)
  })

  it('não ocupa espaço quando não há nada esperando', async () => {
    get.mockResolvedValue({ data: [] })
    const { container } = render(<AguardandoVoce usuarioId={EU} />)

    await waitFor(() => expect(get).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('mostra a versão julgada, não a versão atual da arte', async () => {
    get.mockResolvedValue({ data: [pendente()] })
    render(<AguardandoVoce usuarioId={EU} />)

    expect(await screen.findByText('Cartaz do show')).toBeInTheDocument()
    expect(screen.getByText('v2')).toBeInTheDocument()
  })

  /**
   * A decisão saiu daqui de propósito.
   *
   * Antes o cartão trazia "Aprovar" e "Pedir ajustes" ao lado de uma
   * miniatura de 56px — aprovar sem ver a peça. Isso existia porque a arte
   * não tinha endereço para quem estava logado. Agora tem, e a fila leva até
   * lá: decidir acontece onde dá para olhar de perto, com o comentário e o
   * histórico do lado. A regra do motivo obrigatório continua presa nos
   * testes do visualizador e do backend.
   */
  it('a linha inteira leva para a revisão — sem botão preenchido', async () => {
    get.mockResolvedValue({ data: [pendente()] })
    render(<AguardandoVoce usuarioId={EU} />)

    /*
     * O alvo é a linha, não um botão dentro dela: três blocos de cor
     * empilhados fazem cada um parecer menos urgente que o anterior, e num
     * telefone a linha é um alvo de toque maior que qualquer botão.
     */
    const linha = await screen.findByRole('link', { name: /Cartaz do show/ })
    expect(linha.getAttribute('href')).toBe('/viewer/arte/arte-1')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a peça é o assunto do cartão — a imagem vem do backend, assinada', async () => {
    get.mockResolvedValue({
      data: [pendente({ arte: { id: 'arte-1', nome: 'Cartaz do show', previewUrl: 'https://r2/x?assinado' } })],
    })
    render(<AguardandoVoce usuarioId={EU} />)

    const img = await screen.findByAltText('Cartaz do show')
    expect(img).toBeInTheDocument()
  })

  it('sem imagem, o cartão não mostra erro — mostra a inicial da peça', async () => {
    get.mockResolvedValue({ data: [pendente()] })
    render(<AguardandoVoce usuarioId={EU} />)

    await screen.findByText('Cartaz do show')
    expect(screen.queryByAltText('Cartaz do show')).not.toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('com a fila vazia, mostra o que quem a montou pediu', async () => {
    get.mockResolvedValue({ data: [] })
    render(<AguardandoVoce usuarioId={EU} vazio={<p>nada por aqui</p>} />)

    expect(await screen.findByText('nada por aqui')).toBeInTheDocument()
  })

  it('sem usuário não pergunta nada', async () => {
    render(<AguardandoVoce usuarioId={null} />)
    await waitFor(() => expect(get).not.toHaveBeenCalled())
  })
})
