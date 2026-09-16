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
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ aprovacoes }),
    }),
  )
}

/** Sessão é o perfil em cache — é o que `perfilEmCache()` lê. */
function logadoComo(id: string) {
  localStorage.setItem('viu_user', JSON.stringify({ id, nome: 'Cliente' }))
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const props = { arteId: 'arte1', token: 'tok123' }

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

    await waitFor(() => {
      const chamada = (globalThis.fetch as any).mock.calls.find(
        ([, init]: any[]) => init?.method === 'PATCH',
      )
      expect(chamada).toBeTruthy()
      expect(JSON.parse(chamada[1].body)).toMatchObject({
        decisao: 'REJEITADO',
        comentario: 'o azul saiu errado',
      })
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
