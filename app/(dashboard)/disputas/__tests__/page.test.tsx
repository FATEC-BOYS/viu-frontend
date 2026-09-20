import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('framer-motion', async () =>
  (await import('@/test-utils/framerMotion')).mockDeFramerMotion(),
)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const useAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }))

const apiGet = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...a: any[]) => apiGet(...a) } }))

const getFaturas = vi.fn()
vi.mock('@/lib/pagamentos', async () => {
  const real = await vi.importActual<any>('@/lib/pagamentos')
  return { ...real, pagamentosApi: { getFaturas: (...a: any[]) => getFaturas(...a) } }
})

const listarDisputas = vi.fn()
const abrirDisputa = vi.fn()
vi.mock('@/lib/protecao', async () => {
  const real = await vi.importActual<any>('@/lib/protecao')
  return {
    ...real,
    protecaoApi: {
      listarDisputas: (...a: any[]) => listarDisputas(...a),
      abrirDisputa: (...a: any[]) => abrirDisputa(...a),
    },
  }
})

import DisputasPage from '../page'

function fatura(extra: Record<string, unknown> = {}) {
  return {
    id: 'cfat0000000000001',
    valor: 1200000,
    valorFormatado: 'R$ 12.000,00',
    valorLiquidoDesignerFormatado: 'R$ 10.800,00',
    status: 'PAGA',
    descricao: 'Entrega final',
    projeto: { id: 'proj1', nome: 'Rebranding Acme' },
    cliente: { id: 'cliente1', nome: 'João' },
    designer: { id: 'designer1', nome: 'Ana' },
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { id: 'designer1', tipo: 'DESIGNER' } })
  listarDisputas.mockResolvedValue([])
  apiGet.mockResolvedValue({ data: [{ id: 'proj1', nome: 'Rebranding Acme' }] })
  getFaturas.mockResolvedValue({ data: [fatura()] })
  abrirDisputa.mockResolvedValue({
    id: 'disp1',
    tipo: 'CALOTE',
    status: 'ABERTA',
    descricao: 'x',
    saldoBloqueado: 1080000,
    abertaPorId: 'designer1',
    projetoId: 'proj1',
    criadoEm: '2026-09-20T12:00:00.000Z',
    atualizadoEm: '2026-09-20T12:00:00.000Z',
  })
})

async function abrirModalEEscolherProjeto(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /abrir disputa/i }))
  await user.click(await screen.findByRole('combobox', { name: /projeto/i }))
  await user.click(await screen.findByRole('option', { name: 'Rebranding Acme' }))
}

/*
 * O mecanismo de retenção existia inteiro e esta tela não o alcançava: o
 * backend só congela o valor quando recebe `faturaId`, e o modal nunca mandava
 * `faturaId`. Conferido no app antes do conserto — fatura PAGA de R$ 10.800,
 * disputa de CALOTE aberta como esta tela abria, `saldoBloqueado: 0`.
 */
describe('Abrir disputa aponta a fatura em jogo', () => {
  it('pede as faturas daquele projeto, pelo lado da pessoa', async () => {
    const user = userEvent.setup()
    render(<DisputasPage />)
    await abrirModalEEscolherProjeto(user)

    await waitFor(() => expect(getFaturas).toHaveBeenCalledWith('designer', 'proj1'))
  })

  it('manda o faturaId escolhido — que é o que faz o valor ser retido', async () => {
    const user = userEvent.setup()
    render(<DisputasPage />)
    await abrirModalEEscolherProjeto(user)

    await user.click(await screen.findByRole('combobox', { name: /fatura em disputa/i }))
    await user.click(await screen.findByRole('option', { name: /R\$ 12\.000,00/ }))
    await user.type(
      screen.getByRole('textbox'),
      'O cliente sumiu depois da entrega final e não pagou.',
    )
    await user.click(screen.getByRole('button', { name: /registrar disputa/i }))

    await waitFor(() =>
      expect(abrirDisputa).toHaveBeenCalledWith(
        expect.objectContaining({ projetoId: 'proj1', faturaId: 'cfat0000000000001' }),
      ),
    )
  })

  /*
   * O efeito escrito antes do clique: dinheiro não pode ficar retido sem a
   * pessoa ter apontado para ele.
   */
  it('diz quanto será retido quando a fatura escolhida está paga', async () => {
    const user = userEvent.setup()
    render(<DisputasPage />)
    await abrirModalEEscolherProjeto(user)

    await user.click(await screen.findByRole('combobox', { name: /fatura em disputa/i }))
    await user.click(await screen.findByRole('option', { name: /R\$ 12\.000,00/ }))

    expect(await screen.findByText(/R\$ 10\.800,00 ficam retidos/)).toBeInTheDocument()
  })

  it('começa em "nenhuma" e avisa que nada fica retido', async () => {
    const user = userEvent.setup()
    render(<DisputasPage />)
    await abrirModalEEscolherProjeto(user)

    expect(await screen.findByText(/Nenhum valor fica retido/)).toBeInTheDocument()
  })

  it('não oferece fatura antes de haver projeto', async () => {
    const user = userEvent.setup()
    render(<DisputasPage />)
    await user.click(await screen.findByRole('button', { name: /abrir disputa/i }))

    expect(screen.queryByText(/Fatura em disputa/i)).not.toBeInTheDocument()
    expect(getFaturas).not.toHaveBeenCalled()
  })

  it('avisa quando o projeto não tem fatura nenhuma', async () => {
    getFaturas.mockResolvedValue({ data: [] })
    const user = userEvent.setup()
    render(<DisputasPage />)
    await abrirModalEEscolherProjeto(user)

    expect(await screen.findByText(/ainda não tem faturas/i)).toBeInTheDocument()
  })
})

describe('A lista de disputas', () => {
  function disputa(extra: Record<string, unknown> = {}) {
    return {
      id: 'disp1',
      tipo: 'CALOTE',
      status: 'ABERTA',
      descricao: 'O cliente sumiu depois da entrega final.',
      saldoBloqueado: 1080000,
      abertaPorId: 'cliente1',
      projetoId: 'proj1',
      criadoEm: '2026-09-20T12:00:00.000Z',
      atualizadoEm: '2026-09-20T12:00:00.000Z',
      projeto: { id: 'proj1', nome: 'Rebranding Acme' },
      abertaPor: { id: 'cliente1', nome: 'João Santos', email: 'j@x.com', tipo: 'CLIENTE' },
      ...extra,
    }
  }

  /*
   * Esta linha nunca tinha aparecido: sem `faturaId`, `saldoBloqueado` era
   * sempre 0 e a condição nunca era verdadeira.
   */
  it('mostra o valor retido', async () => {
    listarDisputas.mockResolvedValue([disputa()])
    render(<DisputasPage />)

    expect(await screen.findByText(/Retido: R\$ 10\.800,00/)).toBeInTheDocument()
  })

  /*
   * A lista traz também as disputas abertas CONTRA você — e agora é o dinheiro
   * que fica retido. Sem dizer quem abriu, os dois casos têm a mesma cara.
   */
  it('diz quem abriu, e chama de "Você" o que é seu', async () => {
    listarDisputas.mockResolvedValue([disputa(), disputa({ id: 'disp2', abertaPorId: 'designer1' })])
    render(<DisputasPage />)

    expect(await screen.findByText('João Santos')).toBeInTheDocument()
    expect(screen.getByText('Você')).toBeInTheDocument()
  })
})
