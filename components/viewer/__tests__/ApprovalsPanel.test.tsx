import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApprovalsPanel from '../ApprovalsPanel'

/**
 * O painel oferecia o que ia falhar.
 *
 * Aprovar/Rejeitar apareciam em toda linha — inclusive na de outra pessoa e em
 * aprovação já terminal. O backend recusa (`aprovadorId !== userId` → 403),
 * então nunca foi falha de segurança: era a UI convidando para um erro e
 * entregando o 403 num `alert()`. Aqui a regra da tela passa a ser a mesma do
 * backend.
 *
 * Também some o que nunca teve fonte: o `versao: 1` fixo no título e a seção
 * "Aprovações via link", que respondia "nenhum convidado" para sempre.
 */

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

/*
 * O painel deixou de passar pela rota do Next (`/api/arte/[id]/aprovacoes`) e
 * fala direto com o backend: publicado, o servidor Next não tem o cookie da
 * sessão — ele é host-only no domínio do backend — e o repasse respondia
 * lista vazia a quem estava logada. Quem é "eu" também deixou de sair do
 * `localStorage` e passou a vir do `AuthProvider`, pelo mesmo motivo de
 * sempre: cache não é credencial.
 *
 * Estes testes dublam as duas coisas, e ganham com isso — o que importa aqui
 * é quem a tela deixa decidir, não por qual cano ela perguntou.
 */
let usuarioLogado: { id: string; nome: string } | null = null
const listarMock = vi.fn(async (_arteId?: string) => [] as any[])
const decidirMock = vi.fn(async (..._a: unknown[]) => undefined)

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: usuarioLogado }),
}))

vi.mock('@/lib/aprovacoesDaArte', () => ({
  listarAprovacoes: (a: string) => listarMock(a),
  decidirAprovacao: (a: string, b: string, c: unknown) => decidirMock(a, b, c),
}))

const EU = 'cliente-1'

function aprovacao(over: Record<string, unknown> = {}) {
  return {
    id: 'ap1',
    status: 'PENDENTE',
    comentario: null,
    criadoEm: '2026-03-01T10:00:00.000Z',
    versaoNumero: 3,
    aprovador: { id: EU, nome: 'Cliente' },
    ...over,
  }
}

function responder(aprovacoes: unknown[]) {
  listarMock.mockResolvedValue(aprovacoes as any[])
}

/** Sessão é quem o `AuthProvider` diz que está logado. */
function logadoComo(id: string) {
  usuarioLogado = { id, nome: 'Cliente' }
}

beforeEach(() => {
  usuarioLogado = null
  listarMock.mockReset().mockResolvedValue([])
  decidirMock.mockReset().mockResolvedValue(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const props = { arteId: 'arte1' }

describe('quem pode decidir', () => {
  it('mostra Aprovar e Pedir ajustes para o aprovador da vez', async () => {
    logadoComo(EU)
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    expect(await screen.findByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pedir ajustes' })).toBeInTheDocument()
  })

  /**
   * "Pedir ajustes" no lugar de "Recusar" não é copy mais macia: é o que a
   * recusa passou a ser. Recusar sem dizer o que mudar devolve ao designer o
   * que ele já tinha, e o backend responde 422 (RECUSA_SEM_MOTIVO). A tela
   * trava o botão para a pessoa não descobrir a regra levando erro.
   */
  it('só envia o pedido de ajuste depois que o motivo é escrito', async () => {
    logadoComo(EU)
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Pedir ajustes' }))
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('O que precisa mudar?'), 'o azul saiu errado')
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    /*
     * Pelo id DESTA linha. O painel mandava o `aprovadorId` e deixava o
     * servidor redescobrir qual pendência era — com duas abertas na mesma
     * arte, dava para registrar a decisão na versão errada.
     */
    await waitFor(() => {
      expect(decidirMock).toHaveBeenCalledWith('ap1', 'REJEITADO', 'o azul saiu errado')
    })
  })

  it('não oferece decisão na aprovação de outra pessoa', async () => {
    logadoComo('outro-usuario')
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    await screen.findByText('Cliente')
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument()
  })

  it('não oferece decisão em aprovação já respondida', async () => {
    logadoComo(EU)
    responder([aprovacao({ status: 'APROVADO' })])

    render(<ApprovalsPanel {...props} />)

    // APROVADO e REJEITADO são terminais na máquina de estados do backend.
    await screen.findByText(/aprovado/i)
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument()
  })

  it('não oferece decisão para visitante sem sessão', async () => {
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    await screen.findByText('Cliente')
    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument()
  })
})

describe('o que o painel diz', () => {
  it('traduz o status em vez de mostrar o enum cru', async () => {
    logadoComo(EU)
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    expect(await screen.findByText('Aguardando decisão')).toBeInTheDocument()
    expect(screen.queryByText('PENDENTE')).not.toBeInTheDocument()
  })

  it('mostra a versão que veio do backend, não um "v1" fixo', async () => {
    logadoComo(EU)
    responder([aprovacao({ versaoNumero: 3 })])

    render(<ApprovalsPanel {...props} />)

    expect(await screen.findByText(/v3/)).toBeInTheDocument()
  })

  it('não anuncia seção de convidados, que nunca teve fonte de dados', async () => {
    logadoComo(EU)
    responder([aprovacao()])

    render(<ApprovalsPanel {...props} />)

    await screen.findByText('Cliente')
    expect(screen.queryByText(/via link|convidado/i)).not.toBeInTheDocument()
  })

  it('diz o que falta acontecer quando não há nada para decidir', async () => {
    logadoComo(EU)
    responder([])

    render(<ApprovalsPanel {...props} />)

    await waitFor(() =>
      expect(screen.getByText(/quando o designer solicitar/i)).toBeInTheDocument(),
    )
  })
})

it('distingue erro de lista vazia e recupera ao tentar novamente', async () => {
  listarMock.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce([])
  render(<ApprovalsPanel arteId="arte1" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as aprovações.')
  expect(screen.queryByText('Nada foi enviado para aprovação ainda.')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('Nada foi enviado para aprovação ainda.')).toBeInTheDocument()
})
it('mantém a decisão antiga no histórico sem permitir decidir sobre outro arquivo', async () => {
  usuarioLogado = { id: EU, nome: 'Cliente' }
  listarMock.mockResolvedValue([aprovacao({ versaoNumero: 1 })])
  render(<ApprovalsPanel arteId="arte1" versaoAtual={2} />)
  await screen.findByText(/v1/)
  expect(screen.queryByRole('button', { name: /^aprovar$/i })).not.toBeInTheDocument()
})
