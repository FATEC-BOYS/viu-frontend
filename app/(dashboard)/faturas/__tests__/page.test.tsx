import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title, description }: any) => <div><h1>{title}</h1><p>{description}</p></div>,
}))
vi.mock('framer-motion', async () =>
  (await import('@/test-utils/framerMotion')).mockDeFramerMotion(),
)

const useAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }))

const getFaturas = vi.fn()
vi.mock('@/lib/pagamentos', async () => {
  const real = await vi.importActual<any>('@/lib/pagamentos')
  return { ...real, pagamentosApi: { getFaturas: (...a: any[]) => getFaturas(...a) } }
})

import FaturasPage from '../page'

function fatura(extra: Record<string, unknown> = {}) {
  return {
    id: 'cfatura00000000001',
    valor: 1200000,
    valorFormatado: 'R$ 12.000,00',
    status: 'PENDENTE',
    dataVencimento: '2026-09-15T00:00:00.000Z',
    dataVencimentoFormatada: '15 de set. de 2026',
    vencida: false,
    projeto: { id: 'p1', nome: 'App Mobile' },
    cliente: { id: 'c1', nome: 'João Santos' },
    designer: { id: 'd1', nome: 'Ana Silva' },
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuth.mockReturnValue({ user: { id: 'c1', tipo: 'CLIENTE' } })
})

describe('Lista de faturas', () => {
  /*
   * "O que você tem a pagar" não dizia o quanto: com várias faturas abertas,
   * somar era trabalho de quem lê.
   */
  it('soma o que está em aberto', async () => {
    getFaturas.mockResolvedValue({
      data: [fatura(), fatura({ id: 'f2', valor: 300000, valorFormatado: 'R$ 3.000,00' })],
    })

    render(<FaturasPage />)

    expect(await screen.findByText('R$ 15.000,00')).toBeInTheDocument()
    expect(screen.getByText('A pagar')).toBeInTheDocument()
  })

  /*
   * A tela dizia "Pendente" e, em cinza, "Vence 15 de set." — cinco dias
   * depois do dia 15. Atraso é o dado mais acionável desta tela.
   */
  it('separa as vencidas, com o total delas', async () => {
    getFaturas.mockResolvedValue({
      data: [
        fatura({ vencida: true }),
        fatura({ id: 'f2', valor: 300000, valorFormatado: 'R$ 3.000,00', vencida: false }),
      ],
    })

    render(<FaturasPage />)

    expect(await screen.findByText('1 vencida')).toBeInTheDocument()
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(screen.getByText(/Venceu 15 de set/)).toBeInTheDocument()
  })

  it('fatura no prazo continua dizendo "Vence"', async () => {
    getFaturas.mockResolvedValue({ data: [fatura()] })

    render(<FaturasPage />)

    expect(await screen.findByText(/Vence 15 de set/)).toBeInTheDocument()
    expect(screen.queryByText('Vencida')).not.toBeInTheDocument()
  })

  it('sem nada em aberto, não inventa um total', async () => {
    getFaturas.mockResolvedValue({
      data: [fatura({ status: 'PAGA', vencida: false })],
    })

    render(<FaturasPage />)

    await screen.findByText('App Mobile')
    expect(screen.queryByText('A pagar')).not.toBeInTheDocument()
  })

  /*
   * O servidor não manda a quebra para o cliente. A tela precisa aguentar a
   * ausência: testar a presença do campo é mais honesto que testar o papel.
   */
  it('não quebra quando o líquido do designer não vem', async () => {
    getFaturas.mockResolvedValue({ data: [fatura({ status: 'PAGA' })] })

    render(<FaturasPage />)

    await screen.findByText('App Mobile')
    expect(screen.queryByText(/Líquido:/)).not.toBeInTheDocument()
  })

  it('para o designer, o líquido aparece na fatura paga', async () => {
    useAuth.mockReturnValue({ user: { id: 'd1', tipo: 'DESIGNER' } })
    getFaturas.mockResolvedValue({
      data: [fatura({ status: 'PAGA', valorLiquidoDesignerFormatado: 'R$ 10.800,00' })],
    })

    render(<FaturasPage />)

    expect(await screen.findByText(/Líquido: R\$ 10\.800,00/)).toBeInTheDocument()
    // E o lado da fatura que ele consulta é o de quem recebe.
    expect(getFaturas).toHaveBeenCalledWith('designer')
  })
})
