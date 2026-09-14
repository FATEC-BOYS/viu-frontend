import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FunilDoLink from '../FunilDoLink'

/**
 * O funil serve para escolher o remédio certo: link que não chega se reenvia,
 * link que não abre se cobra, arte que ninguém comenta se pergunta. Por isso a
 * tela precisa destacar ONDE cai, e precisa calar quando o número é pequeno
 * demais para significar algo.
 */

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...a: any[]) => get(...a) } }))

beforeEach(() => get.mockReset())

function funil(over: Record<string, unknown> = {}) {
  return {
    data: {
      compartilhadas: 10,
      abertas: 8,
      comentadas: 3,
      decididas: 2,
      medianaDiasAteDecidir: 2,
      ...over,
    },
  }
}

describe('FunilDoLink', () => {
  it('não aparece para quem ainda não compartilhou nada', async () => {
    get.mockResolvedValue(funil({ compartilhadas: 0, abertas: 0, comentadas: 0, decididas: 0 }))
    const { container } = render(<FunilDoLink />)
    await waitFor(() => expect(get).toHaveBeenCalled())
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('mostra as quatro etapas com os números do backend', async () => {
    get.mockResolvedValue(funil())
    render(<FunilDoLink />)
    expect(await screen.findByText('Compartilhadas')).toBeInTheDocument()
    expect(screen.getByText('Abertas pelo cliente')).toBeInTheDocument()
    expect(screen.getByText('Comentadas')).toBeInTheDocument()
    expect(screen.getByText('Decididas')).toBeInTheDocument()
  })

  it('diz quantos pararam em cada etapa', async () => {
    get.mockResolvedValue(funil())
    render(<FunilDoLink />)
    // 8 abriram de 10 compartilhadas
    expect(await screen.findByText(/pararam 2 aqui/)).toBeInTheDocument()
    // 3 comentaram de 8 que abriram — a maior queda
    expect(screen.getByText(/pararam 5 aqui/)).toBeInTheDocument()
  })

  it('cala a porcentagem quando a etapa de cima é pequena demais', async () => {
    get.mockResolvedValue(
      funil({ compartilhadas: 2, abertas: 1, comentadas: 1, decididas: 1 }),
    )
    render(<FunilDoLink />)
    expect(await screen.findByText(/parou 1 aqui/)).toBeInTheDocument()
    expect(screen.queryByText(/50%/)).not.toBeInTheDocument()
  })

  it('não inventa prazo quando nada foi decidido', async () => {
    get.mockResolvedValue(funil({ decididas: 0, medianaDiasAteDecidir: null }))
    render(<FunilDoLink />)
    expect(await screen.findByText(/nenhuma decisão fechada ainda/i)).toBeInTheDocument()
  })

  it('usa a mediana para dizer quanto tempo a decisão leva', async () => {
    get.mockResolvedValue(funil({ medianaDiasAteDecidir: 3 }))
    render(<FunilDoLink />)
    expect(await screen.findByText(/metade das decisões/i)).toBeInTheDocument()
    expect(screen.getByText('3 dias')).toBeInTheDocument()
  })
})
