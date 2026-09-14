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

  it('aprovar registra a decisão sem exigir comentário', async () => {
    get.mockResolvedValue({ data: [pendente()] })
    put.mockResolvedValue({})
    render(<AguardandoVoce usuarioId={EU} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))

    await waitFor(() => expect(put).toHaveBeenCalledWith('/aprovacoes/ap1', {
      status: 'APROVADO',
      comentario: null,
    }))
  })

  it('pedir ajustes só envia com motivo escrito', async () => {
    get.mockResolvedValue({ data: [pendente()] })
    put.mockResolvedValue({})
    render(<AguardandoVoce usuarioId={EU} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir ajustes' }))

    const enviar = screen.getByRole('button', { name: 'Enviar pedido' })
    expect(enviar).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('O que precisa mudar?'), '   ')
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('O que precisa mudar?'), 'o logo está esticado')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    await waitFor(() => expect(put).toHaveBeenCalledWith('/aprovacoes/ap1', {
      status: 'REJEITADO',
      comentario: 'o logo está esticado',
    }))
  })

  it('sem usuário não pergunta nada', async () => {
    render(<AguardandoVoce usuarioId={null} />)
    await waitFor(() => expect(get).not.toHaveBeenCalled())
  })
})
